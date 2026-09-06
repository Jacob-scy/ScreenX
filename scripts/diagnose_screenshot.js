// @ts-check
const { app, BrowserWindow, screen, desktopCapturer, globalShortcut, clipboard, nativeImage } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

/**
 * Screenshot Personal Edition - Windows Runtime E2E Diagnostic Tool (PHASE 3.1)
 */
async function runDiagnostic() {
    console.log("==================================================");
    console.log("🔍 SCREENSHOT RUNTIME E2E DIAGNOSTIC (PHASE 3.1)");
    console.log("==================================================");

    let allPassed = true;
    const stages = [];

    function recordResult(name, pass, details) {
        stages.push({ name, pass, details });
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
        if (!pass) allPassed = false;
    }

    // 1. 系统与运行环境
    console.log(`- Electron Version: ${process.versions.electron}`);
    console.log(`- Node.js Version: ${process.versions.node}`);
    console.log(`- OS: ${os.type()} ${os.release()} (${os.arch()})`);

    // 2. 显示器检测与 DPI
    let primaryDisplay = null;
    try {
        const displays = screen.getAllDisplays();
        console.log(`- Detected Displays: ${displays.length}`);
        displays.forEach((d, idx) => {
            console.log(`  Display #${idx} (ID: ${d.id}): Bounds [x:${d.bounds.x}, y:${d.bounds.y}, w:${d.bounds.width}, h:${d.bounds.height}], ScaleFactor: ${d.scaleFactor}`);
        });
        primaryDisplay = screen.getPrimaryDisplay();
    } catch (e) {
        console.error("- Display detection error:", e);
    }

    if (!primaryDisplay) {
        console.error("FATAL: No primary display detected");
        app.quit();
        return;
    }

    const diagDir = path.join(__dirname, '../temp/diagnostics');
    fs.mkdirSync(diagDir, { recursive: true });
    const targetPng = path.join(diagDir, 'screenshot-test.png');
    const rawScreenPng = path.join(diagDir, 'raw-screen.png');
    const cropPng = path.join(diagDir, 'crop-test.png');

    // ==========================================
    // STAGE A: Native Capture (真实物理屏幕像素捕获)
    // ==========================================
    let capturedNativeImg = null;
    let captureFileSize = 0;
    let uniqueColorsCount = 0;
    let nonTransparentRatio = 0;
    let capturedWidth = 0;
    let capturedHeight = 0;

    try {
        const nativeExe = path.join(__dirname, '../resources/bin/wincapture.exe');
        if (!fs.existsSync(nativeExe)) {
            recordResult("Native Capture", false, `Native engine binary not found: ${nativeExe}`);
        } else {
            console.log(`- Running Windows Native Capture Engine: ${nativeExe}`);
            const { execFileSync } = require('node:child_process');
            execFileSync(nativeExe, [targetPng]);
            if (fs.existsSync(targetPng)) {
                captureFileSize = fs.statSync(targetPng).size;
                fs.copyFileSync(targetPng, rawScreenPng);
                capturedNativeImg = nativeImage.createFromPath(targetPng);
                const size = capturedNativeImg.getSize();
                capturedWidth = size.width;
                capturedHeight = size.height;

                // 物理像素真实性检测
                const bitmap = capturedNativeImg.toBitmap();
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

                    const isValid = capturedWidth > 0 && capturedHeight > 0 && captureFileSize > 20000 && nonTransparentRatio === 100 && uniqueColorsCount >= 30;
                    recordResult(
                        "Native Capture",
                        isValid,
                        isValid
                            ? `Real desktop captured: ${capturedWidth}x${capturedHeight}, ${captureFileSize} bytes, ${uniqueColorsCount} colors, 100% opaque`
                            : `Invalid pixel metrics: colors=${uniqueColorsCount}, opaque=${nonTransparentRatio}%`
                    );
                } else {
                    recordResult("Native Capture", false, "Bitmap buffer length mismatch");
                }
            } else {
                recordResult("Native Capture", false, "Target file was not generated");
            }
        }
    } catch (err) {
        recordResult("Native Capture", false, err.message);
    }

    // ==========================================
    // STAGE B: Overlay (覆盖层置顶全屏尺寸与定位)
    // ==========================================
    let overlayPass = false;
    let overlay = null;
    try {
        overlay = new BrowserWindow({
            x: primaryDisplay.bounds.x,
            y: primaryDisplay.bounds.y,
            width: primaryDisplay.bounds.width,
            height: primaryDisplay.bounds.height,
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

        overlay.setBounds(primaryDisplay.bounds);
        overlay.setAlwaysOnTop(true, 'screen-saver');
        overlay.show();
        overlay.focus();

        const isVisible = overlay.isVisible();
        const bounds = overlay.getBounds();
        const isTop = overlay.isAlwaysOnTop();

        const widthMatches = Math.abs(bounds.width - primaryDisplay.bounds.width) <= 2;
        const heightMatches = Math.abs(bounds.height - primaryDisplay.bounds.height) <= 2;
        overlayPass = isVisible && isTop && widthMatches && heightMatches;
        recordResult(
            "Overlay",
            overlayPass,
            overlayPass
                ? `Overlay visible, top-most, logical bounds [${bounds.width}x${bounds.height}] matching display`
                : `Overlay state invalid: visible=${isVisible}, top=${isTop}, bounds=[${bounds.width},${bounds.height}]`
        );
    } catch (e) {
        recordResult("Overlay", false, e.message);
    }

    // ==========================================
    // STAGE C: Image Injection (真实像素与画布DPI注入)
    // ==========================================
    let imageInjectionPass = false;
    try {
        if (capturedNativeImg && !capturedNativeImg.isEmpty()) {
            const sf = primaryDisplay.scaleFactor || 1;
            const expectedPhysicalWidth = Math.round(primaryDisplay.bounds.width * sf);
            const expectedPhysicalHeight = Math.round(primaryDisplay.bounds.height * sf);

            const isSizeMatching = Math.abs(capturedWidth - expectedPhysicalWidth) <= 5 && Math.abs(capturedHeight - expectedPhysicalHeight) <= 5;
            const zoomRatio = 1 / sf;
            imageInjectionPass = isSizeMatching && zoomRatio > 0 && zoomRatio <= 1;

            recordResult(
                "Image Injection",
                imageInjectionPass,
                imageInjectionPass
                    ? `Physical pixel size [${capturedWidth}x${capturedHeight}] mapped with scaleFactor ${sf} (zoom: ${(zoomRatio).toFixed(4)})`
                    : `Size mismatch: captured=[${capturedWidth}x${capturedHeight}] expected=[${expectedPhysicalWidth}x${expectedPhysicalHeight}]`
            );
        } else {
            recordResult("Image Injection", false, "No valid captured image to inject");
        }
    } catch (e) {
        recordResult("Image Injection", false, e.message);
    }

    // ==========================================
    // STAGE D: Mouse Selection (逻辑框选坐标到物理像素坐标转换)
    // ==========================================
    let selectionPass = false;
    let selectedPhysicalRect = null;
    try {
        const sf = primaryDisplay.scaleFactor || 1;
        // 模拟用户从逻辑 (300, 200) 拖选至 (900, 700)
        const logicalSelection = { x1: 300, y1: 200, x2: 900, y2: 700 };
        const logicalW = logicalSelection.x2 - logicalSelection.x1;
        const logicalH = logicalSelection.y2 - logicalSelection.y1;

        const physX = Math.round(logicalSelection.x1 * sf);
        const physY = Math.round(logicalSelection.y1 * sf);
        const physW = Math.round(logicalW * sf);
        const physH = Math.round(logicalH * sf);

        selectedPhysicalRect = { x: physX, y: physY, width: physW, height: physH };

        const inBounds = physX >= 0 && physY >= 0 && (physX + physW) <= capturedWidth && (physY + physH) <= capturedHeight;
        const hasArea = physW > 0 && physH > 0;
        selectionPass = inBounds && hasArea;

        recordResult(
            "Mouse Selection",
            selectionPass,
            selectionPass
                ? `Logical rect [${logicalSelection.x1},${logicalSelection.y1},${logicalW},${logicalH}] mapped to physical [${physX},${physY},${physW},${physH}]`
                : `Selection invalid: physical rect [${physX},${physY},${physW},${physH}] exceeds [${capturedWidth}x${capturedHeight}]`
        );
    } catch (e) {
        recordResult("Mouse Selection", false, e.message);
    }

    // ==========================================
    // STAGE E: Physical Crop (从真实原始物理图像裁剪)
    // ==========================================
    let cropPass = false;
    let croppedImg = null;
    try {
        if (capturedNativeImg && selectedPhysicalRect && selectionPass) {
            croppedImg = capturedNativeImg.crop(selectedPhysicalRect);
            const cropSize = croppedImg.getSize();
            const cropBitmap = croppedImg.toBitmap();

            const isSizeCorrect = cropSize.width === selectedPhysicalRect.width && cropSize.height === selectedPhysicalRect.height;
            const hasData = cropBitmap.length >= cropSize.width * cropSize.height * 4;

            // 检查裁剪后图像像素多样性
            let cropOpaque = 0;
            let cropTotal = 0;
            for (let i = 3; i < Math.min(cropBitmap.length, 1000 * 4); i += 4) {
                cropTotal++;
                if (cropBitmap[i] > 0) cropOpaque++;
            }
            const isOpaque = cropTotal > 0 && cropOpaque === cropTotal;

            cropPass = isSizeCorrect && hasData && isOpaque;
            recordResult(
                "Physical Crop",
                cropPass,
                cropPass
                    ? `Physical crop extracted: ${cropSize.width}x${cropSize.height} pixels, 100% opaque`
                    : `Crop failed: size=[${cropSize.width}x${cropSize.height}], opaque=${cropOpaque}/${cropTotal}`
            );
        } else {
            recordResult("Physical Crop", false, "Prerequisites not met");
        }
    } catch (e) {
        recordResult("Physical Crop", false, e.message);
    }

    // ==========================================
    // STAGE F: Save (物理图像写入磁盘并可重新读取校验)
    // ==========================================
    let savePass = false;
    try {
        if (croppedImg && cropPass) {
            const pngBuf = croppedImg.toPNG();
            fs.writeFileSync(cropPng, pngBuf);
            if (fs.existsSync(cropPng)) {
                const diskSize = fs.statSync(cropPng).size;
                const reloadedImg = nativeImage.createFromPath(cropPng);
                const reloadedSize = reloadedImg.getSize();
                savePass = diskSize > 1000 && reloadedSize.width === selectedPhysicalRect.width && reloadedSize.height === selectedPhysicalRect.height;
                recordResult(
                    "Save",
                    savePass,
                    savePass
                        ? `Saved to ${cropPng} (${diskSize} bytes), verified and reloaded successfully`
                        : `Saved file verification failed: diskSize=${diskSize}`
                );
            } else {
                recordResult("Save", false, "Output file not created");
            }
        } else {
            recordResult("Save", false, "No cropped image available to save");
        }
    } catch (e) {
        recordResult("Save", false, e.message);
    }

    // ==========================================
    // STAGE G: Clipboard (真实物理图像写入系统剪切板并可回读)
    // ==========================================
    let clipboardPass = false;
    try {
        if (croppedImg && cropPass) {
            clipboard.writeImage(croppedImg);
            const readBack = clipboard.readImage();
            const readSize = readBack.getSize();
            clipboardPass = !readBack.isEmpty() && readSize.width === selectedPhysicalRect.width && readSize.height === selectedPhysicalRect.height;
            recordResult(
                "Clipboard",
                clipboardPass,
                clipboardPass
                    ? `Image written to system clipboard, read back verified: ${readSize.width}x${readSize.height}`
                    : `Clipboard verification failed: readSize=[${readSize.width}x${readSize.height}] vs expected=[${selectedPhysicalRect.width}x${selectedPhysicalRect.height}]`
            );
        } else {
            recordResult("Clipboard", false, "No cropped image available for clipboard");
        }
    } catch (e) {
        recordResult("Clipboard", false, e.message);
    }

    if (overlay && !overlay.isDestroyed()) {
        overlay.destroy();
    }

    console.log("==================================================");
    console.log("STAGE SUMMARY:");
    for (const s of stages) {
        console.log(`  [${s.pass ? 'PASS' : 'FAIL'}] ${s.name}`);
    }
    console.log("==================================================");
    if (allPassed) {
        console.log("🎯 SCREENSHOT_DIAGNOSTIC: PASS");
    } else {
        console.log("❌ SCREENSHOT_DIAGNOSTIC: FAIL");
    }
    console.log("==================================================");

    app.quit();
}

app.whenReady().then(runDiagnostic);
