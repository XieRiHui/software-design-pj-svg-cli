import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CommandExecutor } from "../../src/cli/CommandExecutor.js";
import { createConfiguredApplication } from "../../src/bootstrap/configuredAssembly.js";

const fixtureDirectory = join(
  process.cwd(),
  "tests",
  "fixtures",
  "plugin-configs",
);

describe("plugin config loader", () => {
  it("loads enabled plugins through package manifests", async () => {
    const application = await createConfiguredApplication(
      join(fixtureDirectory, "enabled.json"),
    );
    const executor = createExecutor(application);

    expect(application.startupMessages).toEqual([]);
    expect(executor.execute("stats")).toBe(
      "error: no document. use 'init' or 'read' first",
    );
    expect(executor.execute("help")).toContain("  stats\n  dir");
  });

  it("reports the four specified loader failures and keeps starting", async () => {
    const application = await createConfiguredApplication(
      join(fixtureDirectory, "failures.json"),
    );
    const executor = createExecutor(application);

    expect(application.startupMessages).toEqual([
      "error: plugin has no default export: ./plugins/no-default/index.ts",
      "error: plugin manifest mismatch: mismatch-fixture " +
        "(declared: shapes=[]; commands=[declared]; " +
        "decorators=[]; attributes=[], " +
        "registered: shapes=[]; commands=[actual]; " +
        "decorators=[]; attributes=[])",
      "error: plugin failed to activate: throws-fixture (synthetic failure)",
      "error: plugin failed to activate: evaluation-fixture " +
        "(module evaluation failed)",
      "error: plugin not found: ./not-there.js",
    ]);
    expect(executor.execute("help")).toContain("stats");
    expect(executor.execute("wat")).toBe(
      "error: unknown command: wat",
    );
  });

  it("rolls back a duplicate plugin and continues with later plugins", async () => {
    const application = await createConfiguredApplication(
      join(fixtureDirectory, "duplicate.json"),
    );
    const executor = createExecutor(application);

    expect(application.startupMessages).toEqual([
      "error: duplicate registration: commands/stats",
    ]);
    expect(executor.execute("fallback")).toBe("fallback loaded");
    expect(executor.execute("init")).toBe("canvas 800x600 created");
    expect(executor.execute("tree")).not.toContain("must-rollback");
  });

  it("falls back to builtins for an invalid config", async () => {
    const application = await createConfiguredApplication(
      join(fixtureDirectory, "invalid.json"),
    );
    const executor = createExecutor(application);

    expect(application.startupMessages).toEqual([
      "error: invalid plugin config",
    ]);
    expect(executor.execute("stats")).toBe(
      "error: unknown command: stats",
    );
    expect(executor.execute("help")).not.toContain("stats");
  });

  it("completely skips disabled entries", async () => {
    const application = await createConfiguredApplication(
      join(fixtureDirectory, "skip-disabled.json"),
    );

    expect(application.startupMessages).toEqual([]);
    expect(application.installedPlugins).toEqual([
      "@svgframe/plugin-builtin-shapes",
      "@svgframe/plugin-builtin-commands",
    ]);
  });

  it("passes config options to the activation context", async () => {
    const application = await createConfiguredApplication(
      join(fixtureDirectory, "options.json"),
    );
    const executor = createExecutor(application);

    expect(application.startupMessages).toEqual([]);
    expect(executor.execute("option-value")).toBe("option received");
  });
});

function createExecutor(
  application: Awaited<ReturnType<typeof createConfiguredApplication>>,
): CommandExecutor {
  return new CommandExecutor(
    application.editor,
    application.formatter,
    application.router,
  );
}
