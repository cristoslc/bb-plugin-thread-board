import { describe, expect, it } from "vitest";
import {
  DONE_METADATA_KEY,
  doneAtToEpochMs,
  parseDoneRecord,
  stampDone,
  type DoneRecord,
} from "../lib/done-metadata";
import type { JsonValue } from "@get-bb/plugin-sdk";

describe("parseDoneRecord", () => {
  it("accepts a valid record", () => {
    const value: JsonValue = { doneAt: "2026-09-25T10:00:00.000Z" };
    expect(parseDoneRecord(value)).toEqual<DoneRecord>({
      doneAt: "2026-09-25T10:00:00.000Z",
    });
  });

  it("accepts a valid record with keep", () => {
    const value: JsonValue = {
      doneAt: "2026-09-25T10:00:00.000Z",
      keep: true,
    };
    expect(parseDoneRecord(value)).toEqual<DoneRecord>({
      doneAt: "2026-09-25T10:00:00.000Z",
      keep: true,
    });
  });

  it("returns null for absent (undefined) value", () => {
    expect(parseDoneRecord(undefined)).toBeNull();
  });

  it("returns null for null value", () => {
    expect(parseDoneRecord(null)).toBeNull();
  });

  it("throws on malformed present value: non-object", () => {
    expect(() => parseDoneRecord("nope" as JsonValue)).toThrow();
  });

  it("throws on malformed present value: missing doneAt", () => {
    expect(() => parseDoneRecord({ keep: true } as JsonValue)).toThrow();
  });

  it("throws on malformed present value: non-ISO doneAt", () => {
    const value: JsonValue = { doneAt: 1730000000000 };
    expect(() => parseDoneRecord(value)).toThrow();
  });

  it("throws on malformed present value: wrong-typed keep", () => {
    const value: JsonValue = {
      doneAt: "2026-09-25T10:00:00.000Z",
      keep: "yes",
    };
    expect(() => parseDoneRecord(value)).toThrow();
  });
});

describe("stampDone", () => {
  it("stamps a fresh record from null existing", () => {
    const now = new Date("2026-09-25T12:00:00.000Z");
    const record = stampDone(null, now);
    expect(record).toEqual<DoneRecord>({
      doneAt: "2026-09-25T12:00:00.000Z",
    });
  });

  it("refreshes doneAt on re-mark (idempotent re-stamp)", () => {
    const existing: DoneRecord = {
      doneAt: "2026-09-25T08:00:00.000Z",
    };
    const now = new Date("2026-09-25T12:00:00.000Z");
    expect(stampDone(existing, now)).toEqual<DoneRecord>({
      doneAt: "2026-09-25T12:00:00.000Z",
    });
  });

  it("preserves keep when present", () => {
    const existing: DoneRecord = {
      doneAt: "2026-09-25T08:00:00.000Z",
      keep: true,
    };
    const now = new Date("2026-09-25T12:00:00.000Z");
    expect(stampDone(existing, now)).toEqual<DoneRecord>({
      doneAt: "2026-09-25T12:00:00.000Z",
      keep: true,
    });
  });

  it("emits ISO-8601 doneAt with Z suffix and milliseconds", () => {
    const now = new Date("2026-09-25T12:00:00.500Z");
    const record = stampDone(null, now);
    expect(record.doneAt).toBe("2026-09-25T12:00:00.500Z");
  });
});

describe("doneAtToEpochMs", () => {
  it("converts an ISO-8601 doneAt to epoch ms", () => {
    expect(doneAtToEpochMs("2026-09-25T12:00:00.000Z")).toBe(
      Date.parse("2026-09-25T12:00:00.000Z"),
    );
  });

  it("returns null on unparseable input (never coerces)", () => {
    expect(doneAtToEpochMs("not-a-date")).toBeNull();
  });
});

describe("DONE_METADATA_KEY", () => {
  it("is the settled metadata key", () => {
    expect(DONE_METADATA_KEY).toBe("done");
  });
});