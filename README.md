# Antigravity 原生简体中文汉化包 (antigravity-zh)

专为 macOS 版 **Google Antigravity (v2.15+)** 打造的纯正原生级简体中文汉化补丁与自动防掉守护工具。

## ✨ 核心特性

- **原生级母语润色（3,170+ 精确词条 + 动态正则引擎）**：摒弃生硬机翻与冗余括号注释，完整覆盖主界面、设置中心、工作树（Worktrees）、产物（Artifacts）、子智能体（Subagents）、多路择优（Best of N）、快捷键面板、macOS 原生顶部菜单栏与状态栏托盘。
- **原生中文对话标题生成**：自动让侧边栏新对话标题生成为简洁的简体中文，同时 100% 不影响主模型英文/中文推理与代码质量。
- **严密的代码与编辑器禁区隔离**：硬件级跳过代码编辑器（Monaco）、终端（xterm）、代码块（`pre`/`code`）、快捷键标签（`kbd`）、文件名、Git 分支名、快速搜索高亮片段及对话正文，绝不误伤代码与用户内容。
- **零侵入安全架构**：纯 `TextNode.nodeValue` 与安全属性替换，零 `innerHTML` / `eval`，兼容 Electron `contextIsolation`，不影响 React Fiber 状态树与下拉框绑定值。
- **独立持久化与官方更新自动防掉（LaunchAgent 守护）**：首次运行会自动将守护运行时同步至 `~/.antigravity-zh`（安装后即使删除下载目录也不受影响）。当 Antigravity 自动更新覆盖应用包时，后台守护服务将自动检测并静默重打汉化补丁。
- **一键无损还原**：随时可通过 `restore.py` 毫秒级恢复官方英文原版状态。

---

## 🚀 快速安装（macOS）

确保您的 Mac 已安装 `/Applications/Antigravity.app`，打开「终端 (Terminal)」依次运行以下命令：

```bash
git clone https://github.com/<你的GitHub用户名>/antigravity-zh.git
cd antigravity-zh
python3 patcher.py
```

> **提示**：
> 1. 如果 macOS 提示权限不足（`PermissionError`），请使用管理员权限执行：`sudo python3 patcher.py`（脚本会自动将文件所有权归还给当前登录用户）。
> 2. 如果您直接在 Antigravity 内部的终端中运行 `python3 patcher.py`，脚本会自动识别并避免强杀当前会话，运行完毕后按 **`Cmd + R`** 重新加载窗口即可生效。

---

## 🔄 卸载汉化与恢复英文原版

如果您想卸载汉化并彻底恢复官方原版英文界面，只需运行：

```bash
python3 ~/.antigravity-zh/restore.py
```
（如提示权限不足，请运行 `sudo python3 ~/.antigravity-zh/restore.py`），随后重启 Antigravity 即可恢复英文原版。

---

## 📁 目录结构

```text
antigravity-zh/
├── patcher.py              # 核心原子化汉化注入器与 LaunchAgent 守护安装脚本
├── restore.py              # 一键无损卸载与恢复英文原版脚本
├── scan_bundle.py          # 前端 Bundle 未翻译 UI 词条扫描辅助脚本
├── engine/
│   └── dom-translator.js   # 前端 DOM 与 Shadow DOM 实时汉化引擎
└── locales/
    └── zh-CN.json          # 简体中文核心词库（精确匹配 + 长句前缀 + 原生菜单）
```

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。
