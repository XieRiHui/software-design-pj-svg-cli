import { describe, expect, it } from "vitest";

import { History } from "../../src/application/History.js";
import { CanvasDocument } from "../../src/domain/CanvasDocument.js";
import { EditorError } from "../../src/shared/EditorError.js";

const result = {
  kind: "create",
  typeName: "rect",
  id: "r1",
  containerId: null,
} as const;

describe("History", () => {
  it("moves entries between undo and redo stacks", () => {
    const history = new History();
    const before = new CanvasDocument(100, 100);
    const after = new CanvasDocument(100, 100);
    history.record({ before, after, result });

    const undone = history.takeUndo();
    expect(undone.before).toBe(before);
    expect(undone.after).toBe(after);

    const redone = history.takeRedo();
    expect(redone).toBe(undone);
  });

  it("clears redo entries when a new edit is recorded", () => {
    const history = new History();
    const document = new CanvasDocument(100, 100);
    history.record({ before: document, after: document, result });
    history.takeUndo();

    history.record({ before: document, after: document, result });

    expect(() => history.takeRedo()).toThrow("nothing to redo");
  });

  it("disables undo and redo until reset is followed by an edit", () => {
    const history = new History();
    const document = new CanvasDocument(100, 100);
    history.record({ before: document, after: document, result });
    history.reset();

    expect(() => history.takeUndo()).toThrow(EditorError);
    expect(() => history.takeUndo()).toThrow(
      "undo not allowed after io command",
    );
  });

  it("reports an empty stack after history is enabled", () => {
    const history = new History();
    const document = new CanvasDocument(100, 100);
    history.record({ before: document, after: document, result });
    history.takeUndo();
    history.takeRedo();
    history.takeUndo();

    expect(() => history.takeUndo()).toThrow("nothing to undo");
  });
});
