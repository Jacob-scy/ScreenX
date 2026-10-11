# ScreenX

轻量、实用、现代的 Windows 桌面截图与效率利器。

> **截图 · 离线 OCR · 搜索 · 翻译 · 贴图 · 全方向滚动截图**

---

## 核心定位

ScreenX 深度专注于极简、稳定、快速的日常屏幕信息提取工作流闭环：
**“框选屏幕内容 → 本地离线 OCR → 快捷搜索 / 划词翻译 / 桌面贴图”**

通过对产品架构的精简与系统级加固，全面移除冗余辅助模块，专注于桌面信息生产力。单机独立运行，内置独立运行环境，无需用户额外配置 Node.js 或 .NET 运行库。

---

## 六大核心功能

### 1. 原生截图与图像标注
- **物理缓冲快速捕获**：基于 Win32 GDI 物理缓冲捕获技术，多显示器与高 DPI 环境精确选区，画面无黑屏、无撕裂。
- **丰富的绘图标注**：画笔、矩形、椭圆、箭头、文本、马赛克、高斯模糊与屏幕取色器。
- **历史记录与撤销**：支持撤销与重做，随心批注。
- **保存与分享**：一键复制至系统剪贴板，或保存为 PNG/JPG/SVG 图片文件。

### 2. 离线本地 OCR
- **本地神经网络推理**：内置轻量化 PaddleOCR ONNX 模型，纯 CPU 本地离线识别，保障用户隐私与数据安全，断网亦可正常工作。
- **智能文本处理**：识别结果支持即时编辑、段落合并与一键快速提取。

### 3. 便捷聚合搜索
- **划词即搜**：框选屏幕内容或 OCR 提取文本后，一键调用系统默认浏览器使用常用搜索引擎检索，免去繁琐的手动复制粘贴。

### 4. 快捷划词翻译
- **快速划词对照**：选中文本无缝翻译，支持按需配置多翻译源接口对照，方便中英双语及外文文献查阅。

### 5. 桌面贴图 (Pin)
- **屏幕顶层置顶**：截图后直接贴图，或从系统剪贴板一键将图片固定钉在屏幕最前端。
- **自由交互**：支持无级缩放、半透明调整、鼠标穿透与拖拽移动，多文档对照更轻松。

### 6. 全方向滚动截图
- **任意方向拼图**：支持纵向、横向平滑滚动的长网页、宽报表与长文档滚动截图。
- **特征对齐算法**：自动识别图像重叠区，拼接平滑无缝。

---

## 全局默认快捷键

| 功能 | 默认快捷键 | 说明 |
| :--- | :--- | :--- |
| **截图 / 标注** | <kbd>Alt</kbd> + <kbd>C</kbd> | 框选截屏并展开标注工具栏 |
| **文字识别 (OCR)** | <kbd>Alt</kbd> + <kbd>V</kbd> | 开启文本识别主工作台 |
| **剪贴板贴图** | <kbd>Alt</kbd> + <kbd>B</kbd> | 将剪贴板图片置顶贴至桌面 |
| **全方向滚动截图** | <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> | 捕获长内容并自动对齐缝合拼接 |

*(所有快捷键均可在系统托盘右键「设置」中根据个人习惯灵活自定义)*

---

## 下载与安装指南

### 1. 官方安装版 (Setup Installer)
- **推荐普通桌面用户使用**。
- 下载 `ScreenX-Setup-1.0.0.exe`，双击运行，跟随安装向导完成安装。
- 自动创建桌面与开始菜单快捷方式，支持系统标准卸载（「设置」->「应用」->「安装的应用」）。

### 2. 绿色便携版 (Portable ZIP)
- **适合免安装、U 盘随身携带或企业临时测试**。
- 下载 `ScreenX-1.0.0-win.zip`，解压至任意本地目录。
- 双击运行解压目录内的 `ScreenX.exe` 即可即开即用，运行时数据隔离，移除时直接删除文件夹即可。

---

## 公网端点与分发体系

- **官方产品网站**: [https://screenx.jacobscy.xyz/](https://screenx.jacobscy.xyz/)
- **版本发布与校验**: [https://screenx.jacobscy.xyz/release](https://screenx.jacobscy.xyz/release)
- **隐私与数据说明**: [https://screenx.jacobscy.xyz/privacy](https://screenx.jacobscy.xyz/privacy)
- **文件下载 CDN**: [https://download.jacobscy.xyz/](https://download.jacobscy.xyz/)
- **个人导航门户**: [https://nav.jacobscy.xyz/](https://nav.jacobscy.xyz/)
- **最新元数据 API**: [https://download.jacobscy.xyz/latest.json](https://download.jacobscy.xyz/latest.json)

---

## 项目结构

```text
ScreenX/
├── resources/              # 应用图标、托盘资源及原生二进制 (wincapture.exe)
├── src/
│   ├── main/               # Electron 主进程 (生命周期、IPC 通信、原生抓屏调用)
│   ├── renderer/           # 前端渲染进程 (编辑器、OCR 界面、翻译面板、贴图)
│   └── ShareTypes.d.ts     # 跨进程强类型定义
├── release/                # 构建输出目录与 SHA-256 校验清单
├── release-site/           # 静态产品发布站 (Cloudflare Pages 源码)
├── scripts/                # 构建、打包、R2 同步与网站部署脚本
├── docs/                   # 架构设计、部署规范与排障指南 (DEPLOY.md, PUBLIC_RELEASE.md)
├── package.json
└── electron-builder.config.js
```

---

## 开发与构建

### 环境要求
- Node.js >= 18
- pnpm >= 9
- Windows 10 (1809+) / Windows 11 (64-bit)

### 常用命令

```powershell
# 1. 安装项目依赖
pnpm install

# 2. 本地开发调试
pnpm run dev

# 3. 规范与类型检查
pnpm run lint
pnpm run typecheck

# 4. 执行单元测试
pnpm run test

# 5. 生产打包构建
pnpm run build
pnpm run dist

# 6. 一键全流程发布 (构建 + 上传 R2 + 部署网站)
pnpm run release
```

---

## 开源协议与原项目归属

ScreenX 是一款自由与开源软件（FOSS），遵循 **GNU General Public License v3.0 (GPL-3.0)**。

本项目是基于开源上游项目 **eSearch** 进行演进与修改的作品：
- **Original Project**: [https://github.com/xushengfeng/eSearch](https://github.com/xushengfeng/eSearch)
- **Original Copyright**: Copyright © xushengfeng
- **License**: GNU General Public License v3.0 (GPL-3.0)

本项目严格遵循 GPL-3.0 协议条款，对修改内容进行了详细说明并公开发行完整对应源码。详细修改说明及第三方依赖许可声明请参阅 [NOTICE.md](./NOTICE.md) 与 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
