import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const windows = `${root}.venv/Scripts/python.exe`;
const posix = `${root}.venv/bin/python`;
const executable =
  process.env.SPECTRE_PYTHON ||
  (existsSync(windows) ? windows : existsSync(posix) ? posix : "python");
const child = spawn(executable, [`${root}scripts/e2e_server.py`], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
child.on("exit", (code) => process.exit(code || 0));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
