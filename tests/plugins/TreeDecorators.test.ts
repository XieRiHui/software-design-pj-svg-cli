import {
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createPluginApplication,
  type PluginApplication,
} from "../../src/bootstrap/ApplicationAssembler.js";
import { CommandExecutor } from "../../src/cli/CommandExecutor.js";
import { shapeBoxPlugin } from "../../src/plugins/shape-box/index.js";
import { treeBoxLabelPlugin } from "../../src/plugins/tree-box-label/index.js";
import { treeStarPlugin } from "../../src/plugins/tree-star/index.js";

describe("tree decorator plugins", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("marks new nodes, clears at save, and returns when redo reapplies an edit", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-tree-star-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "clean.svg");
    const executor = createExecutor(createPluginApplication({
      plugins: [treeStarPlugin],
    }));
    executor.execute("init");

    expect(executor.execute("tree")).toBe("svg (800x600)  *");
    executor.execute("save \"" + filePath + "\"");
    expect(executor.execute("tree")).toBe("svg (800x600)");

    executor.execute("create rect r1 0 0 10 10");
    expect(executor.execute("tree")).toBe([
      "svg (800x600)  *",
      "└── rect#r1        x=0 y=0 w=10 h=10  *",
    ].join("\n"));

    executor.execute("undo");
    expect(executor.execute("tree")).toBe("svg (800x600)");
    executor.execute("redo");
    expect(executor.execute("tree")).toContain(
      "rect#r1        x=0 y=0 w=10 h=10  *",
    );
  });

  it("propagates a child edit to containers and returns to the save point", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-tree-parent-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "clean.svg");
    const executor = createExecutor(createPluginApplication({
      plugins: [treeStarPlugin],
    }));
    executor.execute("init");
    executor.execute("create g parent");
    executor.execute("create rect child 0 0 10 10 in parent");
    executor.execute(`save "${filePath}"`);

    executor.execute("set child fill red");
    const dirty = executor.execute("tree") ?? "";
    expect(dirty.split("\n")).toEqual([
      "svg (800x600)  *",
      "└── g#parent  *",
      "    └── rect#child  x=0 y=0 w=10 h=10 fill=red  *",
    ]);

    executor.execute("undo");
    expect(executor.execute("tree")).toBe([
      "svg (800x600)",
      "└── g#parent",
      "    └── rect#child  x=0 y=0 w=10 h=10",
    ].join("\n"));
  });

  it("keeps decorator state per activation instead of module-global", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-tree-instances-"));
    temporaryDirectories.push(directory);
    const cleanPath = join(directory, "clean.svg");
    const first = createExecutor(createPluginApplication({
      plugins: [treeStarPlugin],
    }));
    const second = createExecutor(createPluginApplication({
      plugins: [treeStarPlugin],
    }));

    first.execute("init");
    second.execute("init");
    second.execute(`save "${cleanPath}"`);

    expect(first.execute("tree")).toBe("svg (800x600)  *");
    expect(second.execute("tree")).toBe("svg (800x600)");
  });

  it("combines (box) and modified-star without mutual knowledge", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-tree-box-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "box.svg");
    const executor = createExecutor(createPluginApplication({
      plugins: [shapeBoxPlugin, treeBoxLabelPlugin, treeStarPlugin],
    }));
    executor.execute("init");
    executor.execute('create box n1 0 0 100 50 "Box"');

    const dirty = executor.execute("tree") ?? "";
    expect(dirty).toContain("└── g#n1  (box) *");
    expect(dirty).toContain("    ├── rect#n1-rect");

    executor.execute(`save "${filePath}"`);
    const clean = executor.execute("tree") ?? "";
    expect(clean).toContain("└── g#n1  (box)");
    expect(clean).not.toContain("*");

    executor.execute("set n1 fill red");
    expect(executor.execute("tree")).toContain("g#n1  (box) *");
  });
});

function createExecutor(application: PluginApplication): CommandExecutor {
  return new CommandExecutor(
    application.editor,
    application.formatter,
    application.router,
  );
}
