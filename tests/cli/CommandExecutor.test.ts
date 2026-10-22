import { describe, expect, it } from "vitest";

import { Editor } from "../../src/application/Editor.js";
import { CommandExecutor } from "../../src/cli/CommandExecutor.js";

describe("CommandExecutor", () => {
  it("shows help without an open document", () => {
    const output = new CommandExecutor().execute("help");

    expect(output).toContain("init [w] [h]");
    expect(output).toContain(
      "create <type> <id> [params...] [in <containerId>]",
    );
    expect(output).toContain("undo");
  });

  it("ignores blank lines and comments", () => {
    const executor = new CommandExecutor();

    expect(executor.execute("")).toBeNull();
    expect(executor.execute("   ")).toBeNull();
    expect(executor.execute(" # ignored")).toBeNull();
  });

  it("initializes the default canvas", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);

    expect(executor.execute("init")).toBe("canvas 800x600 created");
    expect(editor.canvasSize).toEqual({ width: 800, height: 600 });
  });

  it("initializes a custom canvas with quoted dimensions", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);

    expect(executor.execute('init "640" "480"')).toBe(
      "canvas 640x480 created",
    );
    expect(editor.canvasSize).toEqual({ width: 640, height: 480 });
  });

  it("requires a document for commands other than help and init", () => {
    const executor = new CommandExecutor();

    expect(executor.execute("tree")).toBe(
      "error: no document. use 'init' or 'read' first",
    );
  });

  it("rejects invalid initialization without changing state", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);

    expect(executor.execute("init 320 240")).toBe(
      "canvas 320x240 created",
    );
    expect(executor.execute("init nope 240")).toBe(
      "error: invalid canvas size",
    );
    expect(executor.execute("init 0 240")).toBe(
      "error: invalid canvas size",
    );
    expect(executor.execute("init 320")).toBe(
      "error: usage: init [w] [h]",
    );
    expect(editor.canvasSize).toEqual({ width: 320, height: 240 });
  });

  it("returns unified errors for unavailable and unknown commands", () => {
    const executor = new CommandExecutor();

    expect(executor.execute("wat")).toBe(
      "error: unknown command: wat",
    );
    expect(executor.execute("init")).toBe("canvas 800x600 created");
    expect(executor.execute("create g scene")).toBe(
      "g#scene created",
    );
    expect(executor.execute("group cluster scene")).toBe(
      "g#cluster created with 1 child",
    );
    expect(executor.execute('set title text "unfinished')).toBe(
      "error: unterminated quoted argument",
    );
  });

  it("creates nested shapes and displays the document tree", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");

    expect(executor.execute("create g node1")).toBe(
      "g#node1 created",
    );
    expect(
      executor.execute(
        'create rect start 10 20 30 40 red in node1',
      ),
    ).toBe("rect#start created in g#node1");
    expect(
      executor.execute(
        'create text label 15 45 "Hello" in node1',
      ),
    ).toBe("text#label created in g#node1");

    const tree = executor.execute("tree");
    expect(tree).toContain("svg (400x300)");
    expect(tree).toContain("g#node1");
    expect(tree).toContain(
      "rect#start",
    );
    expect(tree).toContain("x=10 y=20 w=30 h=40 fill=red");
    expect(tree).toContain('text#label');
    expect(tree).toContain('(15,45) "Hello"');

    const subtree = executor.execute("tree node1");
    expect(subtree?.startsWith("g#node1")).toBe(true);
    expect(subtree).not.toContain("svg (400x300)");
  });

  it("shows shape attributes and parent information", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create g node1");
    executor.execute("create circle c1 50 60 10 red in node1");

    expect(executor.execute("show c1")).toBe(
      [
        "circle#c1  parent=g#node1",
        "  cx=50",
        "  cy=60",
        "  r=10",
        "  fill=red",
      ].join("\n"),
    );
    expect(executor.execute("show missing")).toBe(
      "error: no such shape: missing",
    );
  });

  it("moves shapes and supports undo and redo feedback", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create circle c1 100 100 20 red");

    expect(executor.execute("move c1 30 0")).toBe(
      "circle#c1 moved to (130,100)",
    );
    expect(executor.execute("undo")).toBe(
      "circle#c1 moved back to (100,100)",
    );
    expect(executor.execute("redo")).toBe(
      "circle#c1 moved to (130,100)",
    );
  });

  it("updates and scales shapes, then restores their prior values", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create text title 20 40 \"My Diagram\"");

    expect(executor.execute('set title text "My Diagram v2"')).toBe(
      'text#title updated: text="My Diagram v2"',
    );
    expect(executor.execute("undo")).toBe(
      'text#title updated: text="My Diagram"',
    );
    expect(executor.execute("redo")).toBe(
      'text#title updated: text="My Diagram v2"',
    );
    expect(executor.execute("scale title 2")).toBe(
      "text#title scaled by 2",
    );
    expect(executor.execute("undo")).toBe(
      "text#title scale undone",
    );
  });

  it("deletes a shape and restores it into its original parent", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create g node1");
    executor.execute("create rect r1 0 0 10 10 in node1");

    expect(executor.execute("delete r1")).toBe("rect#r1 deleted");
    expect(executor.execute("undo")).toBe(
      "rect#r1 restored into g#node1",
    );
    expect(executor.execute("redo")).toBe("rect#r1 deleted");
  });

  it("deletes a whole container as one undo unit", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create g group");
    executor.execute("create rect child 0 0 10 10 in group");

    expect(executor.execute("delete group")).toBe("g#group deleted");
    expect(executor.execute("show child")).toBe(
      "error: no such shape: child",
    );
    expect(executor.execute("undo")).toBe(
      "g#group restored to svg",
    );
    expect(executor.execute("show child")).toContain(
      "rect#child  parent=g#group",
    );
  });

  it("does not add display commands to history", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");
    executor.execute("tree");
    executor.execute("show r1");

    expect(executor.execute("undo")).toBe(
      "rect#r1 creation undone",
    );
    expect(executor.execute("redo")).toBe("rect#r1 created");
  });

  it("keeps history unchanged after a failed edit", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");
    executor.execute("move r1 5 0");
    executor.execute("undo");

    expect(executor.execute("set r1 opacity 0.5")).toBe(
      "error: unknown attribute: opacity",
    );
    expect(editor.document?.getShape("r1")?.getAttribute("x")).toBe("0");
    expect(executor.execute("redo")).toBe("rect#r1 moved to (5,0)");
  });

  it("clears redo after a new edit and disables history after init", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");
    executor.execute("move r1 5 0");
    executor.execute("undo");
    executor.execute("create circle c1 20 20 5");

    expect(executor.execute("redo")).toBe(
      "error: nothing to redo",
    );

    executor.execute("init 200 100");
    expect(executor.execute("undo")).toBe(
      "error: nothing to undo",
    );
    expect(executor.execute("redo")).toBe(
      "error: nothing to redo",
    );
  });

  it("queries and resizes the canvas with IO history boundaries", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");

    expect(executor.execute("canvas")).toBe("canvas 400x300");
    expect(executor.execute("canvas 640 480")).toBe(
      "canvas resized to 640x480",
    );
    expect(executor.execute("canvas")).toBe("canvas 640x480");
    expect(executor.execute("undo")).toBe(
      "error: nothing to undo",
    );

    expect(executor.execute("move r1 5 0")).toBe(
      "rect#r1 moved to (5,0)",
    );
    expect(executor.execute("undo")).toBe(
      "rect#r1 moved back to (0,0)",
    );
    expect(executor.execute("undo")).toBe(
      "error: nothing to undo",
    );
  });

  it("keeps canvas and history unchanged when resize fails", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");

    expect(executor.execute("canvas 0 200")).toBe(
      "error: invalid canvas size",
    );
    expect(executor.execute("canvas nope 200")).toBe(
      "error: invalid canvas size",
    );
    expect(executor.execute("canvas 200")).toBe(
      "error: usage: canvas [w] [h]",
    );
    expect(executor.execute("canvas")).toBe("canvas 400x300");
    expect(executor.execute("undo")).toBe(
      "rect#r1 creation undone",
    );
  });

  it("enforces core argument and shape errors without mutation", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");

    expect(executor.execute("create rect r1 1 1 2 2")).toBe(
      "error: id already exists: r1",
    );
    expect(executor.execute("create hexagon h1")).toBe(
      "error: unknown shape type: hexagon (is the plugin loaded?)",
    );
    expect(executor.execute("create rect r2 0 0 10 10 in r1")).toBe(
      "error: not a container: r1",
    );
    expect(executor.execute("scale r1 0")).toBe(
      "error: scale factor must be positive",
    );
    expect(editor.document?.getShape("r2")).toBeUndefined();
    expect(editor.document?.getShape("r1")?.getAttribute("width")).toBe(
      "10",
    );
  });

  it("groups shapes in order as one undo unit", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create rect a 0 0 10 10");
    executor.execute("create rect b 10 0 10 10");
    executor.execute("create rect c 20 0 10 10");

    expect(executor.execute("group group c a")).toBe(
      "g#group created with 2 children",
    );
    expect(executor.execute("tree")).toContain(
      "└── g#group",
    );
    const subtree = executor.execute("tree group")?.split("\n") ?? [];
    expect(subtree[0]).toBe("g#group");
    expect(subtree).toHaveLength(3);
    expect(subtree[1]).toContain("rect#c");
    expect(subtree[2]).toContain("rect#a");

    expect(executor.execute("undo")).toBe(
      "g#group grouping undone",
    );
    expect(executor.execute("tree")).not.toContain("g#group");
    expect(executor.execute("redo")).toBe(
      "g#group created with 2 children",
    );
  });

  it("rejects grouping a container with its descendant and preserves redo", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    executor.execute("init 400 300");
    executor.execute("create rect outside 0 0 10 10");
    executor.execute("create g container");
    executor.execute("create rect child 10 0 10 10 in container");
    executor.execute("move child 5 0");
    executor.execute("undo");

    expect(executor.execute("group bad child container")).toBe(
      "error: cannot group a container into its own descendant: container",
    );
    expect(executor.execute("show child")).toContain(
      "rect#child  parent=g#container",
    );
    expect(executor.execute("redo")).toBe(
      "rect#child moved to (15,0)",
    );
    expect(editor.document?.getShape("bad")).toBeUndefined();
  });

  it("ungroups nested containers and rejects top-level containers", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create g parent");
    executor.execute("create g nested");
    executor.execute("addto parent nested");
    executor.execute("create rect a 0 0 10 10 in nested");
    executor.execute("create rect b 10 0 10 10 in nested");

    expect(executor.execute("ungroup nested")).toBe(
      "g#nested ungrouped",
    );
    expect(executor.execute("show a")).toContain(
      "rect#a  parent=g#parent",
    );
    expect(executor.execute("ungroup parent")).toBe(
      "error: cannot ungroup top-level container: parent",
    );
    expect(executor.execute("undo")).toBe(
      "g#nested restored with 2 children",
    );
  });

  it("adds shapes last and moves them to front or back within siblings", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");
    executor.execute("create g group");
    executor.execute("create rect a 0 0 10 10");
    executor.execute("create rect b 10 0 10 10");

    expect(executor.execute("addto group a")).toBe(
      "rect#a added to g#group",
    );
    expect(executor.execute("addto group b")).toBe(
      "rect#b added to g#group",
    );
    expect(executor.execute("front a")).toBe(
      "rect#a moved to front",
    );
    expect(executor.execute("tree group")).toContain(
      "├── rect#b",
    );
    expect(executor.execute("back a")).toBe(
      "rect#a moved to back",
    );
    expect(executor.execute("show a")).toContain(
      "rect#a  parent=g#group",
    );
    expect(executor.execute("addto group group")).toBe(
      "error: cannot move a container into its own descendant: group",
    );
  });
});
