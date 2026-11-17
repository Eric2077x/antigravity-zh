# Antigravity & Gemini.app 双端简体中文汉化补丁 (macOS)

专为 macOS 版 **Antigravity**（适配 `v2.15+` ~ `v2.31+` Electron 主进程与 Webview）以及 **Gemini.app 内置 Antigravity**（`Contents/Helpers/agy`，兼容 `agy 1.5.9+`）设计的无损、原生级、防更新掉落双端简体中文汉化工具。

## 核心特性与安全架构

1. **双端完整汉化**
   - **Antigravity.app**：解包并修补 Electron `app.asar`，覆盖原生顶部菜单（含 `menu.js` 异步 WSL 菜单二次刷新）、原生右键菜单（`ipcHandlers.js` `buildContextMenuTemplate` 静态词库与动态规则映射）、托盘菜单、自动更新提示、加载与环境准备页、WSL 状态提示（`wsl.js`）、安全弹窗、USB/WebAuthn 设备选择、语言服务器诊断及工作区对话标题生成（`language_server_zh`），并自动设置 `lang="zh-CN"` 以启用原生中文字形渲染。
   - **Gemini.app 内置 Antigravity**：仅修补 `Gemini.app/Contents/Helpers/agy` 内嵌的前端资源，等长重打包 `index.html`（注入等待 `DOMContentLoaded` 与 `window.__APP_CONFIG__` 的安全加载器及 `<html lang="zh-CN">`）并同步生成双路径共享汉化包 `~/.gemini/{antigravity,antigravity-cli}/brain/.antigravity-zh/ag-zh.js`，覆盖 Agent 对话、设置面板（含界面布局、模型配额动态刷新、Cookie 按站管理与快捷键方案）、工作区、错误提示、右键/浮层、开放式延迟 Shadow DOM（`attachShadow`）全量动态汉化及 WKWebView 高对比度截图缩略图自适应压缩兜底；前端引擎采用无原型字典（`Object.create(null)`）、有界翻译缓存与闭包私有 `WeakMap` 节点缓存实现宿主零侵入。
2. **版本择优同步与包体洁净保护**
   - **只升不降的官方底座策略**：始终优先识别并保留本机 `Gemini.app/Contents/Helpers/agy` 原版备份；当检测到本机存在通过 Google 官方代码签名校验（`EQHXZ8M8AV`）且版本更高的 `~/.local/bin/agy` CLI（支持最新 `2.31+` / `1.5.9+` 内核与 `/swarm`）时，自动以其为底座执行等长内嵌 ZIP 重打包，无更高版本或外部 CLI 缺失时平滑回退原版，只升级不降级。
   - **包外备份与指纹缓存**：官方原版备份、多段 SHA256 状态与 `guard_stat_cache.json` 文件指纹缓存统一保存在 `~/.antigravity-zh/backup/`，不在 `Gemini.app/Contents/Helpers/` 内残留 `.agy.orig` 等多余文件，绝不修改 `MacOS/Gemini`。
   - **精准单文件重签**：对 `language_server_zh` 保留原始 `allow-jit` 权限；对 `Helpers/agy` 保留原始 `Identifier=agy` 且不额外注入非必要权限；首次启动前若检测到 macOS Gatekeeper 尚未放行，会自动等待用户首次打开放行后再安全打补丁。
3. **防更新掉落与双向同步守护**
   - 自动安装 `~/.antigravity-zh/guard-runner.sh` 与用户级 LaunchAgent（`~/Library/LaunchAgents/com.antigravity.zh-cn.plist`），监听 `/Applications`、`~/.antigravity-zh/locales`、`~/.antigravity-zh/engine`（及存在时的 `~/.local/bin`）并配合 60 秒轻量巡检；守护日志 `~/.antigravity-guard.log` 超过 512KB 自动原子轮转。
   - **TCC 无弹窗毫秒级只读预检**：守护脚本先通过 `patcher.py --guard-check` 基于 `stat` 指纹缓存执行毫秒级零大文件读盘校验（最新则立即退出）；仅在真正检测到更新、语言引擎状态缺失或词库变化时，才优先通过经 Google 官方签名校验的 `Antigravity Helper` (`ELECTRON_RUN_AS_NODE=1`) 调起 `--guard` 完成无痛同步，避免 `launchd` 被 macOS App 管理拦截。
   - **进程锁与防自杀**：进程互斥锁统一位于 `/tmp/antigravity-zh-{uid}.lock`（带 `O_NOFOLLOW` 与属主校验）；在 Antigravity / Gemini 内置终端运行时自动跳过自杀，提示按 `Cmd + R` 或手动重启生效。
4. **纯增量补丁与无损还原**
   - 不上传、不分发官方闭源二进制；支持 `locales/zh-CN.json` 词库与 `engine/dom-translator.js` 引擎持续演进，并附带 `scan_bundle.py` 双端词条漏翻审计脚本。
   - 兼容 Python 3.7+。

## 目录结构

```text
antigravity-zh/
├── patcher.py               # 双端安装、更新同步与 --guard 巡检主程序
├── restore.py               # 双端一键无损还原与残留清理脚本
├── scan_bundle.py           # 前端与 Electron bundle 词条扫描辅助脚本
├── locales/
│   └── zh-CN.json           # 简体中文本地化词库
└── engine/
    └── dom-translator.js    # 高性能 DOM / 文本 / 属性动态翻译引擎
```

## 使用方法

### 1. 安装 / 更新汉化

```bash
cd antigravity-zh
python3 patcher.py
```

若系统提示 macOS「App 管理」拦截了对 `/Applications/` 的修改，可在「系统设置 -> 隐私与安全性 -> App 管理」中授权当前终端，或使用管理员权限运行（脚本会自动归还用户目录文件属主）：

```bash
sudo python3 patcher.py
```

常用参数：

- `--force`：忽略 SHA256 缓存，强制重新解包与修补双端。
- `--skip-kill` / `--skip-restart`：仅写入补丁，不自动结束或重启应用。
- `--no-install-guard`：本次仅打补丁，不安装或重载 LaunchAgent 守护服务。
- `--guard`：守护巡检模式（仅当版本更新、Gatekeeper 放行或词库变化时增量同步）。
- `--guard-check`：只读快速检查双端与共享汉化包是否为最新状态（最新返回 `0`，需同步返回 `1`）。

### 2. 一键无损还原

```bash
python3 restore.py
```

若应用目录受系统权限保护，同样可使用 `sudo python3 restore.py`。还原脚本会依次卸载并移除 LaunchAgent、从备份还原 `app.asar` 与 `Gemini.app/Contents/Helpers/agy`、删除 `language_server_zh`、清理共享 Web 汉化目录 `~/.gemini/{antigravity,antigravity-cli}/brain/.antigravity-zh` 与 `~/.antigravity-zh/`。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。
