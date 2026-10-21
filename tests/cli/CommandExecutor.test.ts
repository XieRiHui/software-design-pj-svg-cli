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
      "error: command not implemented: create",
    );
    expect(executor.execute('set title text "unfinished')).toBe(
      "error: unterminated quoted argument",
    );
  });
});
