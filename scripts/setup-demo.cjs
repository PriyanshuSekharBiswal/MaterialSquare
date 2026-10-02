const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const root = path.resolve(__dirname, "..");
process.chdir(root);
function run(command, args, env = process.env) {
  const r = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (r.error) throw r.error;
  if (r.status !== 0) throw Error(`${command} failed`);
}
function setup() {
  fs.mkdirSync(path.join(root, ".local"), { recursive: true });
  const file = path.join(root, ".env.demo");
  if (!fs.existsSync(file))
    fs.writeFileSync(
      file,
      [
        "APP_ENV=demo",
        "DEMO_AUTH_ENABLED=true",
        "DEMO_CUSTOMER_PHONES=9000000001,9000000002,9000000003",
        "DEMO_STAFF_PHONE=9000000000",
        "DEMO_STAFF_PASSWORD=MaterialDemo@2026",
        "DATABASE_URL=postgresql://ms_demo@127.0.0.1:55440/material_square_demo",
        `JWT_SECRET=${randomBytes(48).toString("hex")}`,
        "PORT=4000",
        "NODE_ENV=development",
        "REDIS_URL=",
        "NOTIFICATION_WEBHOOK_URL=",
        "OTP_WEBHOOK_URL=",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
  const config = require("dotenv").parse(fs.readFileSync(file));
  const env = { ...process.env, ...config };
  if (env.APP_ENV !== "demo" || env.DEMO_AUTH_ENABLED !== "true")
    throw Error("Invalid .env.demo configuration");
  if (
    env.DATABASE_URL !==
    "postgresql://ms_demo@127.0.0.1:55440/material_square_demo"
  )
    throw Error(
      "This local setup script only manages its dedicated local demo database. Use deployment instructions for hosted databases.",
    );
  const data = path.join(root, ".local/demo-postgres");
  if (!fs.existsSync(path.join(data, "PG_VERSION")))
    run(
      "initdb",
      ["-D", data, "-U", "ms_demo", "-A", "trust", "--no-locale", "-E", "UTF8"],
      env,
    );
  const status = spawnSync("pg_ctl", ["-D", data, "status"], {
    stdio: "ignore",
    env,
  });
  if (status.status !== 0)
    run(
      "pg_ctl",
      [
        "-D",
        data,
        "-l",
        path.join(root, ".local/demo-postgres.log"),
        "-o",
        "-h 127.0.0.1 -p 55440 -k /private/tmp",
        "start",
      ],
      env,
    );
  const exists = spawnSync(
    "psql",
    [
      "-h",
      "127.0.0.1",
      "-p",
      "55440",
      "-U",
      "ms_demo",
      "-d",
      "postgres",
      "-tAc",
      "SELECT 1 FROM pg_database WHERE datname='material_square_demo'",
    ],
    { encoding: "utf8", env },
  );
  if (exists.status !== 0) throw Error("Unable to inspect the demo database");
  if (exists.stdout.trim() !== "1")
    run(
      "createdb",
      [
        "-h",
        "127.0.0.1",
        "-p",
        "55440",
        "-U",
        "ms_demo",
        "material_square_demo",
      ],
      env,
    );
  run("npm", ["run", "db:generate"], env);
  run("npm", ["run", "db:deploy"], env);
  run(process.execPath, ["scripts/seed-demo.cjs"], env);
  return env;
}
module.exports = { setup, run, root };
if (require.main === module) {
  try {
    setup();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
