// bb-plugin-thread-board — a BB plugin backend entry.
//
// The board reads bb's live thread view through the frontend sidebar hooks.
// Server state is: (1) the set of threads the user marked "Done" — one record
// per thread in the board's plugin-metadata namespace (key "done" →
// { doneAt: ISO-8601, keep? }), exposed over RPC and broadcast over realtime
// so every open board updates; (2) per-thread sweep keep flags in their own
// KV store (a long-idle thread that was never marked Done can be protected
// too); (3) the sweep thresholds, from plugin settings.
//
// Plugin metadata writes emit no thread realtime event, so the explicit
// done-changed publish stays.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  DONE_METADATA_KEY,
  parseDoneRecord,
  stampDone,
  type DoneRecord,
} from "./lib/done-metadata";
import { DEFAULT_DONE_ARCHIVE_DAYS, DEFAULT_IDLE_ARCHIVE_DAYS } from "./lib/sweep";
import type { JsonValue } from "@get-bb/plugin-sdk";

export const rpcContract = defineRpcContract({
  done_list: {
    input: z.null(),
    output: z.object({
      doneIds: z.array(z.string()),
      records: z.record(
        z.string(),
        z.object({ doneAt: z.string().optional(), keep: z.boolean().optional() }),
      ),
    }),
  },
  done_set: {
    input: z.object({ threadId: z.string().min(1), done: z.boolean() }),
    output: z.object({ done: z.boolean() }),
  },
  sweep_config_get: {
    input: z.null(),
    output: z.object({
      doneArchiveDays: z.number().int().min(1),
      idleArchiveDays: z.number().int().min(1),
    }),
  },
  sweep_keep_set: {
    input: z.object({ threadId: z.string().min(1), keep: z.boolean() }),
    output: z.object({ threadId: z.string().min(1), keep: z.boolean() }),
  },
});

/** Realtime signal after every done/keep write. Payload is { threadId, done }
 *  (was { count } before the metadata migration); consumers refetch on the
 *  event rather than reading the payload. */
const DONE_CHANGED = "done-changed";
/** Legacy KV key written before the metadata migration. */
const LEGACY_DONE_KEY = "done-thread-ids";
/** Per-thread sweep keep flags, independent of Done marks. */
const KEEP_KEY = "sweep-keep-flags";

type KeepStore = Record<string, true>;

/**
 * The raw KV row shape for the keep store — the single encoding both
 * writeKept persists and readKept validates, so a written row round-trips.
 */
export function keepRowFromStore(store: KeepStore): Record<string, { keep: true }> {
  return Object.fromEntries(
    Object.keys(store).map((id) => [id, { keep: true as const }]),
  );
}

export function keptFromRow(row: unknown): KeepStore | null {
  if (row === null || row === undefined) return null;
  if (typeof row !== "object" || Array.isArray(row)) return null;
  const entries = Object.entries(row as Record<string, unknown>);
  const valid = entries.every(([id, record]) =>
    typeof id === "string" &&
    typeof record === "object" &&
    record !== null &&
    !Array.isArray(record) &&
    (record as { keep?: unknown }).keep === true &&
    Object.keys(record).length === 1,
  );
  if (!valid) return null;
  return Object.fromEntries(entries.map(([id]) => [id, true as const]));
}

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  const settings = bb.settings.define({
    doneArchiveDays: {
      type: "number",
      label: "Sweep: archive Done threads after (days)",
      experimental_schema: z.number().int().min(1).max(365),
      default: DEFAULT_DONE_ARCHIVE_DAYS,
    },
    idleArchiveDays: {
      type: "number",
      label: "Sweep: archive long-idle threads after (days)",
      experimental_schema: z.number().int().min(1).max(3650),
      default: DEFAULT_IDLE_ARCHIVE_DAYS,
    },
  });

  async function readDoneRecord(
    threadId: string,
  ): Promise<DoneRecord | null> {
    // getPluginMetadata returns an untyped namespace record; cast to the
    // JsonValue contract parseDoneRecord validates.
    const namespace = await bb.sdk.threads.getPluginMetadata({ threadId });
    const value = (namespace as Record<string, JsonValue>)[DONE_METADATA_KEY];
    return parseDoneRecord(value);
  }

  async function writeDoneRecord(threadId: string, done: boolean) {
    const now = new Date();
    if (done) {
      const existing = await readDoneRecord(threadId);
      const record = stampDone(existing, now);
      await bb.sdk.threads.updatePluginMetadata({
        threadId,
        set: { [DONE_METADATA_KEY]: record },
      });
    } else {
      await bb.sdk.threads.updatePluginMetadata({
        threadId,
        remove: [DONE_METADATA_KEY],
      });
    }
  }

  /**
   * Legacy KV "done-thread-ids" held either a plain string[] (main's
   * original shape) or a per-thread record map with epoch-ms doneAt and an
   * optional keep flag (the sweep sibling's stopgap). Import both into
   * per-thread metadata, then delete the key: metadata is the only store
   * from here on. Checks each thread's existing record first, so a
   * partial import converges on the next read and the key is deleted only
   * once every entry is imported. Runs before both done_list and done_set:
   * a done=false written while the legacy value is still present must not
   * be resurrected by a later import.
   */
  async function importLegacyDone(): Promise<void> {
    const legacy: unknown = await bb.storage.kv.get(LEGACY_DONE_KEY);
    if (legacy === undefined || legacy === null) return;
    const keepFlag = (keep: unknown) =>
      typeof keep === "boolean" && keep ? { keep: true } : {};
    if (Array.isArray(legacy)) {
      // Main's shape: bare thread ids with no age data — stamp at import.
      const iso = new Date().toISOString();
      for (const id of legacy) {
        if (typeof id !== "string") {
          throw new Error(`legacy done ids: non-string entry ${JSON.stringify(id)}`);
        }
        await importOne(id, { doneAt: iso });
      }
    } else if (typeof legacy === "object") {
      // Sweep sibling's shape: record map with epoch-ms doneAt, keep flag.
      for (const [threadId, entry] of Object.entries(
        legacy as Record<string, unknown>,
      )) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          throw new Error(
            `legacy done records: malformed entry for ${JSON.stringify(threadId)}`,
          );
        }
        const record = entry as { doneAt?: unknown; keep?: unknown };
        if (
          !(
            (typeof record.doneAt === "number" &&
              Number.isFinite(record.doneAt)) ||
            (typeof record.doneAt === "string" &&
              !Number.isNaN(Date.parse(record.doneAt)))
          )
        ) {
          throw new Error(
            `legacy done records: invalid doneAt for ${JSON.stringify(threadId)}: ${JSON.stringify(record.doneAt)}`,
          );
        }
        const imported: DoneRecord =
          typeof record.doneAt === "number"
            ? {
                doneAt: new Date(record.doneAt).toISOString(),
                ...keepFlag(record.keep),
              }
            : // Epoch-free shape already; keep the ISO string as written,
              // carry keep only when true (DoneRecord's optional keep).
              { doneAt: record.doneAt, ...keepFlag(record.keep) };
        await importOne(threadId, imported);
      }
    } else {
      throw new Error(
        `legacy done store: unexpected shape ${JSON.stringify(legacy)}`,
      );
    }
    await bb.storage.kv.delete(LEGACY_DONE_KEY);
  }

  async function importOne(threadId: string, record: DoneRecord): Promise<void> {
    const existing = await readDoneRecord(threadId);
    if (existing !== null) return; // idempotent: never clobber live state
    await bb.sdk.threads.updatePluginMetadata({
      threadId,
      set: { [DONE_METADATA_KEY]: record },
    });
  }

  async function listDoneRecords(): Promise<{
    doneIds: string[];
    records: Record<string, { doneAt?: string; keep?: boolean }>;
  }> {
    await importLegacyDone();
    const live = await bb.sdk.threads.list({});
    const doneIds: string[] = [];
    const records: Record<string, { doneAt?: string; keep?: boolean }> = {};
    for (const thread of live) {
      const record = await readDoneRecord(thread.id);
      if (record !== null) {
        doneIds.push(thread.id);
        records[thread.id] = record;
      }
    }
    return { doneIds: doneIds.sort(), records };
  }

  async function readKept(): Promise<KeepStore> {
    const raw: unknown = await bb.storage.kv.get<unknown>(KEEP_KEY);
    const kept = keptFromRow(raw);
    if (kept === null) {
      if (raw !== null && raw !== undefined) {
        bb.log.warn(`Sweep keep store under "${KEEP_KEY}" failed validation; resetting to empty.`);
      }
      return {};
    }
    return kept;
  }

  async function writeKept(store: KeepStore): Promise<void> {
    // Persist the exact row shape readKept validates, so a written row
    // round-trips instead of failing validation and being wiped.
    await bb.storage.kv.set(KEEP_KEY, keepRowFromStore(store));
  }

  bb.rpc.register(rpcContract, {
    done_list: async () => {
      const [{ doneIds, records }, kept] = await Promise.all([
        listDoneRecords(),
        readKept(),
      ]);
      // Keep flags for threads never marked Done still ride to the client —
      // the idle arm honors them (the sweep's per-arm kept() lookups read
      // this one merged map).
      for (const id of Object.keys(kept)) {
        if (records[id] === undefined) records[id] = { keep: true };
        else records[id] = { ...records[id], keep: true };
      }
      return { doneIds, records };
    },
    done_set: async ({ threadId, done }) => {
      // Consume any legacy KV state before the first metadata write, or a
      // later import could resurrect state this write just changed.
      await importLegacyDone();
      await writeDoneRecord(threadId, done);
      bb.realtime.publish(DONE_CHANGED, { threadId, done });
      return { done };
    },
    sweep_config_get: async () => {
      const values = await settings.get();
      return {
        doneArchiveDays: values.doneArchiveDays,
        idleArchiveDays: values.idleArchiveDays,
      };
    },
    sweep_keep_set: async ({ threadId, keep }) => {
      // The keep flag applies to BOTH sweep arms (Done and long-idle), so it
      // is stored independently of Done marks: a long-idle thread that was
      // never marked Done can be protected too.
      const kept = await readKept();
      if (keep) {
        if (kept[threadId] === true) return { threadId, keep };
        await writeKept({ ...kept, [threadId]: true });
      } else {
        if (kept[threadId] !== true) return { threadId, keep };
        const { [threadId]: _removed, ...rest } = kept;
        await writeKept(rest);
      }
      // Keep changes feed the same refetch signal the board already
      // subscribes to; payload consumers refetch, so done:false is a dummy.
      bb.realtime.publish(DONE_CHANGED, { threadId, done: false });
      return { threadId, keep };
    },
  });

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}
