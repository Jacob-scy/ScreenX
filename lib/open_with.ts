import { renderSendSync } from "./ipc";
const { exec } = require("node:child_process");
function open(path: string) {
    switch (process.platform) {
        case "win32":
            exec(
                `rundll32.exe C:\\Windows\\system32\\shell32.dll,OpenAs_RunDLL ${path}`,
            );
            break;
        case "linux": {
            const run_path = renderSendSync("runPath", []);
            // 判断桌面环境
            exec(
                "echo $XDG_SESSION_DESKTOP",
                (e: Error | null, desktop: string) => {
                    if (desktop === "KDE\n") {
                        exec(`cd ${run_path}lib && ./kde-open-with ${path}`);
                    } else {
                        exec(`cd ${run_path}lib && ./gtk-open-with ${path}`);
                    }
                },
            );
            break;
        }
        case "darwin": {
            exec(`open "${path}"`);
            break;
        }
    }
}
export default open;
