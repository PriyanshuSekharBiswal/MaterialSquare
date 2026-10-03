const required = [
  "@nestjs/core",
  "@prisma/client",
  "prisma/build/index.js",
];
const devOnly = ["jest", "micromatch", "braces"];

for (const name of required) {
  require.resolve(name);
}

const unexpectedlyInstalled = devOnly.filter((name) => {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
});

if (unexpectedlyInstalled.length) {
  throw new Error(
    `Development packages remained in the runtime install: ${unexpectedlyInstalled.join(", ")}`,
  );
}

console.log("Production runtime dependencies are present; dev-only Jest packages are pruned.");
