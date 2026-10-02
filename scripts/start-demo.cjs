const { setup, run, root } = require("./setup-demo.cjs");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
async function main() {
  const env = setup();
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
  const hosts = ["localhost", "127.0.0.1", ...ips];
  env.CORS_ORIGINS = hosts
    .flatMap((h) => [5173, 5174].map((p) => `http://${h}:${p}`))
    .join(",");
  run("npm", ["run", "build", "--workspace=@material-square/types"], env);
  run("npm", ["run", "build:api"], env);
  const children = [];
  function start(command, args) {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    children.push(child);
    child.on("error", (e) => console.error(e.message));
    return child;
  }
  async function listening(port) {
    try {
      await fetch(`http://127.0.0.1:${port}`, {
        signal: AbortSignal.timeout(1000),
      });
      return true;
    } catch {
      return false;
    }
  }
  if (await listening(4000))
    throw Error(
      "Port 4000 is already running. Stop the other API before starting the demo.",
    );
  start(process.execPath, ["apps/api/dist/main.js"]);
  for (const [workspace, port] of [
    ["web", 5173],
    ["admin", 5174],
  ]) {
    if (await listening(port))
      console.log(
        `Using the existing ${workspace} development server on port ${port}.`,
      );
    else
      start("npm", [
        "run",
        "dev",
        `--workspace=@material-square/${workspace}`,
        "--",
        "--host",
        "0.0.0.0",
        "--strictPort",
      ]);
  }
  const access = [
    "# Local demo access",
    "",
    `Website: http://localhost:5173/account`,
    `Staff panel: http://localhost:5174`,
    ...ips.map(
      (ip) => `Same Wi-Fi: http://${ip}:5173/account and http://${ip}:5174`,
    ),
    "",
    `Staff mobile: ${env.DEMO_STAFF_PHONE}`,
    `Staff password: ${env.DEMO_STAFF_PASSWORD}`,
    "",
    "Customer sign-in sends a real OTP through MSG91. Data persists in .local/demo-postgres. Staff access uses the local demo credentials above. Keep the computer running while testing from a phone.",
  ].join("\n");
  fs.writeFileSync(path.join(root, ".local/demo-access.md"), access, {
    mode: 0o600,
  });
  console.log("Demo starting. Access details: .local/demo-access.md");
  const stop = () => {
    for (const child of children) child.kill("SIGTERM");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
