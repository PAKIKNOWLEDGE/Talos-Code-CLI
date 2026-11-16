import { describe, expect, it, vi } from "vitest";

import type { ApplicationContext } from "../context.js";
import type { SessionRecord } from "../../service/session-system/index.js";
import {
  SessionLifecycleApplication,
  type SessionLifecycleApplicationOptions,
} from "./lifecycle-application.js";

const CONTEXT = {} as ApplicationContext;

function record(promptDoctrine?: "apocalypse" | "stargate"): SessionRecord {
  return { sessionId: "session-1", promptDoctrine } as unknown as SessionRecord;
}

function createApplication(
  options: {
    readonly stored?: SessionRecord;
    readonly storedMissing?: boolean;
    readonly hasUserMessages?: boolean;
    readonly omitGuard?: boolean;
  } = {},
) {
  const updated = record("stargate");
  const mutateSession = vi.fn(async () => updated);
  const readSession = vi.fn(async () =>
    options.storedMissing ? undefined : (options.stored ?? record("apocalypse")),
  );
  const hasUserMessages = vi.fn(async () => options.hasUserMessages ?? false);
  const lifecycle: SessionLifecycleApplicationOptions["lifecycle"] = {
    createSession: vi.fn(),
    mutateSession,
    archiveSession: vi.fn(),
    archiveSessionInMaintenanceLane: vi.fn(),
  } as unknown as SessionLifecycleApplicationOptions["lifecycle"];
  const application = new SessionLifecycleApplication({
    lifecycle,
    deletion: { deleteSession: vi.fn() },
    resolveAgentWriteTarget: async () => "agent",
    ...(options.omitGuard ? {} : { promptDoctrineGuard: { readSession, hasUserMessages } }),
  });
  return { application, mutateSession, readSession, hasUserMessages };
}

describe("Session doctrine lock", () => {
  it("rejects a doctrine change once the Session has a user message", async () => {
    const { application, mutateSession, hasUserMessages } = createApplication({
      hasUserMessages: true,
    });

    await expect(
      application.updateSession(CONTEXT, { id: "session-1", promptDoctrine: "stargate" }),
    ).rejects.toMatchObject({ status: 409, key: "local_prompt_doctrine_locked" });
    expect(hasUserMessages).toHaveBeenCalledWith("session-1");
    expect(mutateSession).not.toHaveBeenCalled();
  });

  it("lets an empty Session change doctrine", async () => {
    const { application, mutateSession } = createApplication({ hasUserMessages: false });

    await application.updateSession(CONTEXT, { id: "session-1", promptDoctrine: "stargate" });

    expect(mutateSession).toHaveBeenCalledWith("session-1", { promptDoctrine: "stargate" });
  });

  it("re-saves the stored doctrine without consulting the message count", async () => {
    const { application, mutateSession, hasUserMessages } = createApplication({
      stored: record("stargate"),
      hasUserMessages: true,
    });

    await application.updateSession(CONTEXT, { id: "session-1", promptDoctrine: "stargate" });

    expect(hasUserMessages).not.toHaveBeenCalled();
    expect(mutateSession).toHaveBeenCalledWith("session-1", { promptDoctrine: "stargate" });
  });

  it("ignores the guard for updates that carry no doctrine", async () => {
    const { application, mutateSession, readSession } = createApplication({
      hasUserMessages: true,
    });

    await application.updateSession(CONTEXT, { id: "session-1", title: "Renamed" });

    expect(readSession).not.toHaveBeenCalled();
    expect(mutateSession).toHaveBeenCalledWith("session-1", { title: "Renamed" });
  });

  it("leaves a missing Session to the mutation so it reports its own error", async () => {
    const { application, mutateSession, hasUserMessages } = createApplication({
      storedMissing: true,
      hasUserMessages: true,
    });

    await application.updateSession(CONTEXT, { id: "session-1", promptDoctrine: "stargate" });

    expect(hasUserMessages).not.toHaveBeenCalled();
    expect(mutateSession).toHaveBeenCalled();
  });

  it("reports an unknown doctrine as a bad request, not as a locked Session", async () => {
    const { application, mutateSession, readSession } = createApplication({
      hasUserMessages: true,
    });

    await expect(
      application.updateSession(CONTEXT, {
        id: "session-1",
        promptDoctrine: "calvinball" as never,
      }),
    ).rejects.toMatchObject({ status: 400, key: "VALIDATION_ERROR" });
    expect(readSession).not.toHaveBeenCalled();
    expect(mutateSession).not.toHaveBeenCalled();
  });

  it("does not enforce the lock when the wiring supplies no guard", async () => {
    // The guard is optional so a composition without the message repository can
    // still be constructed. That widens the surface if it ever happens by
    // accident, so this test states the seam explicitly.
    const { application, mutateSession } = createApplication({
      omitGuard: true,
      hasUserMessages: true,
    });

    await application.updateSession(CONTEXT, { id: "session-1", promptDoctrine: "stargate" });

    expect(mutateSession).toHaveBeenCalledWith("session-1", { promptDoctrine: "stargate" });
  });
});
