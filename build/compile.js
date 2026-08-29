#!/usr/bin/env node
/**
 * Regenerates the compiled app code inside index.html from src/app.jsx.
 *
 * src/app.jsx is the human-editable source (JSX). index.html embeds the
 * *compiled* output directly so visitors' browsers don't need to download
 * Babel or transpile JSX at page-load time.
 *
 * One-time setup (only needed once per machine/session):
 *   npm install --no-save @babel/standalone
 *
 * Usage (from repo root):
 *   node build/compile.js
 *
 * Always edit src/app.jsx, never hand-edit the compiled block in index.html
 * directly — the next run of this script would overwrite it.
 */
const fs = require("fs");
const path = require("path");

let Babel;
try {
  Babel = require("@babel/standalone");
} catch (e) {
  console.error("Missing dependency @babel/standalone.");
  console.error("Run this once: npm install --no-save @babel/standalone");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const jsxPath = path.join(root, "src", "app.jsx");
const htmlPath = path.join(root, "index.html");
const START = "/* @COMPILED_APP_JSX_START@ */";
const END = "/* @COMPILED_APP_JSX_END@ */";

const jsx = fs.readFileSync(jsxPath, "utf8");
const { code } = Babel.transform(jsx, { presets: [["react", { runtime: "classic" }]] });

const html = fs.readFileSync(htmlPath, "utf8");
const startIdx = html.indexOf(START);
const endIdx = html.indexOf(END);
if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  console.error(
    "Could not find both " + START + " and " + END + " markers (in order) in index.html.\n" +
    "Those markers must stay in the file — this script only replaces what's between them."
  );
  process.exit(1);
}

const newHtml =
  html.slice(0, startIdx + START.length) + "\n" + code + "\n" +
  html.slice(endIdx);
fs.writeFileSync(htmlPath, newHtml);
console.log("index.html regenerated from src/app.jsx (" + code.length + " bytes compiled).");
