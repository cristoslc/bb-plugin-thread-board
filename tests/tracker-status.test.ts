import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { readGitHubStatuses } from "../lib/tracker-status";

/** Build a cache DB shaped like the GitHub plugin's `items` table. */
function makeCacheDb(dir: string, rows: Array<[string, string, number, string]>): string {
  const path = join(dir, `cache-${Math.random().toString(36).slice(2)}.db`);
  const db = new Database(path);
  db.exec(
    "CREATE TABLE items (repo TEXT NOT NULL, number INTEGER NOT NULL, kind TEXT NOT NULL," +
      " title TEXT NOT NULL, state TEXT NOT NULL, author TEXT NOT NULL, labels TEXT NOT NULL," +
      " url TEXT NOT NULL, body TEXT NOT NULL, updated_at TEXT NOT NULL," +
      " assignees TEXT NOT NULL DEFAULT '[]', PRIMARY KEY (repo, kind, number))",
  );
  const insert = db.prepare(
    "INSERT INTO items (repo, number, kind, title, state, author, labels, url, body, updated_at)" +
      " VALUES (?, ?, ?, 't', ?, 'a', '[]', 'u', '', '2026-01-01T00:00:00Z')",
  );
  for (const [repo, kind, number, state] of rows) insert.run(repo, number, kind, state);
  db.close();
  return path;
}

describe("readGitHubStatuses", () => {
  const dir = mkdtempSync(join(tmpdir(), "tracker-status-"));

  it("returns statuses for matching repo+number rows", () => {
    const path = makeCacheDb(dir, [
      ["owner/repo", "issue", 42, "OPEN"],
      ["owner/repo", "pull", 43, "MERGED"],
      ["owner/other", "issue", 42, "OPEN"],
    ]);
    expect(readGitHubStatuses(path, "owner/repo", [42, 43])).toEqual({
      42: { kind: "issue", state: "OPEN" },
      43: { kind: "pull", state: "MERGED" },
    });
  });

  it("omits numbers with no row (partial match is fine)", () => {
    const path = makeCacheDb(dir, [["owner/repo", "issue", 42, "CLOSED"]]);
    expect(readGitHubStatuses(path, "owner/repo", [42, 999])).toEqual({
      42: { kind: "issue", state: "CLOSED" },
    });
  });

  it("returns empty for an empty ref list", () => {
    const path = makeCacheDb(dir, [["owner/repo", "issue", 42, "OPEN"]]);
    expect(readGitHubStatuses(path, "owner/repo", [])).toEqual({});
  });

  it("returns empty and does not throw for a missing DB file", () => {
    expect(readGitHubStatuses(join(dir, "nope.db"), "owner/repo", [42])).toEqual({});
  });

  it("returns empty and does not throw for a DB without the items table", () => {
    const path = join(dir, `wrong-${Math.random().toString(36).slice(2)}.db`);
    new Database(path).close();
    expect(readGitHubStatuses(path, "owner/repo", [42])).toEqual({});
  });

  it("matches the real GitHub plugin cache when present", () => {
    // Live-integration probe: the real cache on this machine. Skips when
    // the file does not exist (other machines, CI).
    const real = join(process.env.HOME ?? "~", ".bb/plugins/github/data.db");
    if (!existsSync(real)) return;
    const db = new Database(real, { readonly: true });
    const row = db
      .prepare("SELECT repo, kind, number, state FROM items LIMIT 1")
      .get() as { repo: string; kind: string; number: number; state: string } | undefined;
    db.close();
    if (row === undefined) return;
    expect(readGitHubStatuses(real, row.repo, [row.number])).toEqual({
      [row.number]: { kind: row.kind, state: row.state },
    });
  });
});
