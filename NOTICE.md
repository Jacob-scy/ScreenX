# NOTICE

## ScreenX Modification Notice

ScreenX
Copyright © 2026 ScreenX Contributors

This project is a modified version of eSearch.
- **Original Project**: https://github.com/xushengfeng/eSearch
- **Original Copyright**: Copyright © xushengfeng
- **License**: GNU General Public License v3.0 (GPL-3.0)

This repository contains modifications made by the current project maintainers.

### Summary of Major Modifications:
1. **Product Scope Refinement**: Focused exclusively on Windows desktop efficiency essentials: Screen Capture, Local Offline OCR, Information Search, Translation, Pinning (Ding), and Omnidirectional Scrolling Screenshot. Removed unused heavy auxiliary components (screen recorder, live screen translation, camera AI, image enhancement).
2. **Native Physical Capture Integration**: Implemented and refined a Windows native physical buffer capture engine (`wincapture.exe`) utilizing Win32 GDI/PrintWindow APIs to resolve high-DPI and multi-monitor scaling artifacts.
3. **Asynchronous Engine & Concurrency Control**: Replaced blocking synchronous capture execution with non-blocking asynchronous child processes with strict timeout guards (5s timeout) and single-flight mutex protection against UI freezing.
4. **Lifecycle & Shortcut Hardening**: Completely eliminated `getClipWin()` hang states, isolated Tray click lifecycle from inadvertent screenshot activations, and stabilized `Alt+C` global shortcut handling.
5. **Product Branding & Packaging**: Restructured build metadata and artifacts for the standalone `ScreenX.exe` Windows desktop application under GPL-3.0 compliance.

Modified in 2026.
