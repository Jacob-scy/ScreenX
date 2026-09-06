import { noI18n } from "dkh-ui";
import { defaultOcrId, loadOCR } from "./ocr";

type ocrResult = {
    text: string;
    box: /** lt,rt,rb,lb */ [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
    ];
}[];

export function ocrOmniLoad(
    store: typeof import("../../../lib/store/renderStore")["default"],
    type: string,
): { ocr: (img: string) => Promise<string[]> } | null {
    const x = loadOCR(store, type);
    if (!x) throw new Error("不支持的 OCR 类型");
    const ocr = x.ocr.init(x.config);
    return {
        ocr: async (img: string) => {
            const res = await (await ocr).ocr(img);
            return res.columns
                .flatMap((c) => c.parragraphs)
                .map((p) => p.parse.text);
        },
    };
}

export function ocrOmni(
    store: typeof import("../../../lib/store/renderStore")["default"],
    type: string,
    arg: string,
    callback: (
        err: Error | null,
        result: { raw: ocrResult; text: string } | null,
    ) => void,
) {
    try {
        const x = loadOCR(store, type);
        if (!x) {
            callback(new Error("未找到离线 OCR 模型配置"), null);
            return;
        }
        const ocr = x.ocr.init(x.config);
        ocr.then(async (instance) => {
            const res = await instance.ocr(arg);
            const lines: string[] = [];
            const raw: ocrResult = [];
            for (const col of res.columns) {
                for (const par of col.parragraphs) {
                    lines.push(par.parse.text);
                    if (par.parse.box) {
                        raw.push({
                            text: par.parse.text,
                            box: par.parse.box as ocrResult[0]["box"],
                        });
                    }
                }
            }
            callback(null, {
                raw,
                text: lines.join("\n"),
            });
        }).catch((err) => {
            callback(err instanceof Error ? err : new Error(String(err)), null);
        });
    } catch (err: unknown) {
        callback(err instanceof Error ? err : new Error(String(err)), null);
    }
}

export function ocrList(
    store: typeof import("../../../lib/store/renderStore")["default"],
) {
    return store.get("离线OCR").map((i) => ({
        value: i.id,
        name: i.id === defaultOcrId ? i.name : noI18n(i.name),
    }));
}
