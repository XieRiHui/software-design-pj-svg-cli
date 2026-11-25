import { describe, expect, it } from "vitest";

import { Editor } from "../../src/application/Editor.js";
import { CreateCommand } from "../../src/application/commands/CreateCommand.js";
import { MoveCommand } from "../../src/application/commands/MoveCommand.js";
import { ScaleCommand } from "../../src/application/commands/ScaleCommand.js";
import { SetCommand } from "../../src/application/commands/SetCommand.js";
import { CanvasDocument } from "../../src/domain/CanvasDocument.js";
import { EditorError } from "../../src/shared/EditorError.js";
import { TEST_SHAPES } from "../helpers/TestPlugins.js";

describe("Editor", () => {
  it("starts without a document", () => {
    const editor = new Editor();

    expect(editor.hasDocument).toBe(false);
    expect(editor.canvasSize).toBeUndefined();
    expect(editor.document).toBeUndefined();
  });

  it("validates before replacing existing canvas state", () => {
    const editor = new Editor();
    editor.initialize(400, 300);
    const originalDocument = editor.document;

    expect(() => editor.initialize(0, 300)).toThrow(EditorError);
    expect(editor.hasDocument).toBe(true);
    expect(editor.canvasSize).toEqual({ width: 400, height: 300 });
    expect(editor.document).toBe(originalDocument);
  });

  it("creates a domain canvas document when initialized", () => {
    const editor = new Editor();

    editor.initialize(800, 600);

    expect(editor.document).toBeInstanceOf(CanvasDocument);
    expect(editor.document?.width).toBe(800);
    expect(editor.document?.height).toBe(600);
  });

  it("uses one snapshot entry for one edit and supports redo", () => {
    const editor = new Editor();
    editor.initialize(400, 300);
    editor.execute(
      new CreateCommand(
        "rect",
        "r1",
        ["10", "20", "30", "40"],
        null,
        TEST_SHAPES,
      ),
    );
    editor.execute(new MoveCommand("r1", 5, 10));

    editor.undo();
    expect(editor.document?.getShape("r1")?.getAttribute("x")).toBe(
      "10",
    );

    editor.redo();
    expect(editor.document?.getShape("r1")?.getAttribute("x")).toBe(
      "15",
    );
  });

  it("restores the whole document on a failed edit", () => {
    const editor = new Editor();
    editor.initialize(400, 300);
    editor.execute(
      new CreateCommand("g", "g1", [], null, TEST_SHAPES),
    );
    editor.execute(
      new CreateCommand(
        "rect",
        "r1",
        ["10", "20", "30", "40"],
        "g1",
        TEST_SHAPES,
      ),
    );
    editor.execute(new MoveCommand("r1", 5, 0));
    editor.undo();

    expect(() =>
      editor.execute(new SetCommand("r1", "opacity", "0.5")),
    ).toThrow("unknown attribute: opacity");

    expect(editor.document?.getShape("r1")?.getAttribute("x")).toBe(
      "10",
    );
    const redone = editor.redo();
    expect(redone.kind).toBe("move");
  });

  it("clears redo after a new successful edit", () => {
    const editor = new Editor();
    editor.initialize(400, 300);
    editor.execute(
      new CreateCommand(
        "rect",
        "r1",
        ["0", "0", "10", "10"],
        null,
        TEST_SHAPES,
      ),
    );
    editor.execute(new MoveCommand("r1", 5, 0));
    editor.undo();
    editor.execute(
      new CreateCommand(
        "circle",
        "c1",
        ["10", "10", "5"],
        null,
        TEST_SHAPES,
      ),
    );

    expect(() => editor.redo()).toThrow("nothing to redo");
  });

  it("undoes a group scale as one command unit", () => {
    const editor = new Editor();
    editor.initialize(400, 300);
    editor.execute(
      new CreateCommand("g", "g1", [], null, TEST_SHAPES),
    );
    editor.execute(
      new CreateCommand(
        "rect",
        "r1",
        ["10", "20", "30", "40"],
        "g1",
        TEST_SHAPES,
      ),
    );
    editor.execute(
      new CreateCommand(
        "text",
        "t1",
        ["5", "10", "Label"],
        "g1",
        TEST_SHAPES,
      ),
    );

    editor.execute(new ScaleCommand("g1", 2));
    editor.undo();

    expect(editor.document?.getShape("r1")?.getAttribute("width")).toBe(
      "30",
    );
    expect(editor.document?.getShape("t1")?.getAttribute("x")).toBe(
      "5",
    );
  });

  it("disables history after init and preserves it on a failed init", () => {
    const editor = new Editor();
    editor.initialize(400, 300);
    editor.execute(
      new CreateCommand("g", "g1", [], null, TEST_SHAPES),
    );

    expect(() => editor.initialize(0, 300)).toThrow(EditorError);
    editor.undo();
    expect(editor.document?.getShape("g1")).toBeUndefined();

    editor.execute(
      new CreateCommand("g", "g2", [], null, TEST_SHAPES),
    );
    editor.initialize(200, 100);
    expect(() => editor.undo()).toThrow(
      "undo not allowed after io command",
    );
  });
});
