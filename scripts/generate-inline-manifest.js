#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "token-manifest.json");
const targetPath = path.join(repoRoot, "token-manifest-inline.js");

function main() {
  const manifest = fs.readFileSync(sourcePath, "utf8");
  const banner = "// Auto-generated from token-manifest.json to support filesystem usage without fetch.\n";
  const body =
    "window.__TOKEN_MANIFEST__ = " + manifest.trim() + ";\n" +
    "window.__TOKEN_MANIFEST_PROMISE__ = Promise.resolve(window.__TOKEN_MANIFEST__);\n";
  fs.writeFileSync(targetPath, banner + body + "\n");
  console.log(`Updated ${path.relative(repoRoot, targetPath)} from ${path.relative(repoRoot, sourcePath)}.`);
}

main();
