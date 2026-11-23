#!/usr/bin/env python3
"""
Antigravity / Gemini 双端内嵌前端 Bundle 漏翻审计工具。

默认同时读取：
- /Applications/Antigravity.app/Contents/Resources/bin/language_server
- /Applications/Gemini.app/Contents/Helpers/agy（回退 ~/.local/bin/agy）
按 PK\\x05\\x06 EOCD 精确切片尾部 ZIP 中的 main.js，提取设置表字段
（displayName / shortDescription / longDescription / subtitle / options 等）、
React.createElement 子文本、普通字符串与动态模板字符串，并与
locales/zh-CN.json（exact / fragments）及 engine/dom-translator.js（DYNAMIC_RULES / DOM_SKIP_EXACT）
比对覆盖情况。
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import shutil
import struct
import subprocess
import urllib.request
import zipfile
from collections import Counter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCALE_PATH = os.path.join(SCRIPT_DIR, "locales", "zh-CN.json")
ENGINE_PATH = os.path.join(SCRIPT_DIR, "engine", "dom-translator.js")

ELECTRON_BIN = "/Applications/Antigravity.app/Contents/MacOS/Antigravity"
DEFAULT_TARGETS = [
    (
        "Antigravity.app (language_server)",
        ["/Applications/Antigravity.app/Contents/Resources/bin/language_server"],
    ),
    (
        "Gemini.app (agy)",
        [
            "/Applications/Gemini.app/Contents/Helpers/agy",
            os.path.expanduser("~/.local/bin/agy"),
        ],
    ),
]

SETTINGS_FIELDS = (
    "displayName",
    "shortDescription",
    "longDescription",
    "subtitle",
    "label",
    "title",
    "description",
    "placeholder",
    "tooltip",
    "subtext",
    "emptyText",
    "emptyMessage",
    "heading",
    "header",
    "sectionTitle",
    "helperText",
    "confirmLabel",
    "cancelLabel",
    "summary",
    "ariaLabel",
    "aria-label",
    "aria-valuetext",
    "data-tooltip",
    "data-tooltip-content",
    "data-placeholder",
)

_FIELD_ALT = "|".join(re.escape(k) for k in SETTINGS_FIELDS)
FIELD_KV_RE = re.compile(
    r"""(?:['"])?(?P<field>"""
    + _FIELD_ALT
    + r""")(?:['"])?\s*:\s*(?:"(?P<dtext>(?:\\.|[^"\\\r\n]){2,500})"|'(?P<stext>(?:\\.|[^'\\\r\n]){2,500})')"""
)
OPTIONS_LABEL_RE = re.compile(
    r"""options\s*:\s*\[(?P<body>[^\[\]]{1,4000})\]"""
)
OPTIONS_ITEM_RE = re.compile(
    r"""(?:label|title)\s*:\s*(?:"(?P<dtext>(?:\\.|[^"\\\r\n]){1,120})"|'(?P<stext>(?:\\.|[^'\\\r\n]){1,120})')"""
)
PLAIN_STR_RE = re.compile(
    r'''"(?P<dtext>[A-Z][A-Za-z0-9 .,?!:;'()/\\\-–—%+\u2026]{1,180})"|'(?P<stext>[A-Z][A-Za-z0-9 .,?!:;"()/\\\-–—%+\u2026]{1,180})' '''.strip()
)
CREATE_ELEM_CALL_RE = re.compile(r"""\.createElement\(""")
THIRD_PARTY_NOISE_RE = re.compile(r"""KaTeX|katex|AbstractBarycenter|ELKLayout|elkjs|;base64,""")

SKIP_RE = re.compile(
    r"""^(?:https?://|file://|/|~|--[a-z0-9-]+|[A-Za-z0-9_]+\.[a-z]{2,5}$|[a-z]+(?:[A-Z][a-z0-9]+)+$|[A-Z0-9_]{2,}$|#[0-9a-fA-F]{3,8}$|\d+[%pxremvhw]*$)"""
)
WORD_RE = re.compile(r"""[A-Za-z]{2,}""")


def _decode_js_escapes(text: str) -> str:
    """解码常见 JS 字符串与 \\uXXXX 转义字符，避免误把转义序列当作漏翻文本。"""
    decoded = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), text)
    return (
        decoded.replace(r"\"", '"')
        .replace(r"\'", "'")
        .replace(r"\n", " ")
        .replace(r"\t", " ")
        .strip()
    )


def _is_candidate_ui_text(text: str, allow_short: bool = False) -> bool:
    """过滤代码标识符、样式类、路径等非用户可见文本。"""
    t = text.strip()
    if len(t) < (2 if allow_short else 4):
        return False
    if not WORD_RE.search(t):
        return False
    if SKIP_RE.match(t):
        return False
    if any(tok in t for tok in ("function(", "=>", "className", "rgba(", "var(--", "px ", ";base64,")):
        return False
    if " " not in t and ("-" in t or "_" in t or "/" in t or "." in t or t.islower()):
        return False
    return True


def read_embedded_main_js(binary_path: str) -> str:
    """按 PK\\x05\\x06 EOCD 精确切片 Mach-O 尾部内嵌 ZIP，返回 main.js 文本。"""
    with open(binary_path, "rb") as f:
        data = f.read()
    eocd_pos = data.rfind(b"PK\x05\x06")
    if eocd_pos < 0:
        raise ValueError(f"未找到 ZIP EOCD 标记: {binary_path}")
    eocd = data[eocd_pos : eocd_pos + 22]
    _, _, _, _, _, cd_size, cd_offset, comment_len = struct.unpack("<4sHHHHIIH", eocd)
    zip_start = eocd_pos - cd_size - cd_offset
    zip_end = eocd_pos + 22 + comment_len
    if zip_start < 0 or data[zip_start : zip_start + 4] != b"PK\x03\x04":
        raise ValueError(f"内嵌 ZIP 偏移校验失败 ({hex(zip_start)}): {binary_path}")
    with zipfile.ZipFile(io.BytesIO(data[zip_start:zip_end])) as zf:
        for name in zf.namelist():
            if name.endswith("main.js"):
                return zf.read(name).decode("utf-8", errors="replace")
    raise FileNotFoundError(f"内嵌 ZIP 中未找到 main.js: {binary_path}")


def read_live_main_js() -> str:
    """兼容旧版：从 Antigravity main.log 读取当前运行中的本地 webview 端口 main.js。"""
    log_path = os.path.expanduser("~/Library/Logs/Antigravity/main.log")
    with open(log_path, "r", encoding="utf-8", errors="replace") as f:
        ports = re.findall(r"127\.0\.0\.1:(\d+)", f.read())
    if not ports:
        raise RuntimeError(f"日志中未发现运行端口: {log_path}")
    url = f"http://127.0.0.1:{ports[-1]}/main.js"
    return urllib.request.urlopen(url, timeout=10).read().decode("utf-8", errors="replace")


def _extract_first_party_ui_text(js_text: str, radius: int = 40) -> str:
    """聚焦距 .createElement( ±radius 行内的第一方 UI 代码段，剔除超长 proto/base64 与 KaTeX/ELK 噪音。"""
    lines = js_text.splitlines()
    n = len(lines)
    keep = [False] * n
    for i, ln in enumerate(lines):
        if len(ln) > 20000 or THIRD_PARTY_NOISE_RE.search(ln):
            continue
        if ".createElement(" in ln:
            lo = max(0, i - radius)
            hi = min(n, i + radius + 1)
            for j in range(lo, hi):
                if len(lines[j]) <= 20000 and not THIRD_PARTY_NOISE_RE.search(lines[j]):
                    keep[j] = True
    return "\n".join(lines[i] for i in range(n) if keep[i])


def _scan_js_string(text: str, start: int) -> tuple[str, int]:
    """从引号起始位置扫描单/双引号 JS 字符串，返回 (原始字面量内容, 结束引号后的索引)。"""
    q = text[start]
    i = start + 1
    n = len(text)
    buf: list[str] = []
    while i < n:
        ch = text[i]
        if ch == "\\" and i + 1 < n:
            buf.append(ch)
            buf.append(text[i + 1])
            i += 2
            continue
        if ch == q:
            return "".join(buf), i + 1
        if ch in ("\r", "\n"):
            return "", i
        buf.append(ch)
        i += 1
    return "", n


def _extract_create_element_children(js_text: str) -> set[str]:
    """用括号配平解析 .createElement(...) 的第 3 个及后续参数（覆盖多子节点、嵌套 props 与三元分支）。"""
    out: set[str] = set()
    n = len(js_text)
    for m in CREATE_ELEM_CALL_RE.finditer(js_text):
        i = m.end()
        limit = min(n, i + 4000)
        paren = 1
        brace = 0
        bracket = 0
        arg_idx = 0
        while i < limit and paren > 0:
            ch = js_text[i]
            if ch in ("'", '"'):
                lit, nxt = _scan_js_string(js_text, i)
                if arg_idx >= 2 and paren == 1 and brace == 0 and bracket == 0 and 2 <= len(lit) <= 240:
                    txt = _decode_js_escapes(lit)
                    if _is_candidate_ui_text(txt, allow_short=True):
                        out.add(txt)
                i = nxt
                continue
            if ch == "`":
                i += 1
                t_brace = 0
                while i < limit:
                    tc = js_text[i]
                    if tc == "\\" and i + 1 < limit:
                        i += 2
                        continue
                    if tc == "$" and i + 1 < limit and js_text[i + 1] == "{":
                        t_brace += 1
                        i += 2
                        continue
                    if tc == "}" and t_brace > 0:
                        t_brace -= 1
                        i += 1
                        continue
                    if tc == "`" and t_brace == 0:
                        i += 1
                        break
                    i += 1
                continue
            if ch == "(":
                paren += 1
            elif ch == ")":
                paren -= 1
            elif ch == "{":
                brace += 1
            elif ch == "}":
                brace = max(0, brace - 1)
            elif ch == "[":
                bracket += 1
            elif ch == "]":
                bracket = max(0, bracket - 1)
            elif ch == "," and paren == 1 and brace == 0 and bracket == 0:
                arg_idx += 1
            i += 1
    return out


def _extract_template_literals(js_text: str) -> list[str]:
    """按 ${...} 栈深度扫描模板字面量，避免内部嵌套反引号提前截断。"""
    results: list[str] = []
    n = len(js_text)
    i = 0
    while i < n:
        ch = js_text[i]
        if ch in ("'", '"'):
            _, i = _scan_js_string(js_text, i)
            continue
        if ch != "`":
            i += 1
            continue
        start = i + 1
        i += 1
        expr_depth = 0
        nested_backticks: list[int] = []
        valid = True
        while i < n:
            c = js_text[i]
            if c == "\\" and i + 1 < n:
                i += 2
                continue
            if expr_depth > 0 and c in ("'", '"'):
                _, i = _scan_js_string(js_text, i)
                continue
            if c == "$" and i + 1 < n and js_text[i + 1] == "{":
                expr_depth += 1
                i += 2
                continue
            if c == "}" and expr_depth > 0:
                if not nested_backticks or expr_depth > nested_backticks[-1]:
                    expr_depth -= 1
                i += 1
                continue
            if c == "`":
                if expr_depth == 0:
                    raw = js_text[start:i]
                    if 3 <= len(raw) <= 320 and "\n" not in raw and "\r" not in raw and "${" in raw:
                        results.append(raw)
                    i += 1
                    break
                if nested_backticks and nested_backticks[-1] == expr_depth:
                    nested_backticks.pop()
                else:
                    nested_backticks.append(expr_depth)
                i += 1
                continue
            if i - start > 360:
                valid = False
                break
            i += 1
        if not valid:
            i += 1
    return results


def _normalize_template_exprs(raw: str) -> str:
    """将含嵌套花括号的 ${...} 表达式按语义归一化为占位符（计数类映射为 2）。"""
    out: list[str] = []
    i = 0
    n = len(raw)
    while i < n:
        if raw[i] == "$" and i + 1 < n and raw[i + 1] == "{":
            j = i + 2
            depth = 1
            while j < n and depth > 0:
                if raw[j] == "\\" and j + 1 < n:
                    j += 2
                    continue
                if raw[j] == "{":
                    depth += 1
                elif raw[j] == "}":
                    depth -= 1
                j += 1
            expr = raw[i + 2 : j - 1]
            head = raw[:i]
            tail = raw[j:]
            if (
                re.match(
                    r"\s*(?:tokens?|commits?|steps?|files?|items?|plugins?|conversations?|comments?|overrides?|breakdowns?|subagents?|references|cookies?|accounts?|timers?|folders?|days?|seconds?|minutes?|hours?|turns?|ms|s|MB|KB|%)\b",
                    tail,
                    re.I,
                )
                or re.search(
                    r"\b(?:Question|Step|Turn|Page|Slide|Version|code|port|attempt|last|latest)\s+$",
                    head,
                    re.I,
                )
                or any(tok in expr for tok in (".length", "numTokens", "size", "count", "Count", "total", "Total"))
            ):
                out.append("2")
            else:
                out.append("Item")
            i = j
        else:
            out.append(raw[i])
            i += 1
    return "".join(out)


def extract_candidates(js_text: str) -> dict[str, list[str]]:
    """分类提取设置表字段、JSX 子文本、模板字符串与常规 UI 文本。"""
    ui_scope = _extract_first_party_ui_text(js_text)
    field_strings: dict[str, set[str]] = {
        "settings_fields": set(),
        "jsx_children": set(),
        "templates": set(),
        "ui_strings": set(),
    }

    for m in FIELD_KV_RE.finditer(ui_scope):
        raw_txt = m.group("dtext") if m.group("dtext") is not None else m.group("stext")
        txt = _decode_js_escapes(raw_txt or "")
        if _is_candidate_ui_text(txt, allow_short=True):
            field_strings["settings_fields"].add(txt)

    for om in OPTIONS_LABEL_RE.finditer(ui_scope):
        for lm in OPTIONS_ITEM_RE.finditer(om.group("body")):
            raw_txt = lm.group("dtext") if lm.group("dtext") is not None else lm.group("stext")
            txt = _decode_js_escapes(raw_txt or "")
            if _is_candidate_ui_text(txt, allow_short=True):
                field_strings["settings_fields"].add(txt)

    field_strings["jsx_children"].update(_extract_create_element_children(ui_scope))

    for raw in _extract_template_literals(ui_scope):
        normalized = _normalize_template_exprs(raw)
        txt = _decode_js_escapes(normalized)
        if _is_candidate_ui_text(txt) and not any(
            tok in raw for tok in ("http", "rgb(", "rgba(", "className", "Error:", "console.")
        ):
            field_strings["templates"].add(f"{txt}  <<<  `{raw}`")

    for m in PLAIN_STR_RE.finditer(ui_scope):
        raw_txt = m.group("dtext") if m.group("dtext") is not None else m.group("stext")
        txt = _decode_js_escapes(raw_txt or "")
        if _is_candidate_ui_text(txt) and txt not in field_strings["settings_fields"]:
            field_strings["ui_strings"].add(txt)

    return {k: sorted(v) for k, v in field_strings.items()}


def _normalize_template_sample(item: str) -> tuple[str, str]:
    """拆分 `sample  <<<  raw_template` 以便用真实译文引擎检测覆盖率。"""
    if "  <<<  `" in item:
        sample, raw = item.split("  <<<  ", 1)
        return sample.strip(), raw.strip()
    return item, item


def _eval_with_engine_js(candidates: list[str]) -> dict[str, bool] | None:
    """优先调用 Electron Node 运行真实 engine/dom-translator.js 检测覆盖情况。"""
    node_bin = ELECTRON_BIN if os.path.exists(ELECTRON_BIN) else shutil.which("node")
    if not node_bin:
        return None
    env = os.environ.copy()
    if node_bin == ELECTRON_BIN:
        env["ELECTRON_RUN_AS_NODE"] = "1"

    js_probe = r"""
const fs = require('fs');
const vm = require('vm');
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const zh = JSON.parse(fs.readFileSync(input.localePath, 'utf8'));
  const src = fs.readFileSync(input.enginePath, 'utf8');
  const sandbox = {
    __AG_ZH_LOCALE__: zh,
    window: { addEventListener: () => {} },
    document: { readyState: 'loading', addEventListener: () => {}, createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }), documentElement: { tagName: 'HTML' }, title: '' },
    MutationObserver: function() { return { observe: () => {} }; },
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval, requestAnimationFrame: () => 0,
    console, String, RegExp, Object, Array, Set, Map, Math, Number, Error, JSON, Promise,
  };
  sandbox.self = sandbox.window;
  sandbox.globalThis = sandbox.window;
  const code = src.replace('function translateString(', 'window.__probeTranslate = translateString;\nwindow.__probeSkip = shouldSkipText;\nfunction translateString(');
  vm.runInNewContext(code, sandbox);
  const res = {};
  for (const s of input.strings) {
    res[s] = Boolean(sandbox.window.__probeSkip(s) || sandbox.window.__probeTranslate(s));
  }
  process.stdout.write(JSON.stringify(res));
});
"""
    payload = json.dumps({"localePath": LOCALE_PATH, "enginePath": ENGINE_PATH, "strings": candidates})
    proc = subprocess.run(
        [node_bin, "-e", js_probe],
        input=payload,
        text=True,
        capture_output=True,
        env=env,
        timeout=30,
    )
    if proc.returncode != 0:
        return None
    return json.loads(proc.stdout)


def check_coverage(cat_map: dict[str, list[str]], zh_data: dict) -> tuple[dict[str, list[str]], Counter]:
    """结合 exact、fragments 与 dom-translator.js 引擎规则统计已覆盖与疑漏词条。"""
    exact = zh_data.get("exact", {})
    fragments = [pair[0] for pair in zh_data.get("fragments", []) if pair and pair[0]]

    probe_inputs: list[str] = []
    for cat, items in cat_map.items():
        for it in items:
            sample, _ = _normalize_template_sample(it)
            probe_inputs.append(sample)

    engine_hits = _eval_with_engine_js(sorted(set(probe_inputs)))
    missing: dict[str, list[str]] = {cat: [] for cat in cat_map}
    stats: Counter = Counter()

    for cat, items in cat_map.items():
        for it in items:
            sample, _ = _normalize_template_sample(it)
            stats["total"] += 1
            if sample in exact or any(
                sample == f or (sample.startswith(f) and re.match(r"^\s*[:：]", sample[len(f) :]))
                for f in fragments
            ):
                stats["covered_dict"] += 1
                continue
            if engine_hits is not None and engine_hits.get(sample):
                stats["covered_engine"] += 1
                continue
            stats["missing"] += 1
            missing[cat].append(it)
    return missing, stats


SWARM_BOARD_DIR = os.path.expanduser("~/.gemini/antigravity/builtin/plugins/swarm/sidecars/swarm_board")


def read_swarm_board_sources(swarm_dir: str = SWARM_BOARD_DIR) -> str:
    """读取本机内置 Swarm 伴生面板前端源码（index.html / app.js / hive.js）。"""
    parts: list[str] = []
    for name in ("index.html", "app.js", "hive.js"):
        fp = os.path.join(swarm_dir, name)
        if os.path.isfile(fp):
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                parts.append(f.read())
    if not parts:
        raise FileNotFoundError(f"未找到内置 Swarm 面板源码目录: {swarm_dir}")
    return "\n".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="Antigravity / Gemini 双端内嵌 main.js 漏翻审计")
    parser.add_argument("--live", action="store_true", help="扫描 main.log 中当前运行端口的在线 main.js")
    parser.add_argument("--swarm", action="store_true", help="一并扫描本机内置 Swarm 伴生面板前端文案")
    parser.add_argument("--limit", type=int, default=40, help="每个分类最多展示的疑漏条目数")
    args = parser.parse_args()

    with open(LOCALE_PATH, "r", encoding="utf-8") as f:
        zh_data = json.load(f)

    targets: list[tuple[str, str]] = []
    if args.live:
        targets.append(("Live main.js (main.log)", read_live_main_js()))
    else:
        for label, candidates in DEFAULT_TARGETS:
            found = next((p for p in candidates if os.path.exists(p)), None)
            if found:
                targets.append((f"{label} -> {found}", read_embedded_main_js(found)))
    if args.swarm and os.path.isdir(SWARM_BOARD_DIR):
        targets.append((f"Swarm Board ({SWARM_BOARD_DIR})", read_swarm_board_sources()))

    if not targets:
        print("未找到任何可扫描的 Antigravity / Gemini 目标文件。")
        return 1

    print(f"词库加载完成: exact={len(zh_data.get('exact', {}))}, fragments={len(zh_data.get('fragments', []))}")
    for label, js_text in targets:
        cats = extract_candidates(js_text)
        missing, stats = check_coverage(cats, zh_data)
        print(f"\n=== {label} (main.js={len(js_text)} B) ===")
        print(
            f"候选项总计={stats['total']} | 词库命中={stats['covered_dict']} | "
            f"动态/白名单命中={stats['covered_engine']} | 待核查疑漏={stats['missing']}"
        )
        for cat, items in missing.items():
            if not items:
                continue
            print(f"  [{cat}] ({len(items)} 项):")
            for item in items[: args.limit]:
                print(f"    - {item}")
            if len(items) > args.limit:
                print(f"    ... 另有 {len(items) - args.limit} 项未展开")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
