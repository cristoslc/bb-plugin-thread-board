// Shared fake-host scaffolding for the done-RPC test suites: a
// createFakePluginHost host with an in-memory metadata namespace stubbing
// the three threads.* SDK methods (merge-then-remove, the semantics the
// real SDK documents), plus a record reader for assertions.
import type { FakePluginHost } from "@get-bb/plugin-sdk/testing";
import type { JsonValue } from "@get-bb/plugin-sdk";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "../../server";
import { DONE_METADATA_KEY } from "../../lib/done-metadata";

export type DoneTestHost = {
  host: FakePluginHost;
  harness: FakePluginHost["harness"];
  meta: Map<string, JsonValue>;
  kv: FakePluginHost["bb"]["storage"]["kv"];
  kvSet: (key: string, value: unknown) => Promise<void>;
  callRpc: (method: string, input?: unknown) => Promise<unknown>;
};

type SetupOptions = {
  /** Thread ids the stubbed threads.list returns (live threads). */
  threads?: string[];
};

export async function setup(opts: SetupOptions = {}): Promise<DoneTestHost> {
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
  return {
    host,
    harness: host.harness,
    meta,
    kv: host.bb.storage.kv,
    kvSet: async (key, value) => {
      await host.bb.storage.kv.set(key, value);
    },
    callRpc: (method: string, input?: unknown) =>
      host.harness.callRpc(method, input) as Promise<unknown>,
  };
}

export function doneRecordOf(
  meta: Map<string, JsonValue>,
  threadId: string,
): { doneAt: string; keep?: boolean } | undefined {
  const namespace = meta.get(threadId) as Record<string, JsonValue> | undefined;
  return namespace?.[DONE_METADATA_KEY] as
    | { doneAt: string; keep?: boolean }
    | undefined;
}