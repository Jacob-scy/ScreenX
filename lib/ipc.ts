// biome-ignore format:
const { ipcRenderer, ipcMain} = require("electron") as typeof import("electron");

import type {
    Display,
    MessageBoxSyncOptions,
    NativeTheme,
    OpenDialogOptions,
} from "electron";
import { z } from "zod";
import type {
    BrowserAction,
    DingResize,
    DingStart,
    GithubUrlType,
    MainWinType,
    setting,
    translateWinType,
    功能,
} from "../src/ShareTypes";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
    ? 1
    : 2
    ? true
    : false;

// biome-ignore lint/suspicious/noExplicitAny: 相信ai
type IsVoidFunction<T> = T extends (...args: any[]) => any
    ? Equals<ReturnType<T>, void>
    : false;

type VoidKeys<M> = {
    [K in keyof M]: IsVoidFunction<M[K]> extends true ? K : never;
}[keyof M];

/**
 * store 通道（config.json 读写）的负载联合类型。
 * 原渲染进程直接走裸通道 "store"，现统一收敛到单入口 "ipc" + key "store"，
 * 由 storeIpcArgsSchema 在 mainOn 注册时做运行时校验。
 */
export type StoreIpc =
    | { type: "get"; path: string }
    // biome-ignore lint/suspicious/noExplicitAny: 写入值随各设置项形态变化，结构由 zod schema 运行时校验
    | { type: "set"; path: string; value: any }
    | { type: "path" }
    | { type: "getAll" }
    // biome-ignore lint/suspicious/noExplicitAny: 写入值随各设置项形态变化，结构由 zod schema 运行时校验
    | { type: "setAll"; value: any };

/** store 通道单条目负载的 zod 校验 schema（与 StoreIpc 一一对应） */
export const storeIpcSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("get"), path: z.string() }),
    z.object({ type: z.literal("set"), path: z.string(), value: z.unknown() }),
    z.object({ type: z.literal("path") }),
    z.object({ type: z.literal("getAll") }),
    z.object({ type: z.literal("setAll"), value: z.unknown() }),
]);

/** store 通道完整负载（参数数组）的 zod 校验 schema，供 mainOn 第三参数使用 */
export const storeIpcArgsSchema = z.tuple([storeIpcSchema]);

type Message = {
    clip_show: () => void;
    clip_close: () => void;
    clip_ocr: (img: string, type: string) => void;
    clip_hide: () => void;
    clip_save: (ext: string) => string;
    clip_ding: (
        img: string,
        type: "translate" | "ding",
        rect: { w: number; h: number; x: number; y: number },
    ) => void;
    getMousePos: () => {
        ab: { x: number; y: number };
        po: { x: number; y: number };
    };
    save_file_path: (type: string) => string;
    ok_save: (m: string) => void;
    clip_stop_long: () => void;
    clip_init: (
        displays: Electron.Display[],
        imgBuffer: Buffer | undefined,
        mainid: number,
        act: 功能 | undefined,
        reqId?: string,
    ) => void;
    open_this_browser: (window_name: number, url: string) => void;
    edit_pic: (img: Buffer<ArrayBufferLike>) => void;
    dialogMessage: (op: MessageBoxSyncOptions) => number;
    openUrl: (url: string) => void;
    noti: (op: { body: string; title: string }) => void;
    windowClose: () => void;
    windowMax: () => void;
    windowTop: (ignore: boolean) => void;
    windowTopest: (ignore: boolean) => void;
    windowIgnoreMouse: (top: boolean) => void;
    windowShow: () => void;
    runPath: () => string;
    systemLan: () => string;
    /** 设置存储通道，负载结构见 StoreIpc / storeIpcArgsSchema */
    // biome-ignore lint/suspicious/noExplicitAny: 各 type 分支返回值形态不同，由调用侧按 type 断言
    store: (x: StoreIpc) => any;
    feedbackBug: (op?: {
        title?: string;
        main?: string;
        steps?: string;
        expected?: string;
        more?: string;
    }) => string;
    feedbackFeature: (op?: {
        title?: string;
        main?: string;
    }) => string;
    selectPath: (
        defalutPath: string,
        p: OpenDialogOptions["properties"],
    ) => string;
    tabView: (id: number, type: BrowserAction) => void;
    tabViewSize: (size: { top: number; bottom: number }) => void;
    viewEvent: (type: BrowserAction | "add_history" | "browser") => void;
    hotkey:
        | ((
              type: "快捷键",
              name: keyof setting["快捷键"],
              key: string,
          ) => boolean)
        | ((type: "快捷键2", name: 功能, key: string) => boolean);
    reloadMainFromSetting: () => void;
    getDefaultSetting: () => setting;
    reload: () => void;
    exit: () => void;
    clearStorage: () => void;
    clearCache: () => void;
    move_user_data: (target: string) => void;
    getAutoStart: () => boolean;
    setAutoStart: (value: boolean) => void;
    theme: (t: NativeTheme["themeSource"]) => void;
    dingIgnore: (ignore: boolean) => void;
    dingShare: (
        data:
            | { type: "close"; id: string; closeAll: boolean }
            | { type: "move_start"; more: DingStart }
            | { type: "move_end" }
            | { type: "back"; id: string }
            | { type: "resize"; more: DingResize },
    ) => void;
    addDing: (
        wid: number,
        x: number,
        y: number,
        w: number,
        h: number,
        url: string,
        type: "translate" | "ding",
    ) => void;
    dingMouse: (x: number, y: number) => void;
    editorInit: (name: number, list: MainWinType) => void;
    browserNew: (id: number, url: string) => void;
    browserTitle: (id: number, title: string) => void;
    browserIcon: (id: number, icon: string) => void;
    browserUrl: (id: number, url: string) => void;
    browserLoad: (id: number, load: boolean) => void;
    userDataPath: () => string;
    githubUrl: (path: string, _type?: GithubUrlType | "auto") => string;
    getScreens: () => Display[];
    getLogs: () => {
        from: "screenShot" | "ding" | "mainWindow";
        message: string;
        type: "info" | "warning" | "error";
        lineCount: number;
    }[];
    trigger_screenshot: () => void;
    trigger_long_screenshot: () => void;
};

const name = "ipc";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const renderOnData = new Map<string, ((data: any) => void)[]>();
const mainOnData = new Map<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ((data: any, event: Electron.IpcMainEvent) => any)[]
>();

function mainSend<K extends keyof Message>(
    webContents: Electron.WebContents | undefined,
    key: K,
    data: Parameters<Message[K]>,
): void {
    webContents?.send(name, key, data);
}

function renderOn<K extends keyof Message>(
    key: K,
    callback: (data: Parameters<Message[K]>) => void,
) {
    const callbacks = renderOnData.get(key) || [];
    callbacks.push(callback);
    renderOnData.set(key, callbacks);
}

function renderSend<K extends keyof Message>(
    key: K,
    data: Parameters<Message[K]>,
): void {
    ipcRenderer.send(name, key, data);
}

function renderSendSync<K extends keyof Message>(
    key: K,
    data: Parameters<Message[K]>,
): ReturnType<Message[K]> {
    return ipcRenderer.sendSync(name, key, data);
}

function mainOn<K extends keyof Message>(
    key: K,
    callback: (
        data: Parameters<Message[K]>,
        event: Electron.IpcMainEvent,
    ) => ReturnType<Message[K]> | Promise<ReturnType<Message[K]>>,
    schema?: z.ZodType<Parameters<Message[K]>>,
) {
    const callbacks = mainOnData.get(key) || [];
    const guarded: (
        data: Parameters<Message[K]>,
        event: Electron.IpcMainEvent,
    ) => any = schema
        ? async (data, event) => {
              const parsed = schema.safeParse(data);
              if (!parsed.success) {
                  console.warn(
                      `[ipc] ${String(key)} 参数校验失败，已丢弃: ${parsed.error.message}`,
                  );
                  return undefined;
              }
              return callback(parsed.data, event);
          }
        : callback;
    callbacks.push(guarded);
    mainOnData.set(key, callbacks);
}

/**
 * 渲染进程之间的通信，主进程起到中转作用
 */
function mainOnReflect<K extends VoidKeys<Message>>(
    key: K,
    callback: (
        data: Parameters<Message[K]>,
        event: Electron.IpcMainEvent,
    ) => Electron.WebContents[],
) {
    // @ts-ignore 适用于无返回的函数
    mainOn(key, async (data, event) => {
        const webContents = await callback(data, event);
        if (webContents) {
            for (const wc of webContents) {
                wc.send(name, key, data);
            }
        }
    });
}

ipcRenderer?.on(name, (event, key, data) => {
    const callbacks = renderOnData.get(key);
    if (callbacks) {
        for (const callback of callbacks) {
            callback(data);
        }
    } else {
        console.log(`ipcRenderer.on: ${key} not found`);
    }
});

/**
 * 取 IPC 事件对应的渲染进程页面 URL。
 * 主路径为 event.sender.getURL()；senderFrame 自 Electron 43 起废弃，仅作兜底。
 */
function getSenderUrl(event: Electron.IpcMainEvent): string {
    try {
        const url = event.sender.getURL();
        if (url) return url;
    } catch {
        // getURL 不可用（异常或缺失）时走 senderFrame 兜底
    }
    return (event.senderFrame as { url?: string } | undefined)?.url ?? "";
}

/**
 * 校验 IPC 消息是否来自可信的渲染进程页面：
 * - file: 协议（生产包页面由 loadFile 加载）
 * - http:/https: 且 hostname 为 localhost / 127.0.0.1（electron-vite dev server）
 * 其余来源（远程页面、自定义协议、无法解析的 URL）一律视为不可信。
 */
export function isTrustedIpcSender(event: Electron.IpcMainEvent): boolean {
    let parsed: URL;
    try {
        parsed = new URL(getSenderUrl(event));
    } catch {
        return false;
    }
    if (parsed.protocol === "file:") return true;
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return (
            parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"
        );
    }
    return false;
}

/**
 * 单入口分发器工厂：渲染→主的全部 IPC 都经此处的 sender 可信校验与异常兜底。
 * 抽成工厂函数以便测试在无 Electron 运行时直接驱动同一份逻辑。
 */
export function createIpcMainHandler() {
    return async (
        event: Electron.IpcMainEvent,
        key: unknown,
        data: unknown,
    ): Promise<void> => {
        if (!isTrustedIpcSender(event)) {
            console.warn(
                `[ipc] 已拒绝不可信来源的 IPC 消息: key=${String(key)} url=${getSenderUrl(event)}`,
            );
            return;
        }
        const callbacks = mainOnData.get(key as string);
        if (callbacks) {
            for (const callback of callbacks) {
                try {
                    const result = await callback(data, event);
                    if (result !== undefined) {
                        event.returnValue = result;
                    }
                } catch (error) {
                    // 同步通道（sendSync）下，未捕获异常会导致 returnValue 永不设置、
                    // 渲染进程无限期挂起，因此在此兜底并记录栈信息
                    console.error(
                        `[ipc] 处理器抛出异常: key=${String(key)}`,
                        error,
                    );
                }
            }
        } else {
            console.log(`ipcMain.on: ${key} not found`);
        }
    };
}

ipcMain?.on(name, createIpcMainHandler());

export {
    mainSend,
    renderOn,
    renderSend,
    renderSendSync,
    mainOn,
    mainOnReflect,
};
