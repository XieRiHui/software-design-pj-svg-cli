import { describe, expect, it } from "vitest";

import { Editor } from "../../src/application/Editor.js";
import { CanvasDocument } from "../../src/domain/CanvasDocument.js";
import { EditorError } from "../../src/shared/EditorError.js";

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
});
