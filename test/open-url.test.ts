import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
    shell: { openExternal: vi.fn() },
}));

import { shell } from "electron";
import { isSafeExternalUrl, safeOpenExternal } from "../src/main/open-url";

const openExternalMock = vi.mocked(shell.openExternal);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("isSafeExternalUrl - 白名单内的安全协议", () => {
    it("放行 http://example.com", () => {
        expect(isSafeExternalUrl("http://example.com")).toBe(true);
    });

    it("放行 https://example.com/path?q=1", () => {
        expect(isSafeExternalUrl("https://example.com/path?q=1")).toBe(true);
    });

    it("放行协议大小写混合的 HTTPS://EXAMPLE.COM", () => {
        expect(isSafeExternalUrl("HTTPS://EXAMPLE.COM")).toBe(true);
    });

    it("放行 http://127.0.0.1:8080/x", () => {
        expect(isSafeExternalUrl("http://127.0.0.1:8080/x")).toBe(true);
    });

    it("放行 https://example.com:8443/", () => {
        expect(isSafeExternalUrl("https://example.com:8443/")).toBe(true);
    });

    it("放行 mailto:someone@example.com", () => {
        expect(isSafeExternalUrl("mailto:someone@example.com")).toBe(true);
    });

    it("放行带参数的 mailto:someone@example.com?subject=hi&body=test", () => {
        expect(
            isSafeExternalUrl("mailto:someone@example.com?subject=hi&body=test"),
        ).toBe(true);
    });
});

describe("isSafeExternalUrl - 危险协议一律拦截", () => {
    it("拦截 file:///C:/Windows/System32/calc.exe", () => {
        expect(
            isSafeExternalUrl("file:///C:/Windows/System32/calc.exe"),
        ).toBe(false);
    });

    it("拦截 javascript:alert(1)", () => {
        expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    });

    it("拦截自定义 scheme myapp://foo", () => {
        expect(isSafeExternalUrl("myapp://foo")).toBe(false);
    });

    it("拦截 data:text/html,<script>...</script>", () => {
        expect(
            isSafeExternalUrl(
                "data:text/html,%3Cscript%3Ealert(1)%3C/script%3E",
            ),
        ).toBe(false);
    });

    it("拦截白名单外的 ftp://example.com/file", () => {
        expect(isSafeExternalUrl("ftp://example.com/file")).toBe(false);
    });
});

describe("isSafeExternalUrl - 非 URL 输入一律拦截", () => {
    it("拦截相对路径 foo/bar", () => {
        expect(isSafeExternalUrl("foo/bar")).toBe(false);
    });

    it("拦截空串", () => {
        expect(isSafeExternalUrl("")).toBe(false);
    });

    it("拦截畸形 URL http://", () => {
        expect(isSafeExternalUrl("http://")).toBe(false);
    });

    it("拦截普通文本 not a url", () => {
        expect(isSafeExternalUrl("not a url")).toBe(false);
    });
});

describe("safeOpenExternal", () => {
    it("安全 URL 返回 true 并调用 shell.openExternal", () => {
        expect(safeOpenExternal("https://example.com")).toBe(true);
        expect(openExternalMock).toHaveBeenCalledTimes(1);
        expect(openExternalMock).toHaveBeenCalledWith("https://example.com");
    });

    it("mailto 也返回 true 并调用 shell.openExternal", () => {
        expect(safeOpenExternal("mailto:someone@example.com")).toBe(true);
        expect(openExternalMock).toHaveBeenCalledTimes(1);
        expect(openExternalMock).toHaveBeenCalledWith(
            "mailto:someone@example.com",
        );
    });

    it("不安全 URL 返回 false 且不调用 shell.openExternal", () => {
        expect(
            safeOpenExternal("file:///C:/Windows/System32/calc.exe"),
        ).toBe(false);
        expect(openExternalMock).not.toHaveBeenCalled();
    });

    it("畸形 URL 返回 false 且不调用 shell.openExternal", () => {
        expect(safeOpenExternal("not a url")).toBe(false);
        expect(openExternalMock).not.toHaveBeenCalled();
    });
});
