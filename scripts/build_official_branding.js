const { app, BrowserWindow, nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function createIco(pngBuffers) {
    const count = pngBuffers.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // 1 = ICO
    header.writeUInt16LE(count, 4); // Number of images

    const dirEntrySize = 16;
    const dirSize = count * dirEntrySize;
    let offset = 6 + dirSize;

    const entries = [];
    const images = [];

    for (const item of pngBuffers) {
        const entry = Buffer.alloc(dirEntrySize);
        entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0);
        entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1);
        entry.writeUInt8(0, 2); // Palette
        entry.writeUInt8(0, 3); // Reserved
        entry.writeUInt16LE(1, 4); // Planes
        entry.writeUInt16LE(32, 6); // Bits per pixel
        entry.writeUInt32LE(item.buffer.length, 8); // Size
        entry.writeUInt32LE(offset, 12); // Offset

        entries.push(entry);
        images.push(item.buffer);
        offset += item.buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images]);
}

app.whenReady().then(async () => {
    try {
        console.log(">>> [1/5] 读取官方 ScreenX.png 源文件...");
        const srcPath = path.resolve("assets/branding/ScreenX.png");
        if (!fs.existsSync(srcPath)) {
            throw new Error(`找不到品牌源文件: ${srcPath}`);
        }

        const baseImg = nativeImage.createFromPath(srcPath);
        const baseSize = baseImg.getSize();
        console.log(`    源文件尺寸: ${baseSize.width}x${baseSize.height}`);

        console.log(">>> [2/5] 生成多尺寸 PNG 图像资源...");
        const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
        const pngMap = {};

        for (const s of sizes) {
            const resized = baseImg.resize({ width: s, height: s, quality: "best" });
            const buf = resized.toPNG();
            pngMap[s] = buf;
            console.log(`    生成尺寸: ${s}x${s}, 字节数: ${buf.length}`);
        }

        console.log(">>> [3/5] 构建标准 Windows ICO (包含 16, 24, 32, 48, 64, 128, 256)...");
        const icoSizes = [16, 24, 32, 48, 64, 128, 256];
        const icoBuffers = icoSizes.map((s) => ({ size: s, buffer: pngMap[s] }));
        const icoData = createIco(icoBuffers);
        console.log(`    ICO 数据总大小: ${icoData.length} 字节`);

        // 写入 assets/branding
        const brandingDir = path.resolve("assets/branding");
        fs.mkdirSync(brandingDir, { recursive: true });
        fs.writeFileSync(path.join(brandingDir, "ScreenX.ico"), icoData);
        for (const s of sizes) {
            fs.writeFileSync(path.join(brandingDir, `ScreenX-${s}x${s}.png`), pngMap[s]);
        }
        console.log("    已更新 assets/branding/ScreenX.ico 及全尺寸 PNG");

        // 写入 assets/logo (兼容主进程与 electron-builder 现有路径)
        const logoDir = path.resolve("assets/logo");
        fs.mkdirSync(logoDir, { recursive: true });
        fs.writeFileSync(path.join(logoDir, "icon.ico"), icoData);
        for (const s of sizes) {
            fs.writeFileSync(path.join(logoDir, `${s}x${s}.png`), pngMap[s]);
        }

        // 黑白托盘图标 (以 32x32 生成)
        const bwDir = path.join(logoDir, "bw");
        fs.mkdirSync(bwDir, { recursive: true });
        fs.writeFileSync(path.join(bwDir, "32x32_white.png"), pngMap[32]);
        fs.writeFileSync(path.join(bwDir, "32x32_black.png"), pngMap[32]);
        fs.writeFileSync(path.join(bwDir, "macIconTemplate.png"), pngMap[32]);
        console.log("    已同步更新 assets/logo/ 全部资源 (icon.ico, 尺寸图, 托盘图)");

        console.log(">>> [4/5] 渲染 1200x630 OpenGraph 社交卡片 (ScreenX-og.png)...");
        const win = new BrowserWindow({
            width: 1200,
            height: 630,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        // 将 512x512 PNG 转换为 base64 嵌入 HTML
        const logoBase64 = pngMap[512].toString("base64");
        const logoDataUrl = `data:image/png;base64,${logoBase64}`;

        const ogHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: radial-gradient(circle at 25% 45%, #132247 0%, #060913 70%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif;
    color: #fff;
    display: flex;
    align-items: center;
    padding: 0 80px;
    overflow: hidden;
    position: relative;
  }
  .glow {
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0) 70%);
    top: 15px;
    left: 20px;
    pointer-events: none;
  }
  .logo-box {
    flex-shrink: 0;
    width: 380px;
    height: 380px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 2;
    filter: drop-shadow(0 20px 35px rgba(0, 0, 0, 0.65));
  }
  .logo-box img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .content {
    margin-left: 65px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .badge {
    align-self: flex-start;
    padding: 6px 16px;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.35);
    border-radius: 999px;
    color: #38bdf8;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 20px;
  }
  h1 {
    font-size: 72px;
    font-weight: 800;
    letter-spacing: -1px;
    background: linear-gradient(135deg, #ffffff 30%, #38bdf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  p.desc {
    font-size: 24px;
    color: #94a3b8;
    line-height: 1.4;
    margin-bottom: 28px;
    max-width: 600px;
  }
  .tags {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .tag {
    padding: 8px 18px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    font-size: 16px;
    color: #e2e8f0;
  }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="logo-box">
    <img src="${logoDataUrl}">
  </div>
  <div class="content">
    <div class="badge">Official Release · Windows 10/11</div>
    <h1>ScreenX</h1>
    <p class="desc">轻量、现代的 Windows 桌面截图与效率利器</p>
    <div class="tags">
      <div class="tag">⚡ 原生物理抓屏</div>
      <div class="tag">🧠 离线 OCR</div>
      <div class="tag">🔍 聚合搜索</div>
      <div class="tag">🌐 划词翻译</div>
      <div class="tag">📌 桌面贴图</div>
    </div>
  </div>
</body>
</html>`;

        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(ogHtml)}`);
        // 等待渲染稳定
        await new Promise((r) => setTimeout(r, 600));

        const ogNative = await win.webContents.capturePage({ x: 0, y: 0, width: 1200, height: 630 });
        const ogBuf = ogNative.toPNG();
        fs.writeFileSync(path.join(brandingDir, "ScreenX-og.png"), ogBuf);
        console.log(`    已生成 assets/branding/ScreenX-og.png (${ogBuf.length} 字节)`);
        win.close();

        console.log(">>> [5/5] 更新 release-site/assets 网站资源...");
        const siteAssetsDir = path.resolve("release-site/assets");
        fs.mkdirSync(siteAssetsDir, { recursive: true });
        fs.writeFileSync(path.join(siteAssetsDir, "favicon.ico"), icoData);
        fs.writeFileSync(path.join(siteAssetsDir, "favicon-32x32.png"), pngMap[32]);
        fs.writeFileSync(path.join(siteAssetsDir, "favicon-192x192.png"), pngMap[192] || pngMap[256]);
        fs.writeFileSync(path.join(siteAssetsDir, "apple-touch-icon.png"), pngMap[128] || pngMap[256]);
        fs.writeFileSync(path.join(siteAssetsDir, "ScreenX-og.png"), ogBuf);
        fs.writeFileSync(path.join(siteAssetsDir, "og-image.png"), ogBuf);
        fs.writeFileSync(path.join(siteAssetsDir, "screenx-icon.png"), pngMap[256]);
        fs.writeFileSync(path.join(siteAssetsDir, "ScreenX.png"), pngMap[512]);

        console.log("=== 官方品牌 ICON 资源生成与同步全部成功 ===");
        app.quit();
    } catch (err) {
        console.error("生成品牌资源异常:", err);
        process.exit(1);
    }
});
