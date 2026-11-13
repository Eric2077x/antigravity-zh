# Antigravity & Gemini.app 双端简体中文汉化补丁 (macOS)

专为 macOS 版 **Antigravity**（适配 `v2.15+` ~ `v2.31+` Electron 主进程与 Webview）以及 **Gemini.app 内置 Antigravity**（`Contents/Helpers/agy`）设计的无损、原生级、防更新掉落双端简体中文汉化工具。

## 核心特性与安全架构

1. **双端完整汉化**
   - **Antigravity.app**：解包并修补 Electron `app.asar`，覆盖原生顶部菜单（含 `menu.js` 异步 WSL 菜单二次刷新）、原生右键菜单（`ipcHandlers.js` `buildContextMenuTemplate`）、托盘菜单、自动更新提示、加载与环境准备页、安全弹窗、USB/WebAuthn 设备选择、语言服务器诊断与工作区对话标题生成（`language_server_zh`）。
   - **Gemini.app 内置 Antigravity**：仅修补 `Gemini.app/Contents/Helpers/agy` 内嵌的前端资源，注入与 Antigravity 共用的静态汉化脚本 `/static/artifacts/.antigravity-zh/ag-zh.js`，支持 Agent 对话、设置面板、工作区、错误提示与右键/浮层全量动态汉化。
2. **原生签名与包体洁净保护**
   - **绝不跨版本替换二进制**：始终基于本机 `Gemini.app/Contents/Helpers/agy` 原版二进制进行原地等长内嵌 ZIP 重打包，绝不用 `~/.local/bin/agy` 等外部 CLI 覆盖 `Helpers/agy`。
   - **包外备份**：原版备份与状态校验统一保存在 `~/.antigravity-zh/backup/`，不在 `Gemini.app/Contents/Helpers/` 内残留 `.agy.orig` 等多余文件，绝不重签 `Gemini.app` 外层或 `MacOS/Gemini`。
   - **精准单文件重签**：对 `language_server_zh` 保留原始 `allow-jit` 权限；对 `Helpers/agy` 保留原始 `Identifier=agy` 且不额外注入非必要权限；首次启动前若检测到 macOS Gatekeeper 尚未放行，会自动等待用户首次打开放行后再安全打补丁，避免破坏初次校验。
3. **防更新掉落与双向同步守护**
   - 自动安装 `~/.antigravity-zh/guard-runner.sh` 与用户级 LaunchAgent（`~/Library/LaunchAgents/com.antigravity.zh-cn.plist`），监听 `/Applications`、`~/.antigravity-zh/locales`、`~/.antigravity-zh/engine` 并配合 60 秒轻量巡检。
   - **无自引用死锁**：LaunchAgent 直接通过独立脚本调用真实 `python3` 运行 `--guard`，不依赖应用自身 `Antigravity Helper`。
   - **进程锁与防自杀**：进程互斥锁统一位于 `/tmp/antigravity-zh-{uid}.lock`（带 `O_NOFOLLOW` 与属主校验）；在 Antigravity / Gemini 内置终端运行时自动跳过自杀，提示按 `Cmd + R` 或手动重启生效。
4. **纯增量补丁与无损还原**
   - 不上传、不分发官方闭源二进制；支持 `locales/zh-CN.json` 词库与 `engine/dom-translator.js` 引擎持续演进。
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

### 2. 一键无损还原

```bash
python3 restore.py
```

若应用目录受系统权限保护，同样可使用 `sudo python3 restore.py`。还原脚本会依次卸载并移除 LaunchAgent、从备份还原 `app.asar` 与 `Gemini.app/Contents/Helpers/agy`、删除 `language_server_zh`、清理共享 Web 汉化目录 `~/.gemini/antigravity/brain/.antigravity-zh` 与 `~/.antigravity-zh/`。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。
