import { describe, expect, it } from "vitest";

import { CommandExecutor } from "../../src/cli/CommandExecutor.js";

describe("Phase 1 acceptance", () => {
  it("runs the documented typical editing session", () => {
    const executor = new CommandExecutor();
    executor.execute("init 800 600");

    expect(executor.execute("create rect bg 0 0 800 600 #ffffff")).toBe(
      "rect#bg created",
    );
    expect(
      executor.execute('create text title 20 40 "My Diagram"'),
    ).toBe("text#title created");
    expect(executor.execute("create circle c1 100 100 20 red")).toBe(
      "circle#c1 created",
    );
    expect(executor.execute("create rect box 200 80 60 60 #3366ff")).toBe(
      "rect#box created",
    );
    expect(executor.execute("group markers c1 box")).toBe(
      "g#markers created with 2 children",
    );

    const tree = executor.execute("tree");
    expect(tree).toContain("rect#bg");
    expect(tree).toContain('text#title');
    expect(tree).toContain("g#markers");
    expect(tree?.indexOf("circle#c1")).toBeLessThan(
      tree?.indexOf("rect#box") ?? -1,
    );

    expect(executor.execute("move c1 30 0")).toBe(
      "circle#c1 moved to (130,100)",
    );
    expect(executor.execute("undo")).toBe(
      "circle#c1 moved back to (100,100)",
    );
    expect(executor.execute("redo")).toBe(
      "circle#c1 moved to (130,100)",
    );
    expect(executor.execute('set title text "My Diagram v2"')).toBe(
      'text#title updated: text="My Diagram v2"',
    );
    expect(executor.execute("undo")).toBe(
      'text#title updated: text="My Diagram"',
    );
    expect(executor.execute("group bad c1 markers")).toBe(
      "error: cannot group a container into its own descendant: markers",
    );
    expect(executor.execute("delete box")).toBe("rect#box deleted");
    expect(executor.execute("undo")).toBe(
      "rect#box restored into g#markers",
    );
  });

  it("builds the two-node flowchart with preserved hierarchy", () => {
    const executor = new CommandExecutor();
    executor.execute("init 800 600");
    executor.execute("create g flowchart");
    executor.execute("create g node1 in flowchart");
    executor.execute("create rect start 120 100 160 60 #4a90d9 in node1");
    executor.execute(
      'create text start-label 155 135 "开始" in node1',
    );
    executor.execute("create g node2 in flowchart");
    executor.execute("create rect process 520 100 160 60 #f5a623 in node2");
    executor.execute(
      'create text process-label 545 135 "处理数据" in node2',
    );
    executor.execute(
      "create line arrow1 280 130 520 130 black in flowchart",
    );

    const tree = executor.execute("tree") ?? "";
    expect(tree).toContain("svg (800x600)");
    expect(tree.indexOf("g#node1")).toBeLessThan(
      tree.indexOf("g#node2"),
    );
    expect(tree.indexOf("rect#start")).toBeLessThan(
      tree.indexOf("text#start-label"),
    );
    expect(tree.indexOf("rect#process")).toBeLessThan(
      tree.indexOf("text#process-label"),
    );
    expect(tree).toContain("line#arrow1");
    expect(tree).toContain("(280,130) -> (520,130)");
    expect(tree).not.toContain("stroke=black");
    expect(executor.execute("show arrow1")).toContain(
      "stroke=black",
    );

    expect(executor.execute("move node2 0 100")).toBe(
      "g#node2 moved by (0,100)",
    );
    expect(executor.execute("undo")).toBe(
      "g#node2 moved back by (0,-100)",
    );
  });

  it("covers the prescribed command errors without mutating state", () => {
    const executor = new CommandExecutor();

    expect(executor.execute("tree")).toBe(
      "error: no document. use 'init' or 'read' first",
    );
    expect(executor.execute("canvas")).toBe(
      "error: no document. use 'init' or 'read' first",
    );
    expect(executor.execute("save output.svg")).toBe(
      "error: no document. use 'init' or 'read' first",
    );

    executor.execute("init 400 300");
    executor.execute("create g container");
    executor.execute("create rect child 0 0 10 10 in container");

    expect(executor.execute("create rect child 1 1 2 2")).toBe(
      "error: id already exists: child",
    );
    expect(executor.execute("delete missing")).toBe(
      "error: no such shape: missing",
    );
    expect(executor.execute("create rect r2 0 0 10 10 in missing")).toBe(
      "error: no such container: missing",
    );
    expect(executor.execute("create rect r2 0 0 10 10 in child")).toBe(
      "error: not a container: child",
    );
    expect(executor.execute("create hexagon h1")).toBe(
      "error: unknown shape type: hexagon (is the plugin loaded?)",
    );
    expect(executor.execute('create box b1 0 0 10 10 "Box"')).toBe(
      "error: unknown shape type: box (is the plugin loaded?)",
    );
    expect(executor.execute("scale child 0")).toBe(
      "error: scale factor must be positive",
    );
    expect(executor.execute("set child opacity 0.5")).toBe(
      "error: unknown attribute: opacity",
    );
    expect(executor.execute("group bad child container")).toBe(
      "error: cannot group a container into its own descendant: container",
    );
    expect(executor.execute("ungroup container")).toBe(
      "error: cannot ungroup top-level container: container",
    );
    expect(executor.execute("front missing")).toBe(
      "error: no such shape: missing",
    );

    expect(executor.execute("undo")).toBe(
      "rect#child creation undone",
    );
    expect(executor.execute("tree")).not.toContain("rect#child");
  });
});
