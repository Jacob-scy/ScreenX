import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// 注：lib/ipc.ts 以 CJS require("electron") 注册分发器，vitest 的 vi.mock
// 不拦截 require 路径，故通过 createIpcMainHandler() 工厂直接驱动同一份
// 分发逻辑（模块加载时 ipcMain 为 undefined，注册被可选链跳过，不影响测试）。
import {
    createIpcMainHandler,
    isTrustedIpcSender,
    mainOn,
    storeIpcArgsSchema,
    storeIpcSchema,
} from "../lib/ipc";

const handleIpc = createIpcMainHandler();

type FakeEvent = {
    sender: { getURL?: () => string };
    senderFrame: { url: string };
    returnValue: unknown;
};

function makeEvent(
    pageUrl: string,
    opts: { frameUrl?: string; noGetUrl?: boolean } = {},
): Electron.IpcMainEvent {
    const event: FakeEvent = {
        sender: {
            getURL: opts.noGetUrl ? undefined : () => pageUrl,
        },
        senderFrame: { url: opts.frameUrl ?? "" },
        returnValue: undefined,
    };
    return event as unknown as Electron.IpcMainEvent;
}

async function dispatch(
    event: Electron.IpcMainEvent,
    key: string,
    data: unknown,
): Promise<void> {
    await handleIpc(event, key, data);
}

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("isTrustedIpcSender - 可信来源", () => {
    it("放行 file: 协议（生产包 loadFile 页面）", () => {
        expect(
            isTrustedIpcSender(
                makeEvent("file:///D:/ScreenX/out/renderer/editor.html"),
            ),
        ).toBe(true);
    });

    it("放行 dev server http://localhost:5173", () => {
        expect(
            isTrustedIpcSender(makeEvent("http://localhost:5173/editor.html")),
        ).toBe(true);
    });

    it("放行 dev server http://127.0.0.1:5173", () => {
        expect(
            isTrustedIpcSender(makeEvent("http://127.0.0.1:5173/clip.html")),
        ).toBe(true);
    });

    it("放行 https://localhost", () => {
        expect(isTrustedIpcSender(makeEvent("https://localhost/"))).toBe(true);
    });
});

describe("isTrustedIpcSender - 不可信来源", () => {
    it("拒绝 http://evil.com", () => {
        expect(isTrustedIpcSender(makeEvent("http://evil.com/"))).toBe(false);
    });

    it("拒绝 https://evil.com/path", () => {
        expect(isTrustedIpcSender(makeEvent("https://evil.com/path"))).toBe(
            false,
        );
    });

    it("拒绝 http://localhost.evil.com（hostname 精确匹配）", () => {
        expect(
            isTrustedIpcSender(makeEvent("http://localhost.evil.com/")),
        ).toBe(false);
    });

    it("拒绝自定义协议 app://index", () => {
        expect(isTrustedIpcSender(makeEvent("app://index"))).toBe(false);
    });

    it("拒绝 javascript: 协议", () => {
        expect(isTrustedIpcSender(makeEvent("javascript:alert(1)"))).toBe(false);
    });

    it("拒绝无法解析的 URL", () => {
        expect(isTrustedIpcSender(makeEvent("not a url"))).toBe(false);
    });

    it("拒绝空 URL", () => {
        expect(isTrustedIpcSender(makeEvent(""))).toBe(false);
    });
});

describe("isTrustedIpcSender - senderFrame 兜底（Electron 43 已废弃，仅兜底）", () => {
    it("getURL 抛异常时回退 senderFrame.url（file:）", () => {
        expect(
            isTrustedIpcSender(
                makeEvent("", {
                    noGetUrl: true,
                    frameUrl: "file:///app/index.html",
                }),
            ),
        ).toBe(true);
    });

    it("getURL 返回空串时回退 senderFrame.url（localhost dev）", () => {
        expect(
            isTrustedIpcSender(
                makeEvent("", { frameUrl: "http://localhost:5173/clip.html" }),
            ),
        ).toBe(true);
    });

    it("getURL 为主路径：主路径不可信时不因 senderFrame 可信而放行", () => {
        expect(
            isTrustedIpcSender(
                makeEvent("http://evil.com/", {
                    frameUrl: "file:///app/index.html",
                }),
            ),
        ).toBe(false);
    });
});

describe("单入口分发器 - sender 白名单", () => {
    it("可信 file:// sender 正常分发并写入 returnValue", async () => {
        mainOn("runPath", () => "D:/ScreenX");
        const event = makeEvent("file:///D:/ScreenX/out/renderer/editor.html");
        await dispatch(event, "runPath", []);
        expect(event.returnValue).toBe("D:/ScreenX");
    });

    it("可信 localhost dev sender 放行", async () => {
        const cb = vi.fn();
        mainOn("clip_close", cb);
        const event = makeEvent("http://localhost:5173/clip.html");
        await dispatch(event, "clip_close", []);
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it("不可信 http://evil.com sender 被拒：回调不调用、returnValue 不设置", async () => {
        const cb = vi.fn();
        mainOn("exit", cb);
        const event = makeEvent("http://evil.com/");
        await dispatch(event, "exit", []);
        expect(cb).not.toHaveBeenCalled();
        expect(event.returnValue).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("exit"));
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("evil.com"),
        );
    });

    it("未注册 key 维持现有 not found 语义", async () => {
        const event = makeEvent("file:///app/index.html");
        await dispatch(event, "no_such_key", []);
        expect(logSpy).toHaveBeenCalledWith("ipcMain.on: no_such_key not found");
    });
});

describe("单入口分发器 - 异常兜底", () => {
    it("回调抛错被捕获：returnValue 不设置、记录 error、无 unhandled rejection", async () => {
        const unhandled = vi.fn();
        process.on("unhandledRejection", unhandled);
        try {
            mainOn("clip_hide", () => {
                throw new Error("boom");
            });
            const event = makeEvent("file:///app/clip.html");
            await dispatch(event, "clip_hide", []);
            expect(event.returnValue).toBeUndefined();
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining("clip_hide"),
                expect.any(Error),
            );
            // 让事件循环空转一圈，确认没有未处理的 rejection
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(unhandled).not.toHaveBeenCalled();
        } finally {
            process.off("unhandledRejection", unhandled);
        }
    });

    it("多个回调时前一个抛错不影响后一个执行", async () => {
        const second = vi.fn(() => "second-ok");
        mainOn("systemLan", () => {
            throw new Error("first-fail");
        });
        mainOn("systemLan", second);
        const event = makeEvent("file:///app/index.html");
        await dispatch(event, "systemLan", []);
        expect(second).toHaveBeenCalledTimes(1);
        expect(event.returnValue).toBe("second-ok");
    });
});

describe("mainOn zod schema 校验", () => {
    it("合法 data 正常分发，回调收到 schema 解析后的数据", async () => {
        const cb = vi.fn();
        mainOn(
            "noti",
            cb,
            z.tuple([z.object({ body: z.string(), title: z.string() })]),
        );
        const event = makeEvent("file:///app/index.html");
        await dispatch(event, "noti", [
            { body: "b", title: "t", extra: "stripped" },
        ]);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith(
            [{ body: "b", title: "t" }],
            expect.anything(),
        );
    });

    it("非法 data 被拒：回调不调用、returnValue 不设置", async () => {
        const cb = vi.fn();
        mainOn("windowTop", cb, z.tuple([z.boolean()]));
        const event = makeEvent("file:///app/index.html");
        await dispatch(event, "windowTop", ["not-a-boolean"]);
        expect(cb).not.toHaveBeenCalled();
        expect(event.returnValue).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("windowTop"),
        );
    });

    it("非数组 data 被拒", async () => {
        const cb = vi.fn();
        mainOn("dingIgnore", cb, z.tuple([z.boolean()]));
        const event = makeEvent("file:///app/index.html");
        await dispatch(event, "dingIgnore", "not-an-array");
        expect(cb).not.toHaveBeenCalled();
    });
});

describe("store 通道 zod schema", () => {
    it("放行五种合法 type", () => {
        expect(
            storeIpcSchema.safeParse({ type: "get", path: "全局.主题" }).success,
        ).toBe(true);
        expect(
            storeIpcSchema.safeParse({
                type: "set",
                path: "a.b",
                value: { x: 1 },
            }).success,
        ).toBe(true);
        expect(storeIpcSchema.safeParse({ type: "path" }).success).toBe(true);
        expect(storeIpcSchema.safeParse({ type: "getAll" }).success).toBe(true);
        expect(
            storeIpcSchema.safeParse({ type: "setAll", value: { a: 1 } }).success,
        ).toBe(true);
    });

    it("拒绝非法 type", () => {
        expect(storeIpcSchema.safeParse({ type: "bogus" }).success).toBe(false);
        expect(storeIpcSchema.safeParse({}).success).toBe(false);
        expect(storeIpcSchema.safeParse({ type: 42 }).success).toBe(false);
        expect(storeIpcSchema.safeParse(null).success).toBe(false);
        expect(storeIpcSchema.safeParse("get").success).toBe(false);
    });

    it("拒绝非法 path（缺失或非字符串）", () => {
        expect(storeIpcSchema.safeParse({ type: "get" }).success).toBe(false);
        expect(storeIpcSchema.safeParse({ type: "get", path: 123 }).success).toBe(
            false,
        );
        expect(storeIpcSchema.safeParse({ type: "set", value: 1 }).success).toBe(
            false,
        );
    });

    it("storeIpcArgsSchema 拒绝包裹后的非法负载、放行合法负载", () => {
        expect(
            storeIpcArgsSchema.safeParse([{ type: "bogus" }]).success,
        ).toBe(false);
        expect(storeIpcArgsSchema.safeParse([{ type: "get" }]).success).toBe(
            false,
        );
        expect(
            storeIpcArgsSchema.safeParse([{ type: "get", path: "a" }]).success,
        ).toBe(true);
    });
});

describe("store 通道经单入口分发（与 main.ts 同款接线）", () => {
    it("非法 type/path 被拒，合法 get 放行并写入 returnValue", async () => {
        const cb = vi.fn((data: [{ type: string; path?: string }]) => {
            if (data[0].type === "get") return "config-value";
            return undefined;
        });
        mainOn("store", cb, storeIpcArgsSchema);
        const event = makeEvent("file:///app/setting.html");

        await dispatch(event, "store", [{ type: "bogus" }]);
        expect(cb).not.toHaveBeenCalled();
        expect(event.returnValue).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("store"));

        await dispatch(event, "store", [{ type: "get", path: 123 }]);
        expect(cb).not.toHaveBeenCalled();
        expect(event.returnValue).toBeUndefined();

        await dispatch(event, "store", [{ type: "get", path: "全局.主题" }]);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(event.returnValue).toBe("config-value");
    });
});
