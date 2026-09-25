import { describe, expect, it } from "vitest";
import { createFakePluginHost, type FakePluginHost } from "@get-bb/plugin-sdk/testing";
import type { JsonValue } from "@get-bb/plugin-sdk";
import plugin from "../server";
import { DONE_METADATA_KEY } from "../lib/done-metadata";

const LEGACY_KV_KEY = "done-thread-ids";

/**
 * Fake host with an in-memory metadata namespace, exposed so tests seed
 * legacy KV state and inspect the imported metadata records.
 */
async function setup(opts: { threads?: string[] } = {}) {
  const meta = new Map<string, JsonValue>();
  const host: FakePluginHost = createFakePluginHost({
    pluginId: "thread-board",
    sdk: {
      threads: {
        list: async () => (opts.threads ?? []).map((id) => ({ id })),
        getPluginMetadata: async (args: { threadId: string }) =>
          meta.get(args.threadId) ?? {},
        updatePluginMetadata: async (args: {
          threadId: string;
          set?: Record<string, JsonValue>;
          remove?: string[];
        }) => {
          const current = (meta.get(args.threadId) ?? {}) as Record<string, JsonValue>;
          const next = { ...current };
          if (args.set) Object.assign(next, args.set);
          for (const key of args.remove ?? []) delete next[key];
          meta.set(args.threadId, next as JsonValue);
          return next;
        },
      },
    },
  });
  await plugin(host.bb);
  const kvSet = async (key: string, value: unknown) => {
    await host.bb.storage.kv.set(key, value);
  };
  return {
    host,
    harness: host.harness,
    meta,
    kv: host.bb.storage.kv,
    kvSet,
    callRpc: (method: string, input?: unknown) =>
      host.harness.callRpc(method, input) as Promise<unknown>,
  };
}

function doneRecordOf(meta: Map<string, JsonValue>, threadId: string) {
  const namespace = meta.get(threadId) as Record<string, JsonValue> | undefined;
  return namespace?.[DONE_METADATA_KEY] as
    | { doneAt: string; keep?: boolean }
    | undefined;
}

const IMPORT_WINDOW_STARTED = Date.now();

describe("migration shim: legacy KV string[] (main's shape)", () => {
  it("imports plain ids into metadata with an import-time doneAt", async () => {
    const { callRpc, kvSet, meta } = await setup({ threads: ["thr_a", "thr_b"] });
    await kvSet(LEGACY_KV_KEY, ["thr_a", "thr_b"]);
    const before = Date.now();
    await callRpc("done_list", null);
    for (const id of ["thr_a", "thr_b"]) {
      const record = doneRecordOf(meta, id)!;
      const stamped = Date.parse(record.doneAt);
      expect(Number.isNaN(stamped)).toBe(false);
      expect(stamped).toBeGreaterThanOrEqual(before - 1000);
    }
  });

  it("imported ids appear in done_list", async () => {
    const { callRpc, kvSet } = await setup({ threads: ["thr_a", "thr_b"] });
    await kvSet(LEGACY_KV_KEY, ["thr_b", "thr_a"]);
    expect(await callRpc("done_list", null)).toEqual({
      doneIds: ["thr_a", "thr_b"],
    });
  });

  it("does not clobber an existing metadata record (idempotent import)", async () => {
    const { callRpc, kvSet, meta } = await setup({ threads: ["thr_a"] });
    await kvSet(LEGACY_KV_KEY, ["thr_a"]);
    // Metadata already holds a record (e.g. written post-migration, or the
    // shim ran before): the import must not refresh its doneAt.
    const preexisting = {
      [DONE_METADATA_KEY]: { doneAt: "2020-01-01T00:00:00.000Z", keep: true },
    } satisfies Record<string, JsonValue>;
    meta.set("thr_a", preexisting);
    await callRpc("done_list", null);
    expect(doneRecordOf(meta, "thr_a")).toEqual({
      doneAt: "2020-01-01T00:00:00.000Z",
      keep: true,
    });
  });
});

describe("migration shim: legacy KV record-map (sweep sibling's shape)", () => {
  it("imports records preserving doneAt (epoch ms → ISO) and keep", async () => {
    const { callRpc, kvSet, meta } = await setup({ threads: ["thr_a", "thr_b"] });
    const epochMs = Date.parse("2026-09-20T08:30:00.000Z");
    await kvSet(LEGACY_KV_KEY, {
      thr_a: { doneAt: epochMs },
      thr_b: { doneAt: epochMs, keep: true },
    });
    await callRpc("done_list", null);
    expect(doneRecordOf(meta, "thr_a")?.doneAt).toBe("2026-09-20T08:30:00.000Z");
    expect(doneRecordOf(meta, "thr_b")).toEqual({
      doneAt: "2026-09-20T08:30:00.000Z",
      keep: true,
    });
  });

  it("imports a record-map entry missing doneAt with an import-time stamp", async () => {
    const { callRpc, kvSet, meta } = await setup({ threads: ["thr_a"] });
    await kvSet(LEGACY_KV_KEY, { thr_a: { keep: false } });
    const before = Date.now();
    await callRpc("done_list", null);
    const stamped = Date.parse(doneRecordOf(meta, "thr_a")!.doneAt);
    expect(stamped).toBeGreaterThanOrEqual(before - 1000);
  });

  it("fails loud on a malformed record-map entry (never coerces)", async () => {
    const { callRpc, kvSet } = await setup({ threads: ["thr_a"] });
    await kvSet(LEGACY_KV_KEY, { thr_a: { doneAt: "not-a-date" } });
    await expect(callRpc("done_list", null)).rejects.toThrow(/doneAt/);
  });
});

describe("migration shim: KV lifecycle", () => {
  it("deletes the KV key after a complete import", async () => {
    const { callRpc, kvSet, kv } = await setup({ threads: ["thr_a"] });
    await kvSet(LEGACY_KV_KEY, ["thr_a"]);
    await callRpc("done_list", null);
    expect(await kv.get(LEGACY_KV_KEY)).toBeUndefined();
  });

  it("second done_list is a no-op (KV gone, state served from metadata)", async () => {
    const { callRpc, kvSet, kv, meta } = await setup({ threads: ["thr_a"] });
    await kvSet(LEGACY_KV_KEY, ["thr_a"]);
    await callRpc("done_list", null);
    const record = doneRecordOf(meta, "thr_a");
    await callRpc("done_set", { threadId: "thr_a", done: false });
    expect(await callRpc("done_list", null)).toEqual({ doneIds: [] });
    expect(doneRecordOf(meta, "thr_a")).toBeUndefined();
    void record;
  });

  it("partial import (legacy ids over multiple runs) converges on the next read", async () => {
    // Simulate a crash between imports: seed KV with two ids, but pre-write
    // metadata for only one — the shim must import the other and delete the
    // key only once everything is imported.
    const { callRpc, kvSet, kv, meta } = await setup({
      threads: ["thr_a", "thr_b"],
    });
    await kvSet(LEGACY_KV_KEY, ["thr_a", "thr_b"]);
    const epoch = Date.parse("2026-09-21T00:00:00.000Z");
    meta.set("thr_a", {
      [DONE_METADATA_KEY]: { doneAt: new Date(epoch).toISOString() },
    });
    await callRpc("done_list", null);
    expect(await kv.get(LEGACY_KV_KEY)).toBeUndefined();
    expect(doneRecordOf(meta, "thr_b")?.doneAt).toBeDefined();
    expect(await callRpc("done_list", null)).toEqual({
      doneIds: ["thr_a", "thr_b"],
    });
  });

  it("no legacy KV → no writes, empty list (shim is a no-op)", async () => {
    const { callRpc, meta } = await setup({ threads: ["thr_fresh"] });
    expect(await callRpc("done_list", null)).toEqual({ doneIds: [] });
    expect(meta.size).toBe(0);
  });

  it("fails loud on an unexpected legacy shape (never coerces)", async () => {
    const { callRpc, kvSet } = await setup({ threads: [] });
    await kvSet(LEGACY_KV_KEY, 42);
    await expect(callRpc("done_list", null)).rejects.toThrow(/legacy/);
  });
});

describe("migration shim: ordering", () => {
  it("imported ids merge with already-metadata-backed ids in done_list", async () => {
    const { callRpc, kvSet, meta } = await setup({
      threads: ["thr_old", "thr_new"],
    });
    meta.set("thr_new", {
      [DONE_METADATA_KEY]: { doneAt: "2026-09-25T00:00:00.000Z" },
    });
    const epoch = Date.parse("2026-09-20T00:00:00.000Z");
    await kvSet(LEGACY_KV_KEY, { thr_old: { doneAt: epoch } });
    expect(await callRpc("done_list", null)).toEqual({
      doneIds: ["thr_new", "thr_old"],
    });
  });
});