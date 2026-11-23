# Antigravity & Gemini.app 双端简体中文汉化补丁 (macOS)

专为 macOS 版 **Antigravity**（适配 `v2.15+` ~ `v2.34+` Electron 主进程与 Webview）以及 **Gemini.app 内置 Antigravity**（`Contents/Helpers/agy`，兼容 `agy 1.5.13+`）设计的无损、原生级、防更新掉落双端简体中文汉化工具。

## 核心特性与安全架构

1. **双端完整汉化**
   - **Antigravity.app**：解包并修补 Electron `app.asar`，覆盖原生顶部菜单（含 `menu.js` 异步 WSL 菜单二次刷新）、原生右键菜单（`ipcHandlers.js` `buildContextMenuTemplate` 静态词库与动态规则映射）、托盘菜单、自动更新提示、Swarm 伴生面板白名单子帧（`dist/utils.js`，仅放行官方 `plugin://swarm--swarm_board-*` 且不记录含 Token 的 URL）、WSL 状态提示（`wsl.js`）、SSH 远程连接弹窗/凭据/断线重连页（`dist/remote/*.js`）、macOS 桌面悬浮控制栏（`dist/computer/*.js`）、安全弹窗、USB/WebAuthn 设备选择、语言服务器诊断及工作区对话标题生成（`language_server_zh`），并自动设置 `lang="zh-CN"` 以启用原生中文字形渲染。
   - **Gemini.app 内置 Antigravity**：仅修补 `Gemini.app/Contents/Helpers/agy` 内嵌的前端资源，等长重打包 `index.html`（注入等待 `DOMContentLoaded` 与 `window.__APP_CONFIG__` 的安全加载器及 `<html lang="zh-CN">`）并同步生成双路径共享汉化包 `~/.gemini/{antigravity,antigravity-cli}/brain/.antigravity-zh/ag-zh.js`，覆盖 Agent 对话、编排器与思考强度、设置面板（含浏览数据/按站 Cookie 管理、听写语言排序、自定义侧边栏、模型配额动态刷新与快捷键方案）、工作区、错误提示、右键/浮层、开放式延迟 Shadow DOM（`attachShadow`）全量动态汉化及 WKWebView 高对比度截图缩略图自适应压缩兜底。
   - **原生级防误伤隔离**：前端引擎采用无原型字典（`Object.create(null)`）、有界翻译缓存与闭包私有 `WeakMap` 节点缓存实现宿主零侵入；按官方 DOM 结构精准隔离对话/子智能体/侧问/语音转录区（`[data-markdown-root]` 作用域限定与 `transcript-line-text`，同时放行内嵌按钮与 `user-message-actions` 时间戳）、斜杠/`@` 提及菜单非分类项（`menu-option-label`）、侧边栏用户自定义会话标题与项目名，以及 Swarm 面板成员名与发言正文。
2. **版本择优同步与包体洁净保护**
   - **只升不降的官方底座策略**：始终优先识别并保留本机 `Gemini.app/Contents/Helpers/agy` 原版备份；当检测到本机存在通过 Google 官方代码签名校验（`EQHXZ8M8AV`）且版本更高的 `~/.local/bin/agy` CLI（支持最新 `2.34+` / `1.5.13+` 内核与 `/swarm`）时，自动以其为底座执行等长内嵌 ZIP 重打包，无更高版本或外部 CLI 缺失时平滑回退原版，只升级不降级。
   - **包外备份与指纹缓存**：官方原版备份、多段 SHA256 状态与 `guard_stat_cache.json` 文件指纹缓存统一保存在 `~/.antigravity-zh/backup/`，不在 `Gemini.app/Contents/Helpers/` 内残留 `.agy.orig` 等多余文件，绝不修改 `MacOS/Gemini`。
   - **精准单文件重签**：对 `language_server_zh` 保留原始 `allow-jit` 权限；对 `Helpers/agy` 保留原始 `Identifier=agy` 且不额外注入非必要权限；首次启动前若检测到 macOS Gatekeeper 尚未放行，会自动等待用户首次打开放行后再安全打补丁。
3. **防更新掉落与双向同步守护**
   - 自动安装 `~/.antigravity-zh/guard-runner.sh` 与用户级 LaunchAgent（`~/Library/LaunchAgents/com.antigravity.zh-cn.plist`），监听 `/Applications`、`~/.antigravity-zh/locales`、`~/.antigravity-zh/engine`（及存在时的 `~/.local/bin`）并配合 60 秒轻量巡检；守护日志 `~/.antigravity-guard.log` 超过 512KB 自动原子轮转。
   - **TCC 无弹窗毫秒级只读预检**：守护脚本先通过 `patcher.py --guard-check` 基于 `stat` 指纹缓存执行毫秒级零大文件读盘校验（最新则立即退出）；仅在真正检测到更新、语言引擎状态缺失或词库变化时，才优先通过经 Google 官方签名校验的 `Antigravity Helper` (`ELECTRON_RUN_AS_NODE=1`) 调起 `--guard` 完成无痛同步，避免 `launchd` 被 macOS App 管理拦截。
   - **进程锁与防自杀**：进程互斥锁统一位于 `/tmp/antigravity-zh-{uid}.lock`（带 `O_NOFOLLOW` 与属主校验）；在 Antigravity / Gemini 内置终端运行时自动跳过自杀，提示按 `Cmd + R` 或手动重启生效。
4. **纯增量补丁、无损还原与自动化回归测试**
   - 不上传、不分发官方闭源二进制；支持 `locales/zh-CN.json` 词库与 `engine/dom-translator.js` 引擎持续演进，附带 `scan_bundle.py`（支持 `--swarm`）漏翻审计脚本与零依赖 `tests/` 自动化回归测试套件。
   - 兼容 Python 3.7+。

## 目录结构

```text
antigravity-zh/
├── patcher.py                  # 双端安装、更新同步与 --guard 巡检主程序
├── restore.py                  # 双端一键无损还原与残留清理脚本
├── scan_bundle.py              # 前端、Electron bundle 与 Swarm 面板词条扫描审计脚本
├── locales/
│   └── zh-CN.json              # 简体中文本地化词库
├── engine/
│   └── dom-translator.js       # 高性能 DOM / Shadow DOM / Swarm 动态翻译与隔离引擎
└── tests/
    ├── test_suite.py           # 语法、词库门禁、Swarm 白名单、幂等性与全量干跑测试
    └── test_dom_isolation.js   # 零依赖 DOM 物理隔离与翻译回归测试
```

## 使用方法

### 1. 一键安装 / 更新（推荐）

**方式一：直接发给 AI 智能体自动安装**（适用于 Antigravity / Gemini 内置智能体，或 Claude Code / Cursor / Codex 等任意编程智能体，整段复制发送即可）：

```text
请帮我从 https://github.com/Eric2077x/antigravity-zh 一键下载并安装最新版 macOS 双端汉化包，直接在单个终端会话中执行以下命令：

(TMP_DIR="$(mktemp -d)" && trap 'rm -rf "$TMP_DIR"' EXIT && PY="" && for p in /opt/homebrew/bin/python3 /usr/local/bin/python3 /Library/Frameworks/Python.framework/Versions/Current/bin/python3; do [ -x "$p" ] && PY="$p" && break; done && { [ -n "$PY" ] || { xcode-select -p >/dev/null 2>&1 && [ -x /usr/bin/python3 ] && PY=/usr/bin/python3; }; } && if [ -z "$PY" ]; then echo "未检测到可用的 Python 3，请先执行 xcode-select --install 后再试。" >&2; exit 1; fi && curl -fsSL https://github.com/Eric2077x/antigravity-zh/archive/refs/heads/main.tar.gz -o "$TMP_DIR/pkg.tar.gz" && tar -xzf "$TMP_DIR/pkg.tar.gz" -C "$TMP_DIR" && if ! ("$PY" "$TMP_DIR/antigravity-zh-main/patcher.py" && "$PY" "$HOME/.antigravity-zh/patcher.py" --guard-check); then echo "提示：若遇到 macOS「App 管理」权限拦截，请在系统弹窗点“允许”，或在终端执行一次: sudo $PY \"$HOME/.antigravity-zh/patcher.py\"" >&2; exit 1; fi)

执行后若返回码为 0：如果当前在 Antigravity 或 Gemini 内部对话，请提醒我按一下 Cmd + R（或重启一次应用）使中文完整生效；若返回非 0，请把终端输出的提示或 sudo 命令原样发给我。
```

**方式二：在 macOS 终端直接一键运行**（免 `git` 依赖，安装后自动清理临时文件并注册防更新掉落守护）：

```bash
(TMP_DIR="$(mktemp -d)" && trap 'rm -rf "$TMP_DIR"' EXIT && PY="" && for p in /opt/homebrew/bin/python3 /usr/local/bin/python3 /Library/Frameworks/Python.framework/Versions/Current/bin/python3; do [ -x "$p" ] && PY="$p" && break; done && { [ -n "$PY" ] || { xcode-select -p >/dev/null 2>&1 && [ -x /usr/bin/python3 ] && PY=/usr/bin/python3; }; } && if [ -z "$PY" ]; then echo "未检测到可用的 Python 3，请先执行 xcode-select --install 后再试。" >&2; exit 1; fi && curl -fsSL https://github.com/Eric2077x/antigravity-zh/archive/refs/heads/main.tar.gz -o "$TMP_DIR/pkg.tar.gz" && tar -xzf "$TMP_DIR/pkg.tar.gz" -C "$TMP_DIR" && if ! ("$PY" "$TMP_DIR/antigravity-zh-main/patcher.py" && "$PY" "$HOME/.antigravity-zh/patcher.py" --guard-check); then echo "提示：若遇到 macOS「App 管理」权限拦截，请在系统弹窗点“允许”，或在终端执行一次: sudo $PY \"$HOME/.antigravity-zh/patcher.py\"" >&2; exit 1; fi)
```

### 2. 本地克隆安装与常用参数

```bash
git clone https://github.com/Eric2077x/antigravity-zh.git
cd antigravity-zh
python3 patcher.py
```

若系统提示 macOS「App 管理」拦截了对 `/Applications/` 的修改，可在「系统设置 -> 隐私与安全性 -> App 管理」中授权当前终端，或使用管理员权限运行（脚本会自动归还用户目录文件属主）：

```bash
sudo python3 ~/.antigravity-zh/patcher.py
```

常用参数：

- `--force`：忽略 SHA256 缓存，强制重新解包与修补双端。
- `--skip-kill` / `--skip-restart`：仅写入补丁，不自动结束或重启应用。
- `--no-install-guard`：本次仅打补丁，不安装或重载 LaunchAgent 守护服务。
- `--guard`：守护巡检模式（仅当版本更新、Gatekeeper 放行或词库变化时增量同步）。
- `--guard-check`：只读快速检查双端与共享汉化包是否为最新状态（最新返回 `0`，需同步返回 `1`）。

### 3. 一键无损还原

```bash
python3 ~/.antigravity-zh/restore.py
```

若应用目录受系统权限保护，同样可使用 `sudo python3 ~/.antigravity-zh/restore.py`。还原脚本会依次卸载并移除 LaunchAgent、从备份还原 `app.asar` 与 `Gemini.app/Contents/Helpers/agy`、删除 `language_server_zh`、清理共享 Web 汉化目录 `~/.gemini/{antigravity,antigravity-cli}/brain/.antigravity-zh` 与 `~/.antigravity-zh/`。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。
