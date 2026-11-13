#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity Frontend Bundle UI String Scanner (scan_bundle.py)
Automatically locates the active local Language Server HTTPS port from
~/Library/Logs/Antigravity/main.log, downloads the live /main.js bundle,
and checks for any untranslated UI strings against locales/zh-CN.json.
"""

import json
import os
import re
import ssl
import sys
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCALE_FILE = os.path.join(BASE_DIR, "locales", "zh-CN.json")
ELECTRON_LOG = os.path.expanduser("~/Library/Logs/Antigravity/main.log")


def find_live_url() -> str:
    if not os.path.isfile(ELECTRON_LOG):
        raise FileNotFoundError(f"未找到日志文件: {ELECTRON_LOG}")
    with open(ELECTRON_LOG, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    matches = re.findall(r"https://127\.0\.0\.1:\d+/", text)
    if not matches:
        raise RuntimeError("未在 main.log 中检测到活动的本地服务端口")
    return matches[-1]


def fetch_bundle(base_url: str) -> str:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    url = base_url.rstrip("/") + "/main.js"
    print(f"正在从 {url} 下载前端 bundle...")
    with urllib.request.urlopen(url, context=ctx, timeout=10) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_ui_candidates(js: str) -> set:
    candidates = set()
    patterns = [
        r'(?:label|title|placeholder|description|tooltip|aria-label|header|heading|subtext|emptyText)\s*:\s*"([^"\n\\]{2,80})"',
        r"children\s*:\s*\"([A-Z][A-Za-z0-9 ,.'?!:/()-]{2,80})\"",
    ]
    for pat in patterns:
        for m in re.finditer(pat, js):
            s = m.group(1).strip()
            if re.search(r"[a-zA-Z]{2,}", s) and not s.startswith(("http", "/", "var(", "calc(")):
                candidates.add(s)
    return candidates


def main() -> None:
    with open(LOCALE_FILE, "r", encoding="utf-8") as f:
        locale = json.load(f)
    exact = locale.get("exact", {})

    base_url = find_live_url()
    js = fetch_bundle(base_url)
    candidates = extract_ui_candidates(js)

    covered = [s for s in candidates if s in exact or s.rstrip(":") in exact]
    missing = sorted(s for s in candidates if s not in exact and s.rstrip(":") not in exact)

    print(f"扫描完成: 候选 UI 词条 {len(candidates)} 条，已精确覆盖 {len(covered)} 条，未收录候选 {len(missing)} 条。")
    if missing and "--verbose" in sys.argv:
        for s in missing[:100]:
            print("  -", s)


if __name__ == "__main__":
    main()
