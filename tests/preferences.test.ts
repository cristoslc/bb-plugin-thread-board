import { describe, expect, it } from "vitest";
import { NEST_CHILDREN_KEY, nestStoredValue, parseNestStored } from "../components/preferences";

describe("nesting toggle persistence (R3)", () => {
  it("exposes the localStorage key", () => {
    expect(NEST_CHILDREN_KEY).toBe("focus-board:nestChildren");
  });

  it("round-trips: on for true, off for false", () => {
    expect(parseNestStored(nestStoredValue(true))).toBe(true);
    expect(parseNestStored(nestStoredValue(false))).toBe(false);
    expect(nestStoredValue(true)).toBe("on");
    expect(nestStoredValue(false)).toBe("off");
  });

  it("defaults to ON (nesting enabled) for null — first visit", () => {
    expect(parseNestStored(null)).toBe(true);
  });

  it("validates like readStored: any invalid stored value falls back to ON", () => {
    expect(parseNestStored("yes")).toBe(true);
    expect(parseNestStored("")).toBe(true);
    expect(parseNestStored("OFF")).toBe(true); // case-sensitive allow-list
    expect(parseNestStored("0")).toBe(true);
  });
});