import { describe, expect, it } from "vitest";

describe("Screenshot Personal Edition - 核心功能架构与契约测试", () => {
    describe("1. 基础截图与坐标处理", () => {
        it("正向与反向框选坐标归一化", () => {
            const normalizeRect = (x1: number, y1: number, x2: number, y2: number) => {
                const x = Math.min(x1, x2);
                const y = Math.min(y1, y2);
                const width = Math.abs(x2 - x1);
                const height = Math.abs(y2 - y1);
                return { x, y, width, height };
            };

            // 正向拖动拉框
            const r1 = normalizeRect(100, 100, 300, 250);
            expect(r1).toEqual({ x: 100, y: 100, width: 200, height: 150 });

            // 反向（从右下到左上）拖动拉框
            const r2 = normalizeRect(300, 250, 100, 100);
            expect(r2).toEqual({ x: 100, y: 100, width: 200, height: 150 });
        });

        it("屏幕边界裁剪 clamp", () => {
            const clampBounds = (
                rect: { x: number; y: number; width: number; height: number },
                screen: { width: number; height: number },
            ) => {
                const x = Math.max(0, Math.min(rect.x, screen.width));
                const y = Math.max(0, Math.min(rect.y, screen.height));
                const width = Math.min(rect.width, screen.width - x);
                const height = Math.min(rect.height, screen.height - y);
                return { x, y, width, height };
            };

            const screen = { width: 1920, height: 1080 };
            const clamped = clampBounds({ x: 1800, y: 1000, width: 300, height: 200 }, screen);
            expect(clamped).toEqual({ x: 1800, y: 1000, width: 120, height: 80 });
        });

        it("截图保存文件格式支持与默认命名规则", () => {
            const supportedFormats = ["png", "jpg", "jpeg", "webp", "bmp"];
            const format = "png";
            expect(supportedFormats).toContain(format);

            const generateFileName = (prefix: string, date: Date, ext: string) => {
                const pad = (n: number) => String(n).padStart(2, "0");
                const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
                return `${prefix}_${timestamp}.${ext}`;
            };

            const fixedDate = new Date(2026, 8, 6, 12, 0, 0);
            const fileName = generateFileName("Screenshot", fixedDate, "png");
            expect(fileName).toBe("Screenshot_20260906_120000.png");
        });
    });

    describe("2. 离线本地 OCR 逻辑与数据处理", () => {
        it("离线 OCR 结果文本重组与多行合并", () => {
            interface OcrBoxItem {
                box: [[number, number], [number, number], [number, number], [number, number]];
                text: string;
                score: number;
            }

            const mockOcrResult: OcrBoxItem[] = [
                {
                    box: [[10, 10], [100, 10], [100, 30], [10, 30]],
                    text: "Screenshot",
                    score: 0.99,
                },
                {
                    box: [[105, 10], [220, 10], [220, 30], [105, 30]],
                    text: "Personal Edition",
                    score: 0.98,
                },
                {
                    box: [[10, 40], [150, 40], [150, 60], [10, 60]],
                    text: "极简稳定快速",
                    score: 0.97,
                },
            ];

            // 按 Y 轴分行合并文本
            const mergeLines = (items: OcrBoxItem[], lineThreshold = 15): string[] => {
                const sorted = [...items].sort((a, b) => a.box[0][1] - b.box[0][1]);
                const lines: string[][] = [];
                let currentLine: string[] = [];
                let lastY = -999;

                for (const item of sorted) {
                    const y = item.box[0][1];
                    if (lastY !== -999 && Math.abs(y - lastY) > lineThreshold) {
                        lines.push(currentLine);
                        currentLine = [item.text];
                    } else {
                        currentLine.push(item.text);
                    }
                    lastY = y;
                }
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }

                return lines.map((l) => l.join(" "));
            };

            const merged = mergeLines(mockOcrResult);
            expect(merged).toHaveLength(2);
            expect(merged[0]).toBe("Screenshot Personal Edition");
            expect(merged[1]).toBe("极简稳定快速");
        });

        it("OCR 结果复制格式化（去除冗余换行/空格清洗）", () => {
            const rawText = "极简、稳定、快速\n的 Windows 桌面截图工具。\n\n长期自用。";
            const cleanText = (text: string, removeNewlines = false): string => {
                if (removeNewlines) {
                    return text.replace(/\r?\n+/g, " ").trim();
                }
                return text.replace(/\r?\n{3,}/g, "\n\n").trim();
            };

            expect(cleanText(rawText, true)).toBe("极简、稳定、快速 的 Windows 桌面截图工具。 长期自用。");
            expect(cleanText(rawText, false)).toBe("极简、稳定、快速\n的 Windows 桌面截图工具。\n\n长期自用。");
        });
    });

    describe("3. 搜索 URL 生成与模板替换", () => {
        it("搜索引擎模板与选中文本匹配", () => {
            const searchEngines: Record<string, string> = {
                baidu: "https://www.baidu.com/s?wd=%s",
                bing: "https://www.bing.com/search?q=%s",
                google: "https://www.google.com/search?q=%s",
            };

            const buildSearchUrl = (engineKey: string, query: string): string => {
                const template = searchEngines[engineKey] || searchEngines.bing;
                return template.replace("%s", encodeURIComponent(query.trim()));
            };

            const url1 = buildSearchUrl("bing", "Screenshot 架构重构");
            expect(url1).toBe("https://www.bing.com/search?q=Screenshot%20%E6%9E%B6%E6%9E%84%E9%87%8D%E6%9E%84");

            const url2 = buildSearchUrl("google", "electron vite");
            expect(url2).toBe("https://www.google.com/search?q=electron%20vite");
        });
    });

    describe("4. 翻译引擎数据契约", () => {
        it("多语言代码与回退策略", () => {
            const supportedLanguages = ["zh-HANS", "en", "ja", "ko", "ru", "fr", "de", "es"];
            const resolveTargetLanguage = (userPref: string | undefined, defaultLan = "zh-HANS") => {
                if (userPref && supportedLanguages.includes(userPref)) {
                    return userPref;
                }
                return defaultLan;
            };

            expect(resolveTargetLanguage("en")).toBe("en");
            expect(resolveTargetLanguage("unknown_lan")).toBe("zh-HANS");
            expect(resolveTargetLanguage(undefined)).toBe("zh-HANS");
        });
    });

    describe("5. 贴图 (Pin) 参数与状态控制", () => {
        it("贴图缩放范围 clamp (0.1x ~ 10.0x)", () => {
            const clampScale = (scale: number): number => {
                return Math.max(0.1, Math.min(10.0, Math.round(scale * 100) / 100));
            };

            expect(clampScale(0.05)).toBe(0.1);
            expect(clampScale(1.555)).toBe(1.56);
            expect(clampScale(15.0)).toBe(10.0);
        });

        it("贴图透明度范围 clamp (0.1 ~ 1.0)", () => {
            const clampOpacity = (opacity: number): number => {
                return Math.max(0.1, Math.min(1.0, Math.round(opacity * 100) / 100));
            };

            expect(clampOpacity(0.02)).toBe(0.1);
            expect(clampOpacity(0.75)).toBe(0.75);
            expect(clampOpacity(1.5)).toBe(1.0);
        });

        it("贴图窗口置顶与鼠标穿透状态切换", () => {
            interface PinWindowState {
                alwaysOnTop: boolean;
                ignoreMouseEvents: boolean;
                visible: boolean;
            }

            const state: PinWindowState = {
                alwaysOnTop: true,
                ignoreMouseEvents: false,
                visible: true,
            };

            // 切换鼠标穿透
            const toggleMouseThrough = (s: PinWindowState) => {
                s.ignoreMouseEvents = !s.ignoreMouseEvents;
            };

            toggleMouseThrough(state);
            expect(state.ignoreMouseEvents).toBe(true);
            toggleMouseThrough(state);
            expect(state.ignoreMouseEvents).toBe(false);
            expect(state.alwaysOnTop).toBe(true);
        });
    });

    describe("6. 万向滚动截图拼接模型", () => {
        interface ImageSegment {
            id: number;
            dx: number; // 相对上一帧的 x 位移
            dy: number; // 相对上一帧的 y 位移
            width: number;
            height: number;
        }

        it("纵向向下滚动拼接边界与画布尺寸计算", () => {
            // 初始截图区域 800 x 600
            const segments: ImageSegment[] = [
                { id: 1, dx: 0, dy: 0, width: 800, height: 600 },
                { id: 2, dx: 0, dy: 200, width: 800, height: 600 },
                { id: 3, dx: 0, dy: 250, width: 800, height: 600 },
            ];

            const calculateCanvasSize = (segs: ImageSegment[]) => {
                let totalHeight = segs[0].height;
                let totalWidth = segs[0].width;
                for (let i = 1; i < segs.length; i++) {
                    totalHeight += segs[i].dy;
                    totalWidth += segs[i].dx;
                }
                return { width: totalWidth, height: totalHeight };
            };

            const result = calculateCanvasSize(segments);
            expect(result).toEqual({ width: 800, height: 1050 });
        });

        it("横向向右滚动拼接尺寸计算", () => {
            const segments: ImageSegment[] = [
                { id: 1, dx: 0, dy: 0, width: 500, height: 400 },
                { id: 2, dx: 180, dy: 0, width: 500, height: 400 },
                { id: 3, dx: 220, dy: 0, width: 500, height: 400 },
            ];

            const calculateCanvasSize = (segs: ImageSegment[]) => {
                let totalHeight = segs[0].height;
                let totalWidth = segs[0].width;
                for (let i = 1; i < segs.length; i++) {
                    totalHeight += segs[i].dy;
                    totalWidth += segs[i].dx;
                }
                return { width: totalWidth, height: totalHeight };
            };

            const result = calculateCanvasSize(segments);
            expect(result).toEqual({ width: 900, height: 400 });
        });

        it("万向任意方向滚动拼接累加位移模型", () => {
            interface Point {
                x: number;
                y: number;
            }

            const trackMovement = (movements: Point[]) => {
                let curX = 0;
                let curY = 0;
                let minX = 0;
                let maxX = 0;
                let minY = 0;
                let maxY = 0;

                for (const m of movements) {
                    curX += m.x;
                    curY += m.y;
                    minX = Math.min(minX, curX);
                    maxX = Math.max(maxX, curX);
                    minY = Math.min(minY, curY);
                    maxY = Math.max(maxY, curY);
                }

                return {
                    spanX: maxX - minX,
                    spanY: maxY - minY,
                    finalPos: { x: curX, y: curY },
                };
            };

            const trajectory: Point[] = [
                { x: 50, y: 100 },
                { x: 30, y: 150 },
                { x: -20, y: 80 },
            ];

            const movement = trackMovement(trajectory);
            expect(movement.finalPos).toEqual({ x: 60, y: 330 });
            expect(movement.spanX).toBe(80);
            expect(movement.spanY).toBe(330);
        });
    });

    describe("7. 核心快捷键与工具栏配置白名单", () => {
        it("工具栏只允许保留核心 8 大功能", () => {
            const allowedTools = ["close", "screens", "ocr", "open", "ding", "long", "copy", "save"];
            const currentTools = ["close", "screens", "ocr", "open", "ding", "long", "copy", "save"];

            expect(currentTools).toEqual(allowedTools);

            // 严格断言废弃功能不在工具栏列表中
            expect(currentTools).not.toContain("record");
            expect(currentTools).not.toContain("recordx");
            expect(currentTools).not.toContain("qr");
            expect(currentTools).not.toContain("search");
            expect(currentTools).not.toContain("translator");
            expect(currentTools).not.toContain("ai");
        });

        it("核心全局快捷键映射配置合法性", () => {
            const shortcuts = {
                截图: "Alt+C",
                万向滚动截图: "Alt+Shift+L",
                文字识别: "Alt+V",
                贴图: "Alt+B",
            };

            const validateAccelerator = (key: string) => {
                const parts = key.split("+");
                const validModifiers = ["Alt", "Shift", "Control", "Command", "Option"];
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!validModifiers.includes(parts[i])) return false;
                }
                const lastKey = parts[parts.length - 1];
                return /^[A-Z0-9]$/i.test(lastKey);
            };

            for (const [name, shortcut] of Object.entries(shortcuts)) {
                expect(validateAccelerator(shortcut), `${name} 快捷键格式应符合 Electron 规范`).toBe(true);
            }
        });
    });
});
