// @ts-check
const { app, BrowserWindow, screen, desktopCapturer, globalShortcut, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');

/**
 * Screenshot Personal Edition - Windows Runtime E2E Diagnostic Tool
 */
async function runDiagnostic() {
    console.log("==================================================");
    console.log("🔍 SCREENSHOT RUNTIME E2E DIAGNOSTIC");
    console.log("==================================================");

    let passed = true;
    const stages = {};

    function logStage(stage, success, details) {
        stages[stage] = { success, details };
        console.log(`[${success ? '✅ PASS' : '❌ FAIL'}] ${stage}: ${details}`);
        if (!success) passed = false;
    }

    // 1. 系统与运行环境
    try {
        console.log(`- Electron Version: ${process.versions.electron}`);
        console.log(`- Node.js Version: ${process.versions.node}`);
        console.log(`- OS: ${os.type()} ${os.release()} (${os.arch()})`);
        logStage("STAGE_ENVIRONMENT", true, "Environment info collected");
    } catch (e) {
        logStage("STAGE_ENVIRONMENT", false, e.message);
    }

    // 2. 显示器检测与 DPI
    let displays = [];
    try {
        displays = screen.getAllDisplays();
        console.log(`- Detected Displays: ${displays.length}`);
        displays.forEach((d, idx) => {
            console.log(`  Display #${idx} (ID: ${d.id}): Bounds [x:${d.bounds.x}, y:${d.bounds.y}, w:${d.bounds.width}, h:${d.bounds.height}], ScaleFactor: ${d.scaleFactor}`);
        });
        if (displays.length > 0 && displays[0].bounds.width > 0) {
            logStage("STAGE_DISPLAY_DETECTION", true, `Found ${displays.length} valid display(s)`);
        } else {
            logStage("STAGE_DISPLAY_DETECTION", false, "No valid display found");
        }
    } catch (e) {
        logStage("STAGE_DISPLAY_DETECTION", false, e.message);
    }

    // 3. 真实原生屏幕像素捕获与图像真实性检验 (禁止任何 Fake / Fallback Canvas 伪造 PASS)
    let realCaptureSuccess = false;
    let capturedWidth = 0;
    let capturedHeight = 0;
    let savedFilePath = "";
    let testFileSize = 0;
    let uniqueColorsCount = 0;
    let nonTransparentRatio = 0;
    let centerPixelStr = "";
    let cornerPixelsStr = "";
    let captureStageMessage = "";

    const diagDir = path.join(__dirname, '../temp/diagnostics');
    const fs = require('node:fs');
    fs.mkdirSync(diagDir, { recursive: true });
    const targetPng = path.join(diagDir, 'screenshot-test.png');
    const rawScreenPng = path.join(diagDir, 'raw-screen.png');

    // 3.1 优先测试 Windows 原生截屏器 (Fresh Thread GDI)
    const nativeExe = path.join(__dirname, '../resources/bin/wincapture.exe');
    if (process.platform === 'win32' && fs.existsSync(nativeExe)) {
        try {
            console.log(`- Running Windows Native Capture Engine: ${nativeExe}`);
            const { execFileSync } = require('node:child_process');
            execFileSync(nativeExe, [targetPng]);
            if (fs.existsSync(targetPng)) {
                const stat = fs.statSync(targetPng);
                testFileSize = stat.size;
                savedFilePath = targetPng;
                fs.copyFileSync(targetPng, rawScreenPng);
                console.log(`  wincapture generated image files: ${targetPng} & ${rawScreenPng} (${testFileSize} bytes)`);
            }
        } catch (err) {
            console.log(`  wincapture execution error: ${err.message}`);
        }
    }

    // 3.2 备选测试 node-screenshots (若原生引擎未执行)
    if (!fs.existsSync(targetPng) || testFileSize === 0) {
        try {
            const Screenshots = require('node-screenshots');
            const monitors = Screenshots.Monitor.all();
            if (monitors.length > 0) {
                const img = await monitors[0].captureImage();
                if (img && img.width > 0 && img.height > 0) {
                    fs.writeFileSync(targetPng, img.toPngSync(true));
                    testFileSize = fs.statSync(targetPng).size;
                    savedFilePath = targetPng;
                    console.log(`  node-screenshots captured: ${img.width}x${img.height} (${testFileSize} bytes)`);
                }
            }
        } catch (e) {
            console.log(`  node-screenshots capture error: ${e.message}`);
        }
    }

    // 3.3 深度真实性像素检验 (Pixel Authenticity Verification)
    if (fs.existsSync(targetPng) && testFileSize > 10 * 1024) {
        try {
            const { nativeImage } = require('electron');
            const nImg = nativeImage.createFromPath(targetPng);
            const size = nImg.getSize();
            capturedWidth = size.width;
            capturedHeight = size.height;
            const bitmap = nImg.toBitmap();

            if (bitmap.length >= capturedWidth * capturedHeight * 4) {
                const colorSet = new Set();
                let nonTransparentCount = 0;
                let sampleTotal = 0;

                const stepX = Math.max(1, Math.floor(capturedWidth / 40));
                const stepY = Math.max(1, Math.floor(capturedHeight / 25));

                for (let y = 0; y < capturedHeight; y += stepY) {
                    for (let x = 0; x < capturedWidth; x += stepX) {
                        const idx = (y * capturedWidth + x) * 4;
                        const b = bitmap[idx];
                        const g = bitmap[idx + 1];
                        const r = bitmap[idx + 2];
                        const a = bitmap[idx + 3];
                        sampleTotal++;
                        if (a > 0) nonTransparentCount++;
                        colorSet.add((r << 16) | (g << 8) | b);
                    }
                }

                uniqueColorsCount = colorSet.size;
                nonTransparentRatio = Math.round((nonTransparentCount / sampleTotal) * 100);

                // 采样中心与四角像素
                const getPixelAt = (x, y) => {
                    const i = (y * capturedWidth + x) * 4;
                    return `RGBA(${bitmap[i+2]},${bitmap[i+1]},${bitmap[i]},${bitmap[i+3]})`;
                };
                centerPixelStr = getPixelAt(Math.floor(capturedWidth / 2), Math.floor(capturedHeight / 2));
                cornerPixelsStr = `TL=${getPixelAt(0, 0)}, TR=${getPixelAt(capturedWidth - 1, 0)}, BL=${getPixelAt(0, capturedHeight - 1)}, BR=${getPixelAt(capturedWidth - 1, capturedHeight - 1)}`;

                console.log(`- Image Authenticity Metrics:`);
                console.log(`  Resolution: ${capturedWidth}x${capturedHeight}`);
                console.log(`  File Size: ${testFileSize} bytes`);
                console.log(`  Sampled Points: ${sampleTotal}`);
                console.log(`  Unique Colors in Sample: ${uniqueColorsCount}`);
                console.log(`  Non-transparent Ratio: ${nonTransparentRatio}%`);
                console.log(`  Center Pixel: ${centerPixelStr}`);
                console.log(`  Corner Pixels: ${cornerPixelsStr}`);

                // 必须满足：有尺寸、文件够大、完全不透明、样本包含多样真实颜色（非纯色占位）
                if (capturedWidth > 0 && capturedHeight > 0 && testFileSize > 20000 && nonTransparentRatio === 100 && uniqueColorsCount >= 30) {
                    realCaptureSuccess = true;
                    captureStageMessage = `Real Desktop Captured: ${capturedWidth}x${capturedHeight}, ${testFileSize} bytes, ${uniqueColorsCount} colors, 100% opaque`;
                } else {
                    captureStageMessage = `Invalid Pixel Data: colors=${uniqueColorsCount}, opaque=${nonTransparentRatio}%, size=${testFileSize}`;
                }
            }
        } catch (parseErr) {
            captureStageMessage = `Failed to parse captured image: ${parseErr.message}`;
        }
    } else {
        captureStageMessage = `Capture failed: output file missing or too small (${testFileSize} bytes)`;
    }

    logStage("STAGE_NATIVE_CAPTURE", realCaptureSuccess, captureStageMessage);

    // 4. 全局快捷键注册验证
    const shortcuts = [
        { name: "截屏 (Alt+C)", key: "Alt+C" },
        { name: "万向滚动截图 (Alt+Shift+L)", key: "Alt+Shift+L" },
        { name: "文字识别 (Alt+V)", key: "Alt+V" },
        { name: "贴图 (Alt+B)", key: "Alt+B" }
    ];
    let allShortcutsRegistered = true;
    for (const s of shortcuts) {
        try {
            const ok = globalShortcut.register(s.key, () => {});
            console.log(`- Shortcut [${s.name}]: ${ok ? 'Registered' : 'FAILED / OCCUPIED'}`);
            if (!ok) allShortcutsRegistered = false;
            globalShortcut.unregister(s.key);
        } catch (err) {
            console.log(`- Shortcut [${s.name}] Exception: ${err.message}`);
            allShortcutsRegistered = false;
        }
    }
    logStage("STAGE_SHORTCUT_REGISTRATION", allShortcutsRegistered, allShortcutsRegistered ? "All shortcuts available" : "Some shortcuts conflicted");

    // 5. 截图 Overlay 窗口生命周期与全屏定位测试
    try {
        const primary = screen.getPrimaryDisplay();
        const overlay = new BrowserWindow({
            x: primary.bounds.x,
            y: primary.bounds.y,
            width: primary.bounds.width,
            height: primary.bounds.height,
            show: false,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            fullscreenable: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        overlay.setBounds(primary.bounds);
        overlay.setAlwaysOnTop(true, 'screen-saver');
        overlay.show();
        overlay.focus();

        const isVisible = overlay.isVisible();
        const bounds = overlay.getBounds();
        const isTop = overlay.isAlwaysOnTop();

        console.log(`- Overlay Window created: visible=${isVisible}, bounds=[${bounds.x},${bounds.y},${bounds.width},${bounds.height}], alwaysOnTop=${isTop}`);

        const widthMatches = Math.abs(bounds.width - primary.bounds.width) <= 2;
        const heightMatches = Math.abs(bounds.height - primary.bounds.height) <= 2;

        if (isVisible && widthMatches && heightMatches) {
            logStage("STAGE_OVERLAY_WINDOW", true, "Overlay window displayed and bounds match primary screen");
        } else {
            logStage("STAGE_OVERLAY_WINDOW", false, `Overlay bounds mismatch: window=[${bounds.width},${bounds.height}] vs screen=[${primary.bounds.width},${primary.bounds.height}]`);
        }

        overlay.destroy();
    } catch (e) {
        logStage("STAGE_OVERLAY_WINDOW", false, e.message);
    }

    console.log("==================================================");
    if (passed) {
        console.log("🎯 SCREENSHOT_DIAGNOSTIC: PASS");
    } else {
        console.log("⚠️ SCREENSHOT_DIAGNOSTIC: FAIL");
    }
    console.log("==================================================");

    app.quit();
}

app.whenReady().then(runDiagnostic);
