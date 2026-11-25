/** Generate SQL locally; never applies SQL or connects to a database. */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root } from "./bootstrap.mjs";
import { freshInstallSql, resetSql } from "./fresh-install.mjs";

const target = process.argv[2];
if (!target) throw new Error("Usage: node scripts/db/build-clean-reset.mjs <project-ref>");
mkdirSync(path.join(root, ".local"), { recursive: true });
writeFileSync(path.join(root, ".local/lms-clean-install.sql"), freshInstallSql());
writeFileSync(path.join(root, ".local/lms-clean-reset.sql"), resetSql(target));
console.log(JSON.stringify({ targetProject: target, install: ".local/lms-clean-install.sql", destructiveReset: ".local/lms-clean-reset.sql", databaseChanged: false, demoDataIncluded: false }));
