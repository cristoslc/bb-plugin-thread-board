// bb-plugin-thread-board — a BB plugin backend entry.
//
// The board reads bb's live thread view through the frontend sidebar hooks.
// The only server state is the set of threads the user marked "Done" from the
// pane: one KV row, exposed over RPC, broadcast over realtime so every open
// board updates.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

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
const DONE_KEY = "done-thread-ids";

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  async function readDone(): Promise<string[]> {
    return (await bb.storage.kv.get<string[]>(DONE_KEY)) ?? [];
  }
  async function writeDone(ids: string[]): Promise<void> {
    await bb.storage.kv.set(DONE_KEY, ids);
    bb.realtime.publish(DONE_CHANGED, { count: ids.length });
  }

  bb.rpc.register(rpcContract, {
    done_list: async () => ({ doneIds: await readDone() }),
    done_set: async ({ threadId, done }) => {
      const current = await readDone();
      const next = done
        ? current.includes(threadId)
          ? current
          : [...current, threadId]
        : current.filter((id) => id !== threadId);
      if (next.length !== current.length) await writeDone(next);
      return { done };
    },
  });

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}