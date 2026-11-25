import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Server Actions are public POST endpoints: their IDs ship in the client bundle
// and proxy.ts lets anonymous users reach "/" and "/login". Any exported action
// that touches the service-role client (bypasses RLS) or Gemini must therefore
// authorize the caller itself, before doing anything else.

const ROOTS = ["app", "lib"];
const GUARD = /require[A-Z]\w*\(|getActorContext|getCurrentUser|auth\.getUser|guard[A-Z]\w*\(/;
const PRIVILEGED = /createAdminClient\(|getGeminiModel\(/;

/** Actions that are public by design. Every entry needs a reason. */
const PUBLIC_ACTIONS: Record<string, string> = {
  "app/(auth)/login/actions.ts#loginAction": "Đăng nhập: người dùng chưa có session.",
  "lib/actions/contact.ts#submitContactRequest": "Form liên hệ công khai trên trang chủ.",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "api") walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full.split(path.sep).join("/"));
  }
  return out;
}

const actionFiles = ROOTS.flatMap((root) => walk(root))
  .map((file) => ({ file, src: fs.readFileSync(file, "utf8") }))
  .filter(({ src }) => /^\s*["']use server["']/.test(src));

function exportedFunctions(src: string) {
  return src.split(/\nexport async function /).slice(1).map((chunk) => ({
    name: chunk.match(/^(\w+)/)![1],
    body: chunk.split(/\nexport /)[0],
  }));
}

describe("Server Action authorization guards", () => {
  it("finds the legacy action files", () => {
    expect(actionFiles.length).toBeGreaterThan(30);
  });

  it("only exports actions as `export async function` (so this scan sees them)", () => {
    const offenders = actionFiles
      .filter(({ src }) => /\nexport (const|let)\s+\w+\s*=\s*async|\nexport default async/.test(src))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("every privileged action authorizes the caller", () => {
    const unguarded: string[] = [];
    for (const { file, src } of actionFiles) {
      for (const fn of exportedFunctions(src)) {
        const key = `${file}#${fn.name}`;
        if (PRIVILEGED.test(fn.body) && !GUARD.test(fn.body) && !PUBLIC_ACTIONS[key]) unguarded.push(key);
      }
    }
    expect(unguarded, "Thêm requireActor/requireClassAccess/... vào đầu các action này").toEqual([]);
  });

  it("allowlist has no stale entries", () => {
    const existing = new Set(actionFiles.flatMap(({ file, src }) => exportedFunctions(src).map((fn) => `${file}#${fn.name}`)));
    expect(Object.keys(PUBLIC_ACTIONS).filter((key) => !existing.has(key))).toEqual([]);
  });
});
