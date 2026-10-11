# ScreenX

Lightweight, modern, and practical desktop screenshot & productivity tool for Windows.

> **Screenshot · Offline OCR · Search · Translation · Pin · Omnidirectional Scrolling Screenshot**

( [中文](README.md) | English )

---

## Overview

ScreenX is focused on a streamlined, stable, and swift daily screen information extraction workflow:
**"Select Screen Area → Local Offline OCR → Quick Search / Word Translation / Desktop Pin"**

Through deliberate architectural streamlining and system-level hardening, ScreenX eliminates redundant modules to focus purely on desktop productivity. It runs standalone with an embedded runtime, requiring no external Node.js or .NET runtime configuration.

---

## Key Features

### 1. Native Capture & Annotation
- **Physical Buffer Capture**: Based on Win32 GDI physical buffer capture technology, providing accurate selection across multi-monitor and high-DPI environments without screen tearing or black screens.
- **Rich Annotation Tools**: Brush, rectangle, ellipse, arrow, text, mosaic, Gaussian blur, and screen color picker.
- **History & Undo**: Full undo/redo support for seamless editing.
- **Save & Share**: One-click copy to clipboard, or export to PNG, JPG, or SVG image files.

### 2. Offline Local OCR
- **On-Device Neural Inference**: Powered by embedded lightweight PaddleOCR ONNX models running entirely locally on CPU, ensuring user privacy and data security even offline.
- **Smart Text Handling**: Immediate text editing, paragraph merging, and one-click quick extraction.

### 3. Integrated Instant Search
- **Select & Search**: Instantly invoke the default browser with popular search engines directly from cropped selections or recognized text.

### 4. Quick Word Translation
- **Side-by-Side Comparison**: Translate selected text seamlessly with configurable multiple translation engines for bilingual lookup and document reading.

### 5. Desktop Pin
- **Top-Level Screen Pinning**: Pin captured snippets or clipboard images on top of all windows with a single keystroke.
- **Fluid Interactions**: Infinite zoom, opacity adjustments, click-through (mouse transparency), and free drag positioning.

### 6. Omnidirectional Scrolling Screenshot
- **Multi-Directional Stitching**: Capture long web pages, wide spreadsheets, and long documents vertically, horizontally, or in any scroll direction.
- **Feature Alignment**: Automatically detects overlapping regions for seamless image stitching.

---

## Global Shortcuts

| Action | Default Shortcut | Description |
| :--- | :--- | :--- |
| **Capture / Annotate** | <kbd>Alt</kbd> + <kbd>C</kbd> | Crop screen area and open annotation toolbar |
| **OCR Workbench** | <kbd>Alt</kbd> + <kbd>V</kbd> | Open character recognition workbench |
| **Clipboard Pin** | <kbd>Alt</kbd> + <kbd>B</kbd> | Pin image from clipboard to desktop |
| **Scrolling Screenshot** | <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> | Capture long content with automated alignment |

*(All shortcuts can be customized via Settings in the system tray menu)*

---

## Download & Installation

### 1. Official Installer (Setup)
- **Recommended for general Windows users**.
- Download `ScreenX-Setup-1.0.0.exe`, launch the installer, and follow the wizard.
- Creates Desktop and Start Menu shortcuts, and supports standard Windows uninstallation.

### 2. Portable Edition (ZIP)
- **Zero-installation, suitable for USB flash drives and portable environments**.
- Download `ScreenX-1.0.0-win.zip` and extract to any local folder.
- Run `ScreenX.exe` directly. Self-contained runtime data isolation; simply delete the directory to remove.

---

## Public Endpoints & Distribution

- **Official Website**: [https://screenx.jacobscy.xyz/](https://screenx.jacobscy.xyz/)
- **Releases & Checksums**: [https://screenx.jacobscy.xyz/release](https://screenx.jacobscy.xyz/release)
- **Privacy Policy**: [https://screenx.jacobscy.xyz/privacy](https://screenx.jacobscy.xyz/privacy)
- **Download CDN**: [https://download.jacobscy.xyz/](https://download.jacobscy.xyz/)
- **Personal Navigation**: [https://nav.jacobscy.xyz/](https://nav.jacobscy.xyz/)
- **Latest Metadata API**: [https://download.jacobscy.xyz/latest.json](https://download.jacobscy.xyz/latest.json)

---

## Development & Build

### Requirements
- Node.js >= 18
- pnpm >= 9
- Windows 10 (1809+) / Windows 11 (64-bit)

### Commands

```powershell
# 1. Install dependencies
pnpm install

# 2. Local dev mode
pnpm run dev

# 3. Lint & Typecheck
pnpm run lint
pnpm run typecheck

# 4. Run tests
pnpm run test

# 5. Production build
pnpm run build
pnpm run dist
```

---

## License & Attribution

ScreenX is Free and Open Source Software (FOSS) licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

This project is a modified work evolved from the open-source upstream project **eSearch**:
- **Original Project**: [https://github.com/xushengfeng/eSearch](https://github.com/xushengfeng/eSearch)
- **Original Copyright**: Copyright © xushengfeng
- **License**: GNU General Public License v3.0 (GPL-3.0)

ScreenX strictly adheres to the terms of GPL-3.0, documents modifications, and publishes full corresponding source code. For detailed modification notes and third-party notices, please see [NOTICE.md](./NOTICE.md) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
