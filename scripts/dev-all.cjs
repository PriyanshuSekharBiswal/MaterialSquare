const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mode = process.argv[2] === "customer" ? "customer" : "all";
const frontendScripts =
  mode === "customer" ? ["dev:web"] : ["dev:web", "dev:admin"];
const localEnv = fs.existsSync(path.join(root, ".env"))
  ? fs.readFileSync(path.join(root, ".env"), "utf8")
  : "";
const configuredPort = localEnv.match(/^\s*PORT\s*=\s*["']?(\d{1,5})/m)?.[1];
const apiPort = Number(process.env.PORT || configuredPort || 4000);
const apiLiveUrl = `http://127.0.0.1:${apiPort}/api/health`;
const apiReadyUrl = `http://127.0.0.1:${apiPort}/api/health/ready`;
const children = new Set();
let shuttingDown = false;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function start(script) {
  const child = spawn("npm", ["run", script], {
    cwd: root,
    env: process.env,
    // npm starts its own shell and application processes. Put the whole tree
    // in a process group on POSIX so shutdown does not orphan stale watchers.
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      const result = signal ? `signal ${signal}` : `exit code ${code}`;
      console.error(`Local ${script} process stopped (${result}); stopping the local stack.`);
      shutdown(code || 1);
    }
  });
  child.once("error", (error) => {
    console.error(`Unable to start ${script}: ${error.message}`);
    shutdown(1);
  });
  return child;
}

async function waitForApi(child) {
  const timeoutMs = Number(process.env.LOCAL_API_STARTUP_TIMEOUT_MS || 60_000);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("The API process exited before becoming ready.");
    }

    try {
      const response = await fetch(apiReadyUrl, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The API is still compiling or waiting for its database; keep polling.
    }

    await wait(250);
  }

  throw new Error(
    `The API did not become ready at ${apiReadyUrl} within ${timeoutMs} ms.`,
  );
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  const signalChildTree = (child, signal) => {
    try {
      if (process.platform === "win32") child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  for (const child of children) signalChildTree(child, "SIGTERM");
  const forceExit = setTimeout(() => {
    for (const child of children) signalChildTree(child, "SIGKILL");
  }, 5_000);
  forceExit.unref();
  process.exitCode = exitCode;
}

process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(143));

async function main() {
  try {
    const existingApi = await fetch(apiLiveUrl, {
      signal: AbortSignal.timeout(1_000),
    }).catch(() => null);
    if (existingApi) {
      throw new Error(
        `A service is already responding at ${apiLiveUrl}. Stop the existing local stack before running another copy.`,
      );
    }

    console.log("Starting the local API and waiting for database readiness…");
    const api = start("dev:api");
    await waitForApi(api);
    console.log(
      mode === "customer"
        ? "Local API is ready; starting storefront…"
        : "Local API is ready; starting storefront and admin…",
    );
    for (const script of frontendScripts) start(script);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    shutdown(1);
  }
}

void main();
