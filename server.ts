// bb-plugin-thread-board — a BB plugin backend entry.
//
// The board reads bb's live thread view through the frontend sidebar hooks.
// The only server state is the set of threads the user marked "Done" from
// the pane: one record per thread in the board's plugin-metadata namespace
// (key "done" → { doneAt, keep? }), exposed over RPC, broadcast over
// realtime so every open board updates. Plugin metadata writes emit no
// thread realtime event, so the explicit done-changed publish stays.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  DONE_METADATA_KEY,
  parseDoneRecord,
  stampDone,
  type DoneRecord,
} from "./lib/done-metadata";

export const rpcContract = defineRpcContract({
  done_list: {
    input: z.null(),
    output: z.object({ doneIds: z.array(z.string()) }),
  },
  done_set: {
    input: z.object({ threadId: z.string().min(1), done: z.boolean() }),
    output: z.object({ done: z.boolean() }),
  },
});

const DONE_CHANGED = "done-changed";
/** Legacy KV key written before the metadata migration. */
const LEGACY_DONE_KEY = "done-thread-ids";

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  async function readDoneRecord(threadId: string) {
    const namespace = await bb.sdk.threads.getPluginMetadata({ threadId });
    const value = (namespace as Record<string, unknown>)[DONE_METADATA_KEY];
    return parseDoneRecord(value as never);
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
        // Keep the thread present in its namespace; SDK merge semantics
        // apply remove after set, and an empty set is a no-op remove-only
        // update.
        set: {},
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
   * once every entry is imported.
   */
  async function importLegacyDone(): Promise<void> {
    const legacy: unknown = await bb.storage.kv.get(LEGACY_DONE_KEY);
    if (legacy === undefined || legacy === null) return;
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
        const imported =
          typeof record.doneAt === "number" && Number.isFinite(record.doneAt)
            ? {
                doneAt: new Date(record.doneAt).toISOString(),
                ...(typeof record.keep === "boolean" && record.keep
                  ? { keep: true }
                  : {}),
              }
            : typeof record.doneAt === "string"
              ? // Done-metadata-era shape already; preserve verbatim.
                { doneAt: record.doneAt, ...(typeof record.keep === "boolean" && record.keep ? { keep: true } : {}) }
              : { doneAt: new Date().toISOString() };
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

  async function listDoneIds(): Promise<string[]> {
    await importLegacyDone();
    const live = await bb.sdk.threads.list({});
    const doneIds: string[] = [];
    for (const thread of live) {
      const record = await readDoneRecord(thread.id);
      if (record !== null) doneIds.push(thread.id);
    }
    return doneIds.sort();
  }

  bb.rpc.register(rpcContract, {
    done_list: async () => ({ doneIds: await listDoneIds() }),
    done_set: async ({ threadId, done }) => {
      await writeDoneRecord(threadId, done);
      bb.realtime.publish(DONE_CHANGED, { threadId, done });
      return { done };
    },
  });

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}