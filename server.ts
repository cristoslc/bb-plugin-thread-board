// bb-plugin-thread-board — a BB plugin backend entry.
//
// The board reads bb's live thread view through the frontend sidebar hooks.
// Server state is: (1) the set of threads the user marked "Done" — per-thread
// records with a first-seen `doneAt` stamp and an optional `keep` sweep
// override — exposed over RPC and broadcast over realtime so every open
// board updates; (2) the sweep thresholds, from plugin settings.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { DEFAULT_DONE_ARCHIVE_DAYS, DEFAULT_IDLE_ARCHIVE_DAYS } from "./lib/sweep";

export const rpcContract = defineRpcContract({
  done_list: {
    input: z.null(),
    output: z.object({
      doneIds: z.array(z.string()),
      records: z.record(z.string(), z.object({ doneAt: z.number().optional(), keep: z.boolean().optional() })),
    }),
  },
  done_set: {
    input: z.object({ threadId: z.string().min(1), done: z.boolean() }),
    output: z.object({ done: z.boolean() }),
  },
  sweep_keep_set: {
    input: z.object({ threadId: z.string().min(1), keep: z.boolean() }),
    output: z.object({ threadId: z.string().min(1), keep: z.boolean() }),
  },
  sweep_config_get: {
    input: z.null(),
    output: z.object({
      doneArchiveDays: z.number().int().min(1),
      idleArchiveDays: z.number().int().min(1),
    }),
  },
});

const DONE_CHANGED = "done-changed";
const DONE_KEY = "done-thread-ids";
const KEEP_KEY = "sweep-keep-flags";
// Single source of truth: lib/sweep.ts owns the defaults.
const DONE_DEFAULT_ARCHIVE_DAYS = DEFAULT_DONE_ARCHIVE_DAYS;
const IDLE_DEFAULT_ARCHIVE_DAYS = DEFAULT_IDLE_ARCHIVE_DAYS;

/** Per-thread Done record: first-seen stamp. Overrides live in KEEP_KEY. */
interface DoneRecord {
  doneAt?: number;
  keep?: boolean;
}
type DoneStore = Record<string, DoneRecord>;
type KeepStore = Record<string, true>;

function isDoneEntry(entry: unknown): boolean {
  if (typeof entry !== "object" || entry === null) return false;
  return Object.entries(entry).every(([key, value]) => {
    if (key === "doneAt") return value === undefined || typeof value === "number";
    if (key === "keep") return value === undefined || typeof value === "boolean";
    return false; // unknown keys rejected
  });
}

function isRecordMap(value: unknown): value is Record<string, DoneRecord> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(isDoneEntry);
}

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  const settings = bb.settings.define({
    doneArchiveDays: {
      type: "number",
      label: "Sweep: archive Done threads after (days)",
      experimental_schema: z.number().int().min(1).max(365),
      default: DONE_DEFAULT_ARCHIVE_DAYS,
    },
    idleArchiveDays: {
      type: "number",
      label: "Sweep: archive long-idle threads after (days)",
      experimental_schema: z.number().int().min(1).max(3650),
      default: IDLE_DEFAULT_ARCHIVE_DAYS,
    },
  });

  async function readDone(): Promise<DoneStore> {
    const raw: unknown = await bb.storage.kv.get<unknown>(DONE_KEY);
    // Threads stored by the pre-sweep version were a bare string[] of ids;
    // they carry no stamp and are never sweep-eligible until re-marked.
    if (Array.isArray(raw)) {
      return Object.fromEntries(
        raw.filter((id): id is string => typeof id === "string").map((id) => [id, {}]),
      );
    }
    if (isRecordMap(raw)) return raw;
    // Fail loud in the log: a corrupt store must never be silently wiped by
    // the next write, so the reset is announced.
    bb.log.warn(`Done store under "${DONE_KEY}" failed validation; resetting to empty.`);
    return {};
  }

  async function readKept(): Promise<KeepStore> {
    const raw: unknown = await bb.storage.kv.get<unknown>(KEEP_KEY);
    if (isRecordMap(raw)) {
      // Keep store only stores true flags.
      return Object.fromEntries(
        Object.entries(raw)
          .filter(([, record]) => record.keep === true)
          .map(([id]) => [id, true as const]),
      );
    }
    if (raw !== null && raw !== undefined) {
      bb.log.warn(`Sweep keep store under "${KEEP_KEY}" failed validation; resetting to empty.`);
    }
    return {};
  }

  async function writeDone(store: DoneStore): Promise<void> {
    await bb.storage.kv.set(DONE_KEY, store);
    bb.realtime.publish(DONE_CHANGED, { count: Object.keys(store).length });
  }

  async function writeKept(store: KeepStore): Promise<void> {
    await bb.storage.kv.set(KEEP_KEY, store);
    bb.realtime.publish(DONE_CHANGED, { count: Object.keys(store).length });
  }

  bb.rpc.register(rpcContract, {
    done_list: async () => {
      const [store, kept] = await Promise.all([readDone(), readKept()]);
      return {
        doneIds: Object.keys(store).sort(),
        records: Object.fromEntries(
          Object.entries(store).map(([id, record]) => [
            id,
            { ...record, ...(kept[id] === true ? { keep: true } : {}) },
          ]),
        ),
      };
    },
    done_set: async ({ threadId, done }) => {
      const current = await readDone();
      if (done) {
        if (current[threadId]?.doneAt !== undefined) return { done }; // no-op re-mark
        const record = current[threadId] ?? {};
        const next = {
          ...current,
          [threadId]: { ...record, ...(record.doneAt === undefined ? { doneAt: Date.now() } : {}) },
        };
        await writeDone(next);
      } else {
        if (current[threadId] === undefined) return { done };
        const { [threadId]: _removed, ...rest } = current;
        await writeDone(rest);
      }
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
      return { threadId, keep };
    },
  });

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}