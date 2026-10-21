import { describe, expect, it } from "vitest";

import { Editor } from "../../src/application/Editor.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("Editor", () => {
  it("starts without a document", () => {
    const editor = new Editor();

    expect(editor.hasDocument).toBe(false);
    expect(editor.canvasSize).toBeUndefined();
  });

  it("validates before replacing existing canvas state", () => {
    const editor = new Editor();
    editor.initialize(400, 300);

    expect(() => editor.initialize(0, 300)).toThrow(EditorError);
    expect(editor.hasDocument).toBe(true);
    expect(editor.canvasSize).toEqual({ width: 400, height: 300 });
  });
});
