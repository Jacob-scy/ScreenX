import * as fs from "node:fs";
import { describe, expect, it } from "vitest";
import { waylandShotInit } from "../waylandShot";

const isWayland =
    process.platform === "linux" && process.env.XDG_SESSION_TYPE === "wayland";

describe.skipIf(!isWayland)("waylandShot", () => {
    it("should initialize and test wayland capture in Wayland session", async () => {
        const { capture } = await waylandShotInit();
        expect(capture).toBeDefined();
    });
});
