import { describe, expect, it } from "vitest";
import { z } from "zod";
import { rpcContract } from "../server";

describe("sweep RPC contract", () => {
  it("sweep_config_get returns both thresholds as positive integers", () => {
    const parsed = rpcContract.sweep_config_get.output.parse({
      doneArchiveDays: 7,
      idleArchiveDays: 30,
    });
    expect(parsed.doneArchiveDays).toBe(7);
    expect(parsed.idleArchiveDays).toBe(30);
  });

  it("sweep_config_get output rejects non-integers", () => {
    expect(() =>
      rpcContract.sweep_config_get.output.parse({ doneArchiveDays: 1.5, idleArchiveDays: 30 }),
    ).toThrow(z.ZodError);
    expect(() =>
      rpcContract.sweep_config_get.output.parse({ doneArchiveDays: 0, idleArchiveDays: 30 }),
    ).toThrow(z.ZodError);
  });

  it("sweep_keep_set round-trips a keep flag", () => {
    const input = rpcContract.sweep_keep_set.input.parse({ threadId: "thr_x", keep: true });
    expect(input).toEqual({ threadId: "thr_x", keep: true });
    const output = rpcContract.sweep_keep_set.output.parse({ threadId: "thr_x", keep: true });
    expect(output.keep).toBe(true);
  });

  it("sweep_keep_set rejects an empty thread id", () => {
    expect(() => rpcContract.sweep_keep_set.input.parse({ threadId: "", keep: true })).toThrow();
  });
});