import { describe, expect, it } from "vitest";
import { keepRowFromStore, keptFromRow } from "../server";

describe("keep store row round-trip", () => {
  it("a written keep row reads back with the flag intact", () => {
    const store = { thr_a: true, thr_b: true };
    const row = keepRowFromStore(store);
    expect(keptFromRow(row)).toEqual(store);
  });

  it("an absent row reads as no keeps", () => {
    expect(keptFromRow(null)).toBeNull();
    expect(keptFromRow(undefined)).toBeNull();
  });

  it("the bug shape — bare boolean values — fails validation instead of half-reading", () => {
    // The pre-fix writeKept persisted {id: true}; this row must never read
    // back as keeps, or the flag silently vanishes.
    expect(keptFromRow({ thr_a: true })).toBeNull();
  });

  it("keeps for unknown extra keys in a row are dropped", () => {
    expect(keptFromRow({ thr_a: { keep: true, stray: "x" } })).toBeNull();
  });
});