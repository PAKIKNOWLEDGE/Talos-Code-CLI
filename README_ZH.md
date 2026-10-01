# Talos CLI

[English](README.md) · [npm](https://www.npmjs.com/package/@pakiknowledge/tal0s-code) · [贡献指南](CONTRIBUTING.md)

采用 Endfield 风格终端界面、平级 provider 配置的 coding agent。沿用 MiniMax Code 引擎，以独立包名和命令发行，在你指定的工作目录执行任务。

![Talos 0.1.0 欢迎页](docs/assets/talos-welcome.png)

> **0.1.0 预览版。** Windows x64 已通过现有源码与安装包检查；NixOS 安装测试尚未完成。本次发行仅包含 CLI，不包含配套 GUI 或 Tauri 桌面外壳。

## 安装

需要 Node.js **22.19–22.x、24.2–24.x、25.x 或 26.x**。保留依赖安装脚本和可选依赖，以安装原生 SQLite 与剪贴板支持。

```sh
npm install -g @pakiknowledge/tal0s-code@latest --registry=https://registry.npmjs.org/ --ignore-scripts=false --include=optional
talos --version
```

命令为 `talos`，不保留 `mcode` 兼容别名。

## 在项目中开始

```sh
cd /path/to/your/project
talos
```

输入 `/provider` 新增或选择模型连接。可以使用预设，也可以配置自定义 API 地址、模型和 API key。provider 使用平级配置入口，无需 MiniMax 账号；模型调用由你选择的供应商计费。

描述任务、允许修改的范围和验收方式；执行时查看工具结果及审批请求。

![Talos 对话与工具执行](docs/assets/talos-session.png)

截图背景图与透明效果来自用户的终端配置。Talos 提供黄色终端界面和文字字标，不附带壁纸，也不会设置终端背景。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `talos` | 在当前目录打开交互界面。 |
| `talos "Explain this repository"` | 携带初始任务启动。 |
| `talos --continue` | 继续当前工作目录的最近会话。 |
| `talos --session` | 打开会话选择器。 |
| `talos exec "Explain this repository"` | 无交互界面执行任务。 |
| `talos acp` | 连接 Agent Client Protocol 客户端。 |
| `talos update` | 检查新版并显示手动 npm 升级命令。 |
| `talos --help` | 查看可用命令与选项。 |

TUI 中的 `/provider` 管理模型连接，`/sessions` 打开历史，`/help` 查看命令和快捷键。

## 数据与升级

默认配置和会话保存在 `~/.talos`，Windows 对应 `%USERPROFILE%\.talos`。卸载 npm 包不会删除这些数据。不要将 API key 或私人会话提交到 Git。

Talos 只提示更新，不下载或执行安装器。自行再次运行上面的安装命令即可升级。启动只为当前进程添加工具路径；持久化 shell PATH 集成默认关闭，仅显式设置 `TALOS_ENABLE_SHELL_PATH_INTEGRATION=1` 时启用。

## 安装问题

- **SQLite 原生文件缺失：**确认安装脚本已启用，再检查 `talos` 是否指向本次安装；pnpm 安装的同名入口可能排在 npm 前。PowerShell 使用 `Get-Command talos -All`，Unix 使用 `command -v talos`。
- **Windows 找不到 prebuild-install 或 node-gyp：**旧终端可能还保留过长的旧 PATH。完全退出终端宿主后重开；必要时在重装前只刷新当前 PowerShell 的进程环境：

```powershell
$env:Path = 'C:\Program Files\nodejs;' + [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
npm install -g @pakiknowledge/tal0s-code@latest --registry=https://registry.npmjs.org/ --ignore-scripts=false --include=optional
```

Windows 验证时使用的 npm 11.12.1 不识别 `--allow-scripts`，这里不要求该参数。单独出现 prebuild-install 弃用警告不表示失败。若仍失败，保留最后错误，不要删除用户配置或放宽系统权限。

## 预览版范围

包含终端界面、provider、工具、会话与 ACP 入口。默认联网搜索后置，自配 MCP 搜索尚未实测；GUI/Tauri 属于另一条工作线。NixOS 尚未确认兼容，若遇到原生库或可执行文件加载问题，请提供准确错误。

## 开发

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

开发工作区保持 private，发行包单独准备，避免意外发布。仓库边界、检查和上游同步见 [AGENTS.md](AGENTS.md)、[贡献指南](CONTRIBUTING.md) 与 [源码同步契约](docs/source-sync.md)。部分继承技术文档仍描述上游 MiniMax Code，本页说明 Talos 发行版的实际入口。

## 许可与上游

Talos 基于 [MiniMax Code](https://github.com/MiniMax-AI/minimax-code)，包含 [pi-mono](https://github.com/badlogic/pi-mono) 等组件，保留原作者版权及署名。具体许可与例外见 [LICENSE](LICENSE)、[NOTICE](NOTICE)、[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [LICENSE-STATUS.md](LICENSE-STATUS.md)。
