import { initConfig, restoreConfig, runApp, sleep } from "./init";

async function run() {
    initConfig();

    const app = runApp();

    await sleep(10000);
    await sleep(10000);

    app.kill();
    app.kill("SIGKILL");

    console.log("stop app");

    restoreConfig();

    process.exit(0);
}

run();
