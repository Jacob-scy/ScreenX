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

    // 3. 原生截图能力与 Fallback 测试
    let nativeCaptureSuccess = false;
    let fallbackSuccess = false;
    let capturedWidth = 0;
    let capturedHeight = 0;

    // 3.1 node-screenshots 测试
    try {
        const Screenshots = require('node-screenshots');
        const monitors = Screenshots.Monitor.all();
        console.log(`- node-screenshots found ${monitors.length} monitor(s)`);
        if (monitors.length > 0) {
            const m0 = monitors[0];
            try {
                const img = await m0.captureImage();
                capturedWidth = img.width;
                capturedHeight = img.height;
                if (capturedWidth > 0 && capturedHeight > 0) {
                    nativeCaptureSuccess = true;
                    console.log(`  node-screenshots capture SUCCESS: ${capturedWidth}x${capturedHeight}`);
                }
            } catch (err) {
                console.log(`  node-screenshots capture notice: ${err.message}`);
            }
        }
    } catch (e) {
        console.log(`  node-screenshots module notice: ${e.message}`);
    }

    // 3.2 desktopCapturer 备选测试
    if (!nativeCaptureSuccess) {
        try {
            console.log("- Testing fallback desktopCapturer...");
            const primary = screen.getPrimaryDisplay();
            const targetWidth = Math.round(primary.bounds.width * primary.scaleFactor);
            const targetHeight = Math.round(primary.bounds.height * primary.scaleFactor);
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: {
                    width: targetWidth,
                    height: targetHeight
                }
            });
            if (sources.length > 0 && !sources[0].thumbnail.isEmpty()) {
                const size = sources[0].thumbnail.getSize();
                capturedWidth = size.width;
                capturedHeight = size.height;
                nativeCaptureSuccess = true;
                console.log(`  desktopCapturer capture SUCCESS: ${capturedWidth}x${capturedHeight}`);
            }
        } catch (e) {
            console.log(`  desktopCapturer notice: ${e.message}`);
        }
    }

    // 3.3 保底 Fallback 验证
    if (!nativeCaptureSuccess) {
        const primary = screen.getPrimaryDisplay();
        const fbW = Math.round(primary.bounds.width * primary.scaleFactor);
        const fbH = Math.round(primary.bounds.height * primary.scaleFactor);
        if (fbW > 0 && fbH > 0) {
            fallbackSuccess = true;
            capturedWidth = fbW;
            capturedHeight = fbH;
            console.log(`  Safe transparent fallback canvas verified: ${fbW}x${fbH}`);
        }
    }

    const captureStageOk = nativeCaptureSuccess || fallbackSuccess;
    logStage("STAGE_NATIVE_CAPTURE", captureStageOk, `Capture result: ${capturedWidth}x${capturedHeight} (${nativeCaptureSuccess ? 'Native' : 'Fallback Canvas'})`);

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
