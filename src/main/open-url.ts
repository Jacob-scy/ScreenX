import { shell } from "electron";

/** 仅放行安全的外部 URL 协议，防止渲染进程借 openUrl IPC 触发危险协议处理器 */
export function isSafeExternalUrl(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    return (
        parsed.protocol === "http:" ||
        parsed.protocol === "https:" ||
        parsed.protocol === "mailto:"
    );
}

/** 安全地打开外部 URL：仅 http/https/mailto 会真正调用 shell.openExternal */
export function safeOpenExternal(url: string): boolean {
    if (!isSafeExternalUrl(url)) {
        console.warn(`[openUrl] 已拦截不安全的 URL: ${url}`);
        return false;
    }
    shell.openExternal(url);
    return true;
}
