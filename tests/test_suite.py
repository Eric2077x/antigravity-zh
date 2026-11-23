#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity & Gemini.app 双端汉化补丁自动化回归测试套件（零外部依赖，兼容 Python 3.7+）。
运行方式：
  python3 -m unittest discover -s tests -v
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCALE_PATH = os.path.join(REPO_ROOT, "locales", "zh-CN.json")
ENGINE_PATH = os.path.join(REPO_ROOT, "engine", "dom-translator.js")
DOM_TEST_PATH = os.path.join(REPO_ROOT, "tests", "test_dom_isolation.js")
ELECTRON_BIN = "/Applications/Antigravity.app/Contents/MacOS/Antigravity"

sys.path.insert(0, REPO_ROOT)
import patcher  # noqa: E402


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _find_node_runtime() -> tuple[list[str], dict[str, str]] | None:
    env = os.environ.copy()
    node = shutil.which("node")
    if node:
        return [node], env
    if os.path.isfile(ELECTRON_BIN):
        env["ELECTRON_RUN_AS_NODE"] = "1"
        return [ELECTRON_BIN], env
    return None


class TestRepositoryIntegrity(unittest.TestCase):
    def test_python_scripts_compile_and_help(self) -> None:
        pythons = [sys.executable]
        if os.path.isfile("/usr/bin/python3") and os.path.realpath("/usr/bin/python3") != os.path.realpath(sys.executable):
            pythons.append("/usr/bin/python3")

        for py in pythons:
            for script in ("patcher.py", "restore.py", "scan_bundle.py"):
                fp = os.path.join(REPO_ROOT, script)
                res_compile = subprocess.run([py, "-m", "py_compile", fp], capture_output=True, text=True)
                self.assertEqual(res_compile.returncode, 0, f"{py} 编译 {script} 失败: {res_compile.stderr}")
                res_help = subprocess.run([py, fp, "--help"], capture_output=True, text=True)
                self.assertEqual(res_help.returncode, 0, f"{py} 运行 {script} --help 失败: {res_help.stderr}")

    def test_locale_json_quality_and_no_duplicates(self) -> None:
        duplicates: list[str] = []

        def reject_dup_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
            out: dict[str, object] = {}
            for k, v in pairs:
                if k in out:
                    duplicates.append(k)
                out[k] = v
            return out

        with open(LOCALE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f, object_pairs_hook=reject_dup_pairs)

        self.assertEqual(duplicates, [], f"locales/zh-CN.json 存在重复键: {duplicates[:10]}")
        exact = data["exact"]
        self.assertIsInstance(exact, dict)
        self.assertGreater(len(exact), 4500)

        # 确认已淘汰的旧版文案不再回流
        self.assertNotIn("Loading Antigravity", exact)

        # 高危短词门禁
        forbidden_short = {"Tab", "Esc", "Alt", "Cmd", "Ctrl", "Shift", "Git", "SSH", "API", "MCP"}
        hit_forbidden = forbidden_short.intersection(exact.keys())
        self.assertEqual(hit_forbidden, set(), f"存在高危短词: {hit_forbidden}")

        ws_keys = [k for k in exact if k != k.strip()]
        self.assertEqual(ws_keys, [], f"存在含首尾空格的词条键: {ws_keys[:10]}")

        empty_vals = [k for k, v in exact.items() if not isinstance(v, str) or not v.strip()]
        self.assertEqual(empty_vals, [], f"存在空译文词条: {empty_vals[:10]}")

        redundant_parens = [
            (k, v)
            for k, v in exact.items()
            if "(" not in k and "（" not in k and re.search(r"[\(（][A-Za-z][A-Za-z0-9\s/-]{2,}[\)）]", v)
        ]
        self.assertEqual(redundant_parens, [], f"译文含多余英文括号注释: {redundant_parens[:10]}")

        # 校验引擎白名单与词库的一致性：DOM_SKIP_EXACT 不得与 exact 冲突，SYSTEM_PLACEHOLDER_TITLES 必须全部有译文
        engine_src = _read_text(ENGINE_PATH)
        m_skip = re.search(r"const DOM_SKIP_EXACT = new Set\(\[([\s\S]*?)\]\);", engine_src)
        self.assertIsNotNone(m_skip, "未找到 DOM_SKIP_EXACT")
        skip_set = set(re.findall(r"'([^']+)'", m_skip.group(1)))
        self.assertEqual(sorted(skip_set.intersection(exact.keys())), [], "DOM_SKIP_EXACT 与 zh-CN.json 存在冲突键")

        m_ph = re.search(r"const SYSTEM_PLACEHOLDER_TITLES = new Set\(\[([\s\S]*?)\]\);", engine_src)
        self.assertIsNotNone(m_ph, "未找到 SYSTEM_PLACEHOLDER_TITLES")
        ph_set = sorted(re.findall(r"'([^']+)'", m_ph.group(1)))
        missing_ph = [k for k in ph_set if k not in exact]
        self.assertEqual(missing_ph, [], f"SYSTEM_PLACEHOLDER_TITLES 存在未收录译文: {missing_ph}")

    def test_no_privacy_paths_in_repo(self) -> None:
        user_path_re = re.compile(r"/Users/[A-Za-z0-9._-]+/")
        leaked: list[str] = []
        for root, dirs, files in os.walk(REPO_ROOT):
            dirs[:] = [d for d in dirs if d not in (".git", "__pycache__")]
            for fn in files:
                if not fn.endswith((".py", ".js", ".json", ".md", ".yml", ".yaml")):
                    continue
                fp = os.path.join(root, fn)
                with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                    txt = f.read()
                for m in user_path_re.finditer(txt):
                    if m.group(0) not in ("/Users/xxx/", "/Users/username/"):
                        leaked.append(f"{os.path.relpath(fp, REPO_ROOT)}:{m.group(0)}")
        self.assertEqual(leaked, [], f"仓库中检测到本机隐私路径残留: {leaked}")


class TestPatchUtilsAndEngine(unittest.TestCase):
    def test_engine_syntax_and_dom_isolation_suite(self) -> None:
        rt = _find_node_runtime()
        self.assertIsNotNone(rt, "未找到 node 或 Electron Node 运行时")
        cmd_prefix, env = rt

        check = subprocess.run(cmd_prefix + ["--check", ENGINE_PATH], env=env, capture_output=True, text=True)
        self.assertEqual(check.returncode, 0, f"dom-translator.js 语法错误: {check.stderr}")

        dom_res = subprocess.run(cmd_prefix + [DOM_TEST_PATH], env=env, capture_output=True, text=True)
        self.assertEqual(dom_res.returncode, 0, f"DOM 隔离回归失败:\n{dom_res.stdout}\n{dom_res.stderr}")

    def test_patch_utils_idempotent_syntax_and_whitelist(self) -> None:
        rt = _find_node_runtime()
        self.assertIsNotNone(rt, "未找到 node 或 Electron Node 运行时")
        cmd_prefix, env = rt

        with open(LOCALE_PATH, "r", encoding="utf-8") as f:
            locale_data = json.load(f)
        with open(ENGINE_PATH, "r", encoding="utf-8") as f:
            engine_code = f.read()

        sample_utils = (
            '"use strict";\n'
            "function createWindow(hubContents, win) {\n"
            "    const handleDidFailLoad = () => {};\n"
            "    win.on('closed', () => {\n"
            "        hubContents.off?.('did-fail-load', handleDidFailLoad);\n"
            "    });\n"
            "    hubContents.on('did-fail-load', handleDidFailLoad);\n"
            "}\n"
        )

        with tempfile.TemporaryDirectory(prefix="ag_test_utils_") as td:
            dist = os.path.join(td, "dist")
            os.makedirs(dist)
            with open(os.path.join(dist, "preload.js"), "w", encoding="utf-8") as f:
                f.write("// original preload\n")
            with open(os.path.join(dist, "utils.js"), "w", encoding="utf-8") as f:
                f.write(sample_utils)

            orig_log = patcher.log
            patcher.log = lambda _m: None
            try:
                patcher.patch_preload(dist, locale_data, engine_code)
                patcher.patch_utils(dist)
                first_utils = _read_text(os.path.join(dist, "utils.js"))
                first_preload = _read_text(os.path.join(dist, "preload.js"))

                # 连续二次执行验证 100% 幂等
                patcher.patch_preload(dist, locale_data, engine_code)
                patcher.patch_utils(dist)
                second_utils = _read_text(os.path.join(dist, "utils.js"))
                second_preload = _read_text(os.path.join(dist, "preload.js"))
            finally:
                patcher.log = orig_log

            self.assertEqual(first_utils, second_utils, "patch_utils 重复运行不幂等")
            self.assertEqual(first_preload, second_preload, "patch_preload 重复运行不幂等")

            # 严禁将含认证 token 的 frame.url 输出到控制台日志
            self.assertNotIn("console.log", first_utils)
            self.assertNotIn("console.warn", first_utils)

            for js_file in ("preload.js", "utils.js"):
                chk = subprocess.run(
                    cmd_prefix + ["--check", os.path.join(dist, js_file)],
                    env=env,
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(chk.returncode, 0, f"{js_file} 语法校验失败: {chk.stderr}")

            # 实测运行 __agZhIsTrustedSwarmFrame 白名单逻辑
            probe = r"""
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const code = fs.readFileSync(process.argv[1], 'utf8');
const m = code.match(/const __agZhIsTrustedSwarmFrame = [\s\S]*?^\s{4}\};/m);
assert(m, '未找到 __agZhIsTrustedSwarmFrame');
const fn = vm.runInNewContext('(' + m[0].replace(/^const __agZhIsTrustedSwarmFrame = /, '').replace(/;$/, '') + ')', { URL });
assert.strictEqual(fn('plugin://swarm--swarm_board-1/'), true);
assert.strictEqual(fn('plugin://swarm--swarm_board-42/?token=secret'), true);
assert.strictEqual(fn('plugin://figma--panel-1/'), false);
assert.strictEqual(fn('plugin://swarm--swarm_board-1/subpath'), false);
assert.strictEqual(fn('plugin://user@swarm--swarm_board-1/'), false);
assert.strictEqual(fn('plugin://swarm--swarm_board-1:8080/'), false);
assert.strictEqual(fn('https://swarm--swarm_board-1/'), false);
assert.strictEqual(fn('javascript:alert(1)'), false);
assert.strictEqual(fn(''), false);
"""
            wl_res = subprocess.run(
                cmd_prefix + ["-e", probe, os.path.join(dist, "utils.js")],
                env=env,
                capture_output=True,
                text=True,
            )
            self.assertEqual(wl_res.returncode, 0, f"Swarm 白名单测试失败: {wl_res.stderr}")

    def test_dry_run_full_app_patch_idempotency_and_syntax(self) -> None:
        asar_src = None
        for cand in (patcher.ASAR_DISABLED, patcher.ASAR_FILE):
            if os.path.isfile(cand):
                asar_src = cand
                break
        if asar_src is None:
            self.skipTest("本机未安装 /Applications/Antigravity.app，跳过全量 ASAR 干跑测试")

        rt = _find_node_runtime()
        self.assertIsNotNone(rt, "未找到 node 或 Electron Node 运行时")
        cmd_prefix, env = rt

        with open(LOCALE_PATH, "r", encoding="utf-8") as f:
            locale_data = json.load(f)
        with open(ENGINE_PATH, "r", encoding="utf-8") as f:
            engine_code = f.read()

        with tempfile.TemporaryDirectory(prefix="ag_test_asar_") as td:
            orig_log = patcher.log
            patcher.log = lambda _m: None
            try:
                patcher.extract_asar(asar_src, td)
                patcher.apply_all_patches_to_dir(td, locale_data, engine_code)
                snap1 = {
                    fn: _read_text(os.path.join(td, "dist", fn))
                    for fn in ("preload.js", "utils.js", "menu.js", "ipcHandlers.js")
                }
                patcher.apply_all_patches_to_dir(td, locale_data, engine_code)
                snap2 = {
                    fn: _read_text(os.path.join(td, "dist", fn))
                    for fn in ("preload.js", "utils.js", "menu.js", "ipcHandlers.js")
                }
            finally:
                patcher.log = orig_log

            for fn in snap1:
                self.assertEqual(snap1[fn], snap2[fn], f"dist/{fn} 连续两次补丁结果不幂等")
                self.assertIn(patcher.PATCH_START_MARKER, snap2[fn], f"dist/{fn} 缺少补丁标记")

            # 校验所有关键修改后的 JS 文件语法全部通过
            dist_dir = os.path.join(td, "dist")
            for root, _dirs, files in os.walk(dist_dir):
                for fn in files:
                    if not fn.endswith(".js"):
                        continue
                    fp = os.path.join(root, fn)
                    chk = subprocess.run(cmd_prefix + ["--check", fp], env=env, capture_output=True, text=True)
                    self.assertEqual(chk.returncode, 0, f"干跑产出 {os.path.relpath(fp, td)} 语法错误: {chk.stderr}")


if __name__ == "__main__":
    unittest.main()
