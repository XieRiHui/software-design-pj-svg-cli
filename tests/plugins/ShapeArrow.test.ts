import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createPluginApplication,
  type PluginApplication,
} from "../../src/bootstrap/ApplicationAssembler.js";
import { createConfiguredApplication } from "../../src/bootstrap/configuredAssembly.js";
import { CommandExecutor } from "../../src/cli/CommandExecutor.js";
import { Arrow } from "../../src/plugins/shape-arrow/Arrow.js";
import { shapeArrowPlugin } from "../../src/plugins/shape-arrow/index.js";
import { commandStatsPlugin } from "../../src/plugins/command-stats/index.js";

describe("arrow shape plugin", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("creates, moves, scales, sets, clones, and counts an arrow", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [shapeArrowPlugin, commandStatsPlugin],
    }));
    executor.execute("init 400 300");

    expect(
      executor.execute("create arrow a1 10 20 110 40 #3366ff"),
    ).toBe("arrow#a1 created");
    expect(executor.execute("tree")).toBe([
      "svg (400x300)",
      "└── arrow#a1       (10,20) -> (110,40)",
    ].join("\n"));
    expect(executor.execute("show a1")).toContain("arrow#a1  parent=svg");
    expect(executor.execute("show a1")).toContain("d=M 10 20");
    expect(executor.execute("show a1")).toContain("stroke=#3366ff");
    expect(executor.execute("stats")).toBe(
      "arrow: 1  (total 1, containers 0)",
    );

    expect(executor.execute("move a1 5 -10")).toBe(
      "arrow#a1 moved to (15,10)",
    );
    expect(executor.execute("undo")).toBe(
      "arrow#a1 moved back to (10,20)",
    );
    expect(executor.execute("redo")).toBe(
      "arrow#a1 moved to (15,10)",
    );
    expect(executor.execute("set a1 x2 150")).toBe(
      "arrow#a1 updated: x2=150",
    );
    expect(executor.execute("scale a1 2")).toBe("arrow#a1 scaled by 2");

    const arrow = new Arrow("a2", 1, 2, 30, 40, "red", 2);
    const clone = arrow.clone();
    clone.setAttribute("x1", "100");
    clone.setAttribute("stroke", "blue");
    expect(arrow.x1).toBe(1);
    expect(arrow.stroke).toBe("red");
    expect(clone.x1).toBe(100);
    expect(clone.stroke).toBe("blue");
  });

  it("round-trips the path representation and degrades when disabled", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-arrow-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "arrow.svg");

    const writer = createExecutor(createPluginApplication({
      plugins: [shapeArrowPlugin],
    }));
    writer.execute("init");
    writer.execute("create arrow a1 10 20 110 40 #3366ff");
    writer.execute("set a1 stroke-width 2");
    writer.execute(`save "${filePath}"`);

    const saved = readFileSync(filePath, "utf8");
    expect(saved).toContain("<path id=\"a1\" d=\"M 10 20");
    expect(saved).toContain('fill="none"');
    expect(saved).toContain('stroke="#3366ff"');
    expect(saved).toContain('stroke-width="2"');
    expect(saved).toContain('data-kind="arrow"');
    expect(saved).toContain('data-x1="10"');
    expect(saved).toContain('data-y2="40"');

    const reloaded = createPluginApplication({
      plugins: [shapeArrowPlugin],
    });
    const reader = createExecutor(reloaded);
    expect(reader.execute(`read "${filePath}"`)).toBe(
      `read ${filePath} (1 elements)`,
    );
    expect(reloaded.editor.document?.getShape("a1")).toBeInstanceOf(Arrow);
    expect(reader.execute("show a1")).toContain("stroke=#3366ff");

    const disabled = createPluginApplication();
    const skipped = createExecutor(disabled);
    expect(skipped.execute(`read "${filePath}"`)).toBe([
      "warning: skipped unsupported element <path>",
      `read ${filePath} (0 elements)`,
    ].join("\n"));
  });

  it("produces identical output through code and config assembly", async () => {
    const codeApplication = createPluginApplication({
      plugins: [shapeArrowPlugin, commandStatsPlugin],
    });
    const configuredApplication = await createConfiguredApplication(
      join(
        process.cwd(),
        "tests",
        "fixtures",
        "plugin-configs",
        "arrow.json",
      ),
    );
    const lines = [
      "init 400 300",
      "create arrow a1 10 20 110 40 #3366ff",
      "tree",
      "stats",
    ];

    expect(executeLines(createExecutor(configuredApplication), lines)).toEqual(
      executeLines(createExecutor(codeApplication), lines),
    );
  });
});

function createExecutor(application: PluginApplication): CommandExecutor {
  return new CommandExecutor(
    application.editor,
    application.formatter,
    application.router,
  );
}

function executeLines(
  executor: CommandExecutor,
  lines: readonly string[],
): readonly (string | null)[] {
  return lines.map((line) => executor.execute(line));
}
