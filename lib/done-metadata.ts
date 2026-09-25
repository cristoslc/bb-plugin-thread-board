// Done-record helpers for the board's Done state.
//
// Done = per-thread plugin metadata in the board's own namespace: key
// "done" → { doneAt: ISO-8601 string, keep?: boolean }. Absent key = not
// done. These helpers are pure — no host, no SDK — so the RPC layer and
// tests can drive them without a bb host.
import type { JsonValue } from "@get-bb/plugin-sdk";

/** The board's Done key inside its thread plugin-metadata namespace. */
export const DONE_METADATA_KEY = "done";

/** The settled record shape: key "done" → { doneAt: ISO-8601, keep? }. */
export type DoneRecord = { doneAt: string; keep?: boolean };

/**
 * Parse a metadata value into a DoneRecord.
 *
 * Absent (undefined) and null mean "not done" → null. A malformed present
 * value throws (fail loud, never coerce): done state must round-trip
 * exactly between board and CLI, so a wrong shape is a bug to surface, not
 * data to paper over.
 */
export function parseDoneRecord(value: JsonValue | undefined): DoneRecord | null {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    const got = Array.isArray(value) ? "array" : typeof value;
    throw new Error(`done metadata: expected object, got ${got}`);
  }
  const obj = value as { [key: string]: JsonValue };
  const doneAt = obj["doneAt"];
  if (typeof doneAt !== "string" || Number.isNaN(Date.parse(doneAt))) {
    throw new Error(`done metadata: invalid doneAt ${JSON.stringify(doneAt)}`);
  }
  if (
    "keep" in obj &&
    obj["keep"] !== undefined &&
    typeof obj["keep"] !== "boolean"
  ) {
    throw new Error(`done metadata: invalid keep ${JSON.stringify(obj["keep"])}`);
  }
  const record: DoneRecord = { doneAt };
  if (typeof obj["keep"] === "boolean") record.keep = obj["keep"];
  return record;
}

/**
 * Stamp a fresh done record: doneAt = now (idempotent re-mark refreshes
 * the stamp, matching the CLI plan), keep preserved when present.
 */
export function stampDone(existing: DoneRecord | null, now: Date): DoneRecord {
  const record: DoneRecord = { doneAt: now.toISOString() };
  if (existing?.keep !== undefined) record.keep = existing.keep;
  return record;
}

/**
 * Adapter: ISO-8601 doneAt → epoch ms, for consumers whose contract takes
 * a number (the sweep sibling's DoneAgeSource.doneMarkedAt). Returns null
 * on unparseable input — never coerces to a bogus age.
 */
export function doneAtToEpochMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}
