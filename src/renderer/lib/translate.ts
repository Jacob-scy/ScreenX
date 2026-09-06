import xtranslator from "xtranslator";
import type { setting } from "../../ShareTypes";

export function loadTranslator(
    store: typeof import("../../../lib/store/renderStore")["default"],
) {
    const transE = store.get("翻译.翻译器");

    if (transE.length > 0) {
        const x = transE[0];
        const e = getTranslators(store, x);
        if (e) {
            const targetLan =
                (store.get(
                    "语言.语言",
                ) as (typeof xtranslator.languages.normal)[number]) ||
                "zh-HANS";
            return (input: string[]) => e.run(input, "auto", targetLan);
        }
    }
}

export function getTranslators(
    store: typeof import("../../../lib/store/renderStore")["default"],
    settingItem: setting["翻译"]["翻译器"][0],
): InstanceType<(typeof xtranslator)["Translator"]> | undefined {
    const e = xtranslator.es[settingItem.type]?.();
    if (e) {
        // @ts-ignore
        e.setKeys(settingItem.keys);
        return e;
    }
    return undefined;
}
