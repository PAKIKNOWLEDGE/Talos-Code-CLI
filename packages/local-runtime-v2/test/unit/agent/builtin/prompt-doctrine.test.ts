import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveAgentCapabilities } from "@mavis/config";
import { describe, expect, it } from "vitest";

import { BuiltinAgentCatalog } from "../../../../src/service/agent/builtin/catalog.js";
import { addRuntimeRules } from "../../../../src/service/turn-system/agent-host/preparation/config/runtime-prompt-rules.js";

const ASSETS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../assets/agents",
);
const DOCTRINE_DIR = join(ASSETS, "_v2", "tui", "doctrine");

const common = {
  agentName: "mavis",
  surface: "cli" as const,
  promptProfile: "tui" as const,
  appMode: "coding" as const,
  locale: "en",
  promptChannel: "online" as const,
  capabilities: resolveAgentCapabilities(),
  memoryEnabled: false,
  cronEnabled: false,
};

async function renderTui(doctrine?: "apocalypse" | "stargate") {
  const catalog = new BuiltinAgentCatalog();
  const rendered = await catalog.render({
    ...common,
    ...(doctrine === undefined ? {} : { promptDoctrine: doctrine }),
  });
  return rendered.corePrompt;
}

/** The rendered prompt is what the model reads; the asset header comment is not. */
async function renderDoctrine(doctrine: "apocalypse" | "stargate") {
  const prompt = await renderTui(doctrine);
  const start = prompt.indexOf("# Core Judgment");
  const end = prompt.indexOf("# Communication & Delivery");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return prompt.slice(start, end);
}

function countHeading(prompt: string, heading: string): number {
  return prompt.split("\n").filter((line) => line.trim() === heading).length;
}

function countOccurrences(prompt: string, statement: string): number {
  return prompt.split(statement).length - 1;
}

describe("prompt doctrine assets", () => {
  it("ships both doctrine files as independent, non-empty assets", async () => {
    for (const name of ["apocalypse", "stargate"] as const) {
      const raw = await readFile(join(DOCTRINE_DIR, `${name}.md.hbs`), "utf8");
      expect(raw.trim().length).toBeGreaterThan(0);
      expect(raw).toContain("Everything below this comment is upstream text.");
    }
  });

  it("never emits Anthropic's model usage policy", async () => {
    const doctrine = await renderDoctrine("apocalypse");
    for (const fragment of [
      "CYBER_RISK_INSTRUCTION",
      "Refuse requests for destructive techniques",
      "mass targeting",
      "supply chain",
      "detection evasion",
    ]) {
      expect(doctrine).not.toContain(fragment);
    }
  });

  it("never emits Claude Code internal product details", async () => {
    const doctrine = await renderDoctrine("apocalypse");
    for (const fragment of [
      "USER_TYPE",
      "Capybara",
      "capy v8",
      "numbat",
      "ccshare",
      "C07VBSHV7EV",
      "/share",
      "/issue",
      "MODEL LAUNCH",
      "claude-code-feedback",
      "ISSUES_EXPLAINER",
    ]) {
      expect(doctrine).not.toContain(fragment);
    }
  });

  it("never names a tool Talos does not ship", async () => {
    const doctrine = await renderDoctrine("apocalypse");
    for (const fragment of [
      "ToolSearch",
      "LSPTool",
      "EnterPlanMode",
      "ExitPlanMode",
      "SendMessageTool",
      "SleepTool",
      "TaskCreateTool",
      "TeamCreate",
      "TeamDelete",
    ]) {
      expect(doctrine).not.toContain(fragment);
    }
  });

  it("keeps the doctrine free of pi-only project context blocks", async () => {
    const doctrine = await renderDoctrine("stargate");
    for (const fragment of [
      "pi documentation",
      "project_context",
      "environment_context",
      "Available tools:",
    ]) {
      expect(doctrine).not.toContain(fragment);
    }
  });

  it("carries each doctrine's signature line", async () => {
    expect(await renderDoctrine("stargate")).toContain(
      "expert coding assistant operating inside Talos",
    );
    expect(await renderDoctrine("apocalypse")).toContain(
      "Executing actions with care",
    );
  });
});

describe("prompt doctrine composition", () => {
  it("defaults to apocalypse when no doctrine is requested", async () => {
    const explicit = await renderTui("apocalypse");
    expect(await renderTui()).toBe(explicit);
  });

  it("renders a different prompt per doctrine", async () => {
    const apocalypse = await renderTui("apocalypse");
    const stargate = await renderTui("stargate");
    expect(stargate).not.toBe(apocalypse);
    expect(stargate).toContain("Be concise in your responses");
    expect(apocalypse).toContain("Report outcomes faithfully");
  });

  it("keeps the Talos-owned rules from being duplicated by the doctrine", async () => {
    // Statements `addRuntimeRules` injects; the doctrine must not repeat them.
    const injected = [
      "<system-reminder>",
      "Tools run behind a user-selected permission mode",
      "Never introduce code that exposes or logs secrets",
      "Follow explicit user language instructions",
      "For any non-trivial tool-call step",
    ];
    for (const doctrine of ["apocalypse", "stargate"] as const) {
      const assembled = addRuntimeRules(await renderTui(doctrine), true);
      expect(countHeading(assembled, "# Harness")).toBe(1);
      expect(countHeading(assembled, "## Response Style")).toBe(1);
      expect(countHeading(assembled, "## Preamble messages")).toBe(1);
      for (const statement of injected) {
        expect(countOccurrences(assembled, statement)).toBe(1);
      }
    }
  });

  it("keeps the doctrine below the runtime-injected root-session framing", async () => {
    const signature = {
      apocalypse: "Executing actions with care",
      stargate: "Be concise in your responses",
    } as const;
    for (const doctrine of ["apocalypse", "stargate"] as const) {
      const assembled = addRuntimeRules(
        await renderTui(doctrine),
        true,
        "SENTINEL-ROOT-FRAMING",
      );
      expect(countHeading(assembled, "# Core Judgment")).toBe(1);
      expect(countOccurrences(assembled, "SENTINEL-ROOT-FRAMING")).toBe(1);
      // Both the injected framing and the doctrine body must survive.
      expect(assembled).toContain(signature[doctrine]);
      expect(assembled.indexOf("SENTINEL-ROOT-FRAMING")).toBeLessThan(
        assembled.indexOf(signature[doctrine]),
      );
    }
  });

  it("composes the doctrine for a desktop profile that selects the TUI mode", async () => {
    const catalog = new BuiltinAgentCatalog();
    const base = {
      agentName: "mavis",
      surface: "cli" as const,
      promptProfile: "desktop" as const,
      promptMode: "tui" as const,
      appMode: "coding" as const,
      locale: "en",
      promptChannel: "online" as const,
      capabilities: resolveAgentCapabilities(),
      memoryEnabled: false,
      cronEnabled: false,
    };
    const apocalypse = await catalog.render(base);
    const stargate = await catalog.render({ ...base, promptDoctrine: "stargate" });
    expect(apocalypse.corePrompt).toContain("Executing actions with care");
    expect(stargate.corePrompt).toContain("Be concise in your responses");
    expect(stargate.corePrompt).not.toBe(apocalypse.corePrompt);
  });

  it("rejects an unknown doctrine instead of reporting a missing asset", async () => {
    const catalog = new BuiltinAgentCatalog();
    await expect(
      catalog.render({
        ...common,
        promptDoctrine: "nonesuch" as never,
      }),
    ).rejects.toThrow(/Invalid prompt doctrine/u);
  });

  it("ignores the doctrine outside the TUI profile", async () => {
    const catalog = new BuiltinAgentCatalog();
    for (const promptMode of ["coding", "work"] as const) {
      const base = {
        agentName: "mavis",
        surface: "cli" as const,
        promptMode,
        appMode: promptMode,
        locale: "en",
        promptChannel: "online" as const,
        capabilities: resolveAgentCapabilities(),
        memoryEnabled: false,
        cronEnabled: false,
      };
      const without = await catalog.render(base);
      const withStargate = await catalog.render({
        ...base,
        promptDoctrine: "stargate",
      });
      expect(withStargate.corePrompt).toBe(without.corePrompt);
    }
  });
});
