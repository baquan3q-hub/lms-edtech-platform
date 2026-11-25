#!/usr/bin/env node
// PostToolUse hook: chạy `eslint --fix --quiet` trên đúng file vừa sửa.
// Còn lỗi (error, không tính warning) thì exit 2 để Claude thấy và sửa tiếp.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const raw = await new Promise((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (data += chunk));
  process.stdin.on("end", () => resolve(data));
});

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = input.tool_input?.file_path;
if (!filePath || !/\.(ts|tsx|js|jsx|mjs)$/.test(filePath)) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const abs = path.resolve(projectDir, filePath);
const rel = path.relative(projectDir, abs).split(path.sep).join("/");

// Chỉ lint mã ứng dụng; scripts/, tmp/, config đã bị eslint.config.mjs bỏ qua.
const linted = /^(app|components|lib|hooks|stores|types|tests)\//.test(rel) || rel === "proxy.ts";
if (!linted || !existsSync(abs)) process.exit(0);

const eslintBin = path.join(projectDir, "node_modules", "eslint", "bin", "eslint.js");
if (!existsSync(eslintBin)) process.exit(0);

const result = spawnSync(process.execPath, [eslintBin, "--fix", "--quiet", rel], {
  cwd: projectDir,
  encoding: "utf8",
  timeout: 90_000,
});

if (result.status === 1) {
  process.stderr.write(`[eslint] Còn lỗi trong ${rel}:\n${result.stdout || result.stderr}`);
  process.exit(2);
}

process.exit(0);
