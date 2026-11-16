import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../contract.js";
import {
  parseSessionExtraData,
  serializeSessionExtraData,
  sessionExtraDataFromRecord,
} from "./codec.js";

function record(promptDoctrine?: "apocalypse" | "stargate"): SessionRecord {
  return { sessionId: "session-1", promptDoctrine } as unknown as SessionRecord;
}

describe("promptDoctrine in session extra data", () => {
  it("round-trips a stored doctrine", () => {
    const encoded = serializeSessionExtraData(sessionExtraDataFromRecord(record("stargate")));

    expect(JSON.parse(encoded)).toMatchObject({ promptDoctrine: "stargate" });
    expect(parseSessionExtraData(encoded).promptDoctrine).toBe("stargate");
  });

  it("writes no key for a Session that stores no doctrine", () => {
    const encoded = serializeSessionExtraData(sessionExtraDataFromRecord(record()));

    expect(JSON.parse(encoded)).not.toHaveProperty("promptDoctrine");
    expect(parseSessionExtraData(encoded).promptDoctrine).toBeUndefined();
  });

  it("reads a legacy row that has no doctrine key", () => {
    expect(parseSessionExtraData(JSON.stringify({})).promptDoctrine).toBeUndefined();
  });

  it("reads an explicit null as no doctrine", () => {
    expect(parseSessionExtraData(JSON.stringify({ promptDoctrine: null })).promptDoctrine).toBe(
      undefined,
    );
  });

  it("rejects a stored value outside the declared set instead of degrading it", () => {
    // Fail-fast is deliberate: silently reading a corrupt value as "unset" would
    // render a doctrine the Session never chose.
    expect(() => parseSessionExtraData(JSON.stringify({ promptDoctrine: "calvinball" }))).toThrow(
      /promptDoctrine/,
    );
  });
});
