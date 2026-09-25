import { describe, expect, it } from "vitest";
import { doneRecordOf, setup } from "./helpers/done-fake-host";
import { DONE_METADATA_KEY } from "../lib/done-metadata";

function doneCalls(host: Awaited<ReturnType<typeof setup>>["host"]) {
  return host.harness.inspection.sdk.callsTo("threads.updatePluginMetadata");
}

describe("done_set over plugin metadata", () => {
  it("marking done stamps the record into the thread's board-metadata namespace", async () => {
    const { callRpc, meta } = await setup({ threads: ["thr_a"] });
    await callRpc("done_set", { threadId: "thr_a", done: true });
    const record = doneRecordOf(meta, "thr_a");
    expect(typeof record?.doneAt).toBe("string");
    expect(Number.isNaN(Date.parse(record!.doneAt))).toBe(false);
  });

  it("marking done publishes done-changed with { threadId, done }", async () => {
    const { callRpc, harness } = await setup({ threads: ["thr_a"] });
    await callRpc("done_set", { threadId: "thr_a", done: true });
    const signals = harness.inspection.realtimeSignals;
    expect(signals).toContainEqual({
      channel: "done-changed",
      payload: { threadId: "thr_a", done: true },
    });
  });

  it("clearing publishes done-changed with done: false", async () => {
    const { callRpc, harness } = await setup({ threads: ["thr_a"] });
    await callRpc("done_set", { threadId: "thr_a", done: false });
    expect(harness.inspection.realtimeSignals).toContainEqual({
      channel: "done-changed",
      payload: { threadId: "thr_a", done: false },
    });
  });

  it("re-marking refreshes doneAt and preserves keep (idempotent re-stamp)", async () => {
    const { callRpc, meta } = await setup({ threads: ["thr_a"] });
    await callRpc("done_set", { threadId: "thr_a", done: true });
    const first = doneRecordOf(meta, "thr_a")!;
    await new Promise((r) => setTimeout(r, 5));
    await callRpc("done_set", { threadId: "thr_a", done: true });
    const second = doneRecordOf(meta, "thr_a")!;
    expect(Date.parse(second.doneAt)).toBeGreaterThan(Date.parse(first.doneAt));
    expect(second.keep).toBeUndefined();
  });

  it("re-marking preserves an existing keep flag", async () => {
    const { callRpc, meta } = await setup({ threads: ["thr_a"] });
    await callRpc("done_set", { threadId: "thr_a", done: true });
    // keep lands via the sweep sibling's surface; simulate by direct write
    // to the namespace the SDK owns.
    const namespace = meta.get("thr_a") as Record<string, JsonValue>;
    namespace[DONE_METADATA_KEY] = {
      doneAt: (namespace[DONE_METADATA_KEY] as { doneAt: string }).doneAt,
      keep: true,
    };
    await callRpc("done_set", { threadId: "thr_a", done: true });
    expect(doneRecordOf(meta, "thr_a")?.keep).toBe(true);
  });

  it("clearing issues a remove: [\"done\"] update", async () => {
    const { callRpc, host } = await setup({ threads: ["thr_a"] });
    await callRpc("done_set", { threadId: "thr_a", done: false });
    const args = doneCalls(host)[0][0] as { threadId: string; remove?: string[] };
    expect(args.threadId).toBe("thr_a");
    expect(args.remove).toEqual([DONE_METADATA_KEY]);
  });

  it("done_set echoes { done }", async () => {
    const { callRpc } = await setup({ threads: ["thr_a"] });
    expect(await callRpc("done_set", { threadId: "thr_a", done: true })).toEqual({
      done: true,
    });
  });
});

describe("done_list over plugin metadata", () => {
  it("returns ids of live threads carrying the done record, sorted", async () => {
    const { callRpc, meta } = await setup({ threads: ["thr_b", "thr_a", "thr_c"] });
    const iso = "2026-09-25T10:00:00.000Z";
    meta.set("thr_a", { [DONE_METADATA_KEY]: { doneAt: iso } });
    meta.set("thr_c", { [DONE_METADATA_KEY]: { doneAt: iso, keep: true } });
    meta.set("thr_other", { [DONE_METADATA_KEY]: { doneAt: iso } });
    expect(await callRpc("done_list", null)).toEqual({
      doneIds: ["thr_a", "thr_c"],
    });
  });

  it("drops a done thread that is no longer in threads.list (archived)", async () => {
    const { callRpc, meta } = await setup({ threads: [] });
    meta.set("thr_archived", { [DONE_METADATA_KEY]: { doneAt: "2026-09-25T10:00:00.000Z" } });
    expect(await callRpc("done_list", null)).toEqual({ doneIds: [] });
  });

  it("returns empty when nothing is done", async () => {
    const { callRpc } = await setup({ threads: ["thr_a"] });
    expect(await callRpc("done_list", null)).toEqual({ doneIds: [] });
  });

  it("fails loud on a malformed done record (never coerces)", async () => {
    const { callRpc, meta } = await setup({ threads: ["thr_bad"] });
    meta.set("thr_bad", { [DONE_METADATA_KEY]: { doneAt: 123 } });
    await expect(callRpc("done_list", null)).rejects.toThrow(/doneAt/);
  });
});
