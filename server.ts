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

  async function listDoneIds(): Promise<string[]> {
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