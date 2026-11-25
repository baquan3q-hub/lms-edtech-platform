#!/usr/bin/env node
// PreToolUse hook: chặn Claude sửa file nhạy cảm.
// - .env* (trừ .env.example): chứa secret thật.
// - package-lock.json: chỉ để npm tự cập nhật.
// - supabase/migrations/*.sql đã commit: migration đã chạy thì không sửa, phải tạo migration mới.
// Exit 2 = chặn, nội dung stderr được gửi lại cho Claude.
import { execFileSync } from "node:child_process";
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

const toolInput = input.tool_input ?? {};
const filePath = toolInput.file_path ?? toolInput.notebook_path;
if (!filePath) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const rel = path.relative(projectDir, path.resolve(projectDir, filePath)).split(path.sep).join("/");
if (rel.startsWith("../")) process.exit(0);

const base = path.posix.basename(rel);

function block(reason) {
  process.stderr.write(`[protect-files] Đã chặn sửa ${rel}: ${reason}\n`);
  process.exit(2);
}

if (/^\.env/.test(base) && base !== ".env.example") {
  block("file env chứa secret thật. Hãy sửa .env.example và nhờ người dùng tự cập nhật file env.");
}

if (base === "package-lock.json") {
  block("lockfile chỉ được cập nhật qua npm install/npm uninstall.");
}

if (/^supabase\/migrations\/[^/]+\.sql$/.test(rel)) {
  let committed = false;
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${rel}`], { cwd: projectDir, stdio: "ignore" });
    committed = true;
  } catch {
    committed = false;
  }
  if (committed) {
    block(
      "migration này đã commit nên coi như đã chạy. Hãy tạo migration mới " +
        "(YYYYMMDDNNNN_ten.sql) và thêm vào cuối supabase/migration-order.json."
    );
  }
}

process.exit(0);
