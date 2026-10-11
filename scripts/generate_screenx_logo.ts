import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

function createIco(pngBuffers: { size: number; buffer: Buffer }[]): Buffer {
    // ICO Header: 6 bytes
    // 2 bytes reserved (0)
    // 2 bytes type (1 for ICO)
    // 2 bytes count (number of images)
    const count = pngBuffers.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);

    const dirEntrySize = 16;
    const dirSize = count * dirEntrySize;
    let offset = 6 + dirSize;

    const entries: Buffer[] = [];
    const images: Buffer[] = [];

    for (const item of pngBuffers) {
        const entry = Buffer.alloc(dirEntrySize);
        // width & height: 1 byte each (0 means 256)
        entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0);
        entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1);
        entry.writeUInt8(0, 2); // color count
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // color planes
        entry.writeUInt16LE(32, 6); // bpp
        entry.writeUInt32LE(item.buffer.length, 8); // image size
        entry.writeUInt32LE(offset, 12); // image offset

        entries.push(entry);
        images.push(item.buffer);
        offset += item.buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images]);
}

function drawScreenXLogo(size: number): Buffer {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, size, size);

    const scale = size / 1024;

    // 1. 背景圆角矩形 - 深邃深蓝至科技蓝渐变
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
    bgGrad.addColorStop(0, "#0F172A"); // Slate 900
    bgGrad.addColorStop(0.5, "#1E293B"); // Slate 800
    bgGrad.addColorStop(1, "#0284C7"); // Sky 600
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // 微妙的光泽背景网格或光晕
    const glowGrad = ctx.createRadialGradient(size * 0.3, size * 0.3, 10 * scale, size * 0.3, size * 0.3, 500 * scale);
    glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)"); // Sky 400
    glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    // 2. 屏幕截取/裁剪框标记 (Screen Crop Corners)
    const cropPadding = 180 * scale;
    const cropCornerLen = 140 * scale;
    const cropThickness = 36 * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = cropThickness;

    // 左上角
    ctx.beginPath();
    ctx.moveTo(cropPadding, cropPadding + cropCornerLen);
    ctx.lineTo(cropPadding, cropPadding);
    ctx.lineTo(cropPadding + cropCornerLen, cropPadding);
    ctx.stroke();

    // 右上角
    ctx.beginPath();
    ctx.moveTo(size - cropPadding - cropCornerLen, cropPadding);
    ctx.lineTo(size - cropPadding, cropPadding);
    ctx.lineTo(size - cropPadding, cropPadding + cropCornerLen);
    ctx.stroke();

    // 左下角
    ctx.beginPath();
    ctx.moveTo(cropPadding, size - cropPadding - cropCornerLen);
    ctx.lineTo(cropPadding, size - cropPadding);
    ctx.lineTo(cropPadding + cropCornerLen, size - cropPadding);
    ctx.stroke();

    // 右下角
    ctx.beginPath();
    ctx.moveTo(size - cropPadding - cropCornerLen, size - cropPadding);
    ctx.lineTo(size - cropPadding, size - cropPadding);
    ctx.lineTo(size - cropPadding, size - cropPadding - cropCornerLen);
    ctx.stroke();

    // 3. 核心 "S" 字母造型：流畅、利落，融合截取与光刃质感
    ctx.save();
    const sStrokeWidth = 72 * scale;
    const sGrad = ctx.createLinearGradient(size * 0.25, size * 0.25, size * 0.75, size * 0.75);
    sGrad.addColorStop(0, "#38BDF8"); // Sky 400
    sGrad.addColorStop(0.5, "#60A5FA"); // Blue 400
    sGrad.addColorStop(1, "#818CF8"); // Indigo 400

    ctx.strokeStyle = sGrad;
    ctx.lineWidth = sStrokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 绘制 S 曲线
    ctx.beginPath();
    // 顶点起点向左弯曲
    ctx.moveTo(size * 0.64, size * 0.36);
    ctx.bezierCurveTo(size * 0.64, size * 0.28, size * 0.38, size * 0.28, size * 0.38, size * 0.42);
    ctx.bezierCurveTo(size * 0.38, size * 0.54, size * 0.64, size * 0.50, size * 0.64, size * 0.64);
    ctx.bezierCurveTo(size * 0.64, size * 0.76, size * 0.36, size * 0.76, size * 0.36, size * 0.68);
    ctx.stroke();

    // S 中心焦点透光小亮点 (代表 Precision Capture 点)
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "#38BDF8";
    ctx.shadowBlur = 20 * scale;
    ctx.beginPath();
    ctx.arc(size * 0.51, size * 0.52, 16 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    return canvas.toBuffer("image/png");
}

function generateAll() {
    const targetDir = join(__dirname, "../assets/logo");
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

    const sizes = [1024, 512, 256, 128, 64, 48, 32, 16];
    const icoBuffers: { size: number; buffer: Buffer }[] = [];

    for (const s of sizes) {
        const buf = drawScreenXLogo(s);
        const fileName = `${s}x${s}.png`;
        writeFileSync(join(targetDir, fileName), buf);
        console.log(`Generated ${fileName}`);

        if ([256, 128, 64, 48, 32, 16].includes(s)) {
            icoBuffers.push({ size: s, buffer: buf });
        }
    }

    // 生成 icon.ico
    const icoBuf = createIco(icoBuffers);
    writeFileSync(join(targetDir, "icon.ico"), icoBuf);
    console.log("Generated icon.ico");

    // 生成 bw 黑白托盘图标
    const bwDir = join(targetDir, "bw");
    if (!existsSync(bwDir)) mkdirSync(bwDir, { recursive: true });

    // 绘制 32x32 单色白色与黑色托盘图标 (简洁 S + 边角)
    for (const color of ["white", "black"]) {
        const cCanvas = createCanvas(32, 32);
        const cCtx = cCanvas.getContext("2d");
        const strokeColor = color === "white" ? "#FFFFFF" : "#000000";
        cCtx.strokeStyle = strokeColor;
        cCtx.lineWidth = 2.5;
        cCtx.lineCap = "round";

        // 简化版取景框角标
        // 左上
        cCtx.beginPath();
        cCtx.moveTo(4, 9);
        cCtx.lineTo(4, 4);
        cCtx.lineTo(9, 4);
        cCtx.stroke();
        // 右下
        cCtx.beginPath();
        cCtx.moveTo(28, 23);
        cCtx.lineTo(28, 28);
        cCtx.lineTo(23, 28);
        cCtx.stroke();

        // 简化 S
        cCtx.lineWidth = 3;
        cCtx.beginPath();
        cCtx.moveTo(20, 11);
        cCtx.bezierCurveTo(20, 8, 11, 8, 11, 13);
        cCtx.bezierCurveTo(11, 18, 21, 16, 21, 21);
        cCtx.bezierCurveTo(21, 25, 11, 25, 11, 22);
        cCtx.stroke();

        writeFileSync(join(bwDir, `32x32_${color}.png`), cCanvas.toBuffer("image/png"));
        console.log(`Generated bw/32x32_${color}.png`);
    }
}

generateAll();
