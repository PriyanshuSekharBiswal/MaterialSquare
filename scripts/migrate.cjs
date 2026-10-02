require("dotenv").config();
const { spawnSync } = require("node:child_process");
const result = spawnSync(
  process.execPath,
  [
    require.resolve("prisma/build/index.js"),
    "migrate",
    "deploy",
    "--schema",
    "packages/db/prisma/schema.prisma",
  ],
  { stdio: "inherit", env: process.env },
);
process.exitCode = result.status ?? 1;
