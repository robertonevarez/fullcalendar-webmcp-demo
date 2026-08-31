#!/usr/bin/env node
/**
 * Packs the companion `@protocoltooling/fullcalendar` experiment into
 * `vendor/protocoltooling-fullcalendar-0.1.1.tgz` so CI/Vercel can install
 * without a sibling filesystem path.
 *
 * Usage:
 *   PROTOCOLTOOLING_PATH=../protocoltooling npm run pack:experiment-dep
 *
 * Defaults to ../protocoltooling relative to this repo.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = join(root, "vendor");
const targetName = "protocoltooling-fullcalendar-0.1.1.tgz";
const corePath = resolve(
  process.env.PROTOCOLTOOLING_PATH ?? join(root, "../protocoltooling"),
);

if (!existsSync(join(corePath, "package.json"))) {
  console.error(
    `Companion repo not found at ${corePath}. Set PROTOCOLTOOLING_PATH.`,
  );
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Building and packing companion from ${corePath}`);
run("npm", ["ci"], corePath);
run("npm", ["run", "build:lib"], corePath);

mkdirSync(vendorDir, { recursive: true });
const pack = spawnSync("npm", ["pack"], {
  cwd: corePath,
  encoding: "utf8",
});
if (pack.status !== 0) {
  console.error(pack.stderr);
  process.exit(pack.status ?? 1);
}

const packedName = pack.stdout
  .trim()
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .at(-1);
if (!packedName) {
  console.error("npm pack produced no tarball name");
  process.exit(1);
}

const packedPath = join(corePath, packedName);
const destPath = join(vendorDir, targetName);
copyFileSync(packedPath, destPath);
rmSync(packedPath, { force: true });

console.log(`Wrote ${destPath}`);
console.log(
  `Vendor contents: ${readdirSync(vendorDir).join(", ") || "(empty)"}`,
);
