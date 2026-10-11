const { app, BrowserWindow, nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function createIco(pngBuffers) {
    const count = pngBuffers.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);

    const dirEntrySize = 16;
    const dirSize = count * dirEntrySize;
    let offset = 6 + dirSize;

    const entries = [];
    const images = [];

    for (const item of pngBuffers) {
        const entry = Buffer.alloc(dirEntrySize);
        entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0);
        entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1);
        entry.writeUInt8(0, 2);
        entry.writeUInt8(0, 3);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(item.buffer.length, 8);
        entry.writeUInt32LE(offset, 12);

        entries.push(entry);
        images.push(item.buffer);
        offset += item.buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images]);
}

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1024,
        height: 1024,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    const html = `<!DOCTYPE html>
<html>
<body>
<canvas id="c"></canvas>
<script>
function drawLogo(size) {
    const canvas = document.getElementById("c");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    const scale = size / 1024;

    // 1. 深蓝科技渐变圆角底座
    const cornerRadius = 220 * scale;
    const x = 32 * scale;
    const y = 32 * scale;
    const w = 960 * scale;
    const h = 960 * scale;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + w - cornerRadius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + cornerRadius);
    ctx.lineTo(x + w, y + h - cornerRadius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - cornerRadius, y + h);
    ctx.lineTo(x + cornerRadius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    ctx.clip();

    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, "#090D16");
    bgGrad.addColorStop(0.45, "#0F172A");
    bgGrad.addColorStop(1, "#0284C7");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // 柔和高光
    const glowGrad = ctx.createRadialGradient(size * 0.35, size * 0.35, 20 * scale, size * 0.35, size * 0.35, 550 * scale);
    glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.40)");
    glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    // 2. 精准屏幕裁切取景框 (Crop Corners)
    const p = 175 * scale;
    const cLen = 135 * scale;
    const cThick = 34 * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = cThick;

    // 左上
    ctx.beginPath();
    ctx.moveTo(p, p + cLen);
    ctx.lineTo(p, p);
    ctx.lineTo(p + cLen, p);
    ctx.stroke();

    // 右上
    ctx.beginPath();
    ctx.moveTo(size - p - cLen, p);
    ctx.lineTo(size - p, p);
    ctx.lineTo(size - p, p + cLen);
    ctx.stroke();

    // 左下
    ctx.beginPath();
    ctx.moveTo(p, size - p - cLen);
    ctx.lineTo(p, size - p);
    ctx.lineTo(p + cLen, size - p);
    ctx.stroke();

    // 右下
    ctx.beginPath();
    ctx.moveTo(size - p - cLen, size - p);
    ctx.lineTo(size - p, size - p);
    ctx.lineTo(size - p, size - p - cLen);
    ctx.stroke();

    // 3. 核心 "S" 几何图形与光芒
    ctx.save();
    const sStrokeWidth = 70 * scale;
    const sGrad = ctx.createLinearGradient(size * 0.28, size * 0.28, size * 0.72, size * 0.72);
    sGrad.addColorStop(0, "#38BDF8");
    sGrad.addColorStop(0.5, "#60A5FA");
    sGrad.addColorStop(1, "#A78BFA");

    ctx.strokeStyle = sGrad;
    ctx.lineWidth = sStrokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(size * 0.63, size * 0.36);
    ctx.bezierCurveTo(size * 0.63, size * 0.28, size * 0.37, size * 0.28, size * 0.37, size * 0.42);
    ctx.bezierCurveTo(size * 0.37, size * 0.54, size * 0.63, size * 0.50, size * 0.63, size * 0.64);
    ctx.bezierCurveTo(size * 0.63, size * 0.76, size * 0.35, size * 0.76, size * 0.35, size * 0.68);
    ctx.stroke();

    // S 中心透光十字标心
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "#38BDF8";
    ctx.shadowBlur = 18 * scale;
    ctx.beginPath();
    ctx.arc(size * 0.50, size * 0.53, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    return canvas.toDataURL("image/png");
}

function drawMono(color) {
    const canvas = document.getElementById("c");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 32, 32);

    const strokeColor = color === "white" ? "#FFFFFF" : "#000000";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";

    // 托盘角标
    ctx.beginPath();
    ctx.moveTo(4, 9); ctx.lineTo(4, 4); ctx.lineTo(9, 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(28, 23); ctx.lineTo(28, 28); ctx.lineTo(23, 28);
    ctx.stroke();

    // 托盘中心 S
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(20, 11);
    ctx.bezierCurveTo(20, 8, 12, 8, 12, 13);
    ctx.bezierCurveTo(12, 18, 20, 16, 20, 21);
    ctx.bezierCurveTo(20, 25, 12, 25, 12, 22);
    ctx.stroke();

    return canvas.toDataURL("image/png");
}
</script>
</body>
</html>`;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const targetDir = path.join(__dirname, "../assets/logo");
    const sizes = [1024, 512, 256, 128, 64, 48, 32, 16];
    const icoBuffers = [];

    for (const s of sizes) {
        const dataUrl = await win.webContents.executeJavaScript(`drawLogo(${s})`);
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        const buf = Buffer.from(base64Data, "base64");
        fs.writeFileSync(path.join(targetDir, `${s}x${s}.png`), buf);
        console.log(`Generated ${s}x${s}.png`);
        if ([256, 128, 64, 48, 32, 16].includes(s)) {
            icoBuffers.push({ size: s, buffer: buf });
        }
    }

    // 生成 icon.ico
    const icoBuf = createIco(icoBuffers);
    fs.writeFileSync(path.join(targetDir, "icon.ico"), icoBuf);
    console.log("Generated icon.ico");

    // 生成 bw
    const bwDir = path.join(targetDir, "bw");
    for (const color of ["white", "black"]) {
        const dataUrl = await win.webContents.executeJavaScript(`drawMono("${color}")`);
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        const buf = Buffer.from(base64Data, "base64");
        fs.writeFileSync(path.join(bwDir, `32x32_${color}.png`), buf);
        console.log(`Generated bw/32x32_${color}.png`);
    }

    win.close();
    app.quit();
});
