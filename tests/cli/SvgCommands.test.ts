import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Editor } from "../../src/application/Editor.js";
import { CommandExecutor } from "../../src/cli/CommandExecutor.js";
import { createTestSvgReader } from "../helpers/TestPlugins.js";

describe("SVG commands", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "svg-editor-cli-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("reads a file with warnings and saves without a path", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    const filePath = join(directory, "input.svg");
    writeFileSync(
      filePath,
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">',
        '  <rect x="0" y="0" width="400" height="300" fill="white"/>',
        '  <g id="group">',
        '    <circle id="c1" cx="20" cy="20" r="5"/>',
        "  </g>",
        "</svg>",
      ].join("\n"),
      "utf8",
    );

    expect(executor.execute(`read "${filePath}"`)).toBe(
      [
        "warning: assigned id rect1 to unnamed <rect>",
        `read ${filePath} (3 elements)`,
      ].join("\n"),
    );
    expect(editor.filePath).toBe(filePath);
    expect(executor.execute("tree")).toContain("rect#rect1");

    expect(executor.execute("set c1 cx 30")).toBe(
      "circle#c1 updated: cx=30",
    );
    expect(executor.execute("save")).toBe(
      `saved to ${filePath} (3 elements)`,
    );
    expect(
      createTestSvgReader().read(filePath).document
        .getShape("c1")
        ?.getAttribute("cx"),
    ).toBe("30");
    expect(executor.execute("undo")).toBe(
      "error: undo not allowed after io command",
    );
    expect(executor.execute("set c1 cy 40")).toBe(
      "circle#c1 updated: cy=40",
    );
    expect(executor.execute("undo")).toBe(
      "circle#c1 updated: cy=20",
    );
  });

  it("reads a UTF-8 BOM file written by legacy Windows tools", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    const filePath = join(directory, "bom.svg");
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">',
      '  <rect id="r1" x="0" y="0" width="20" height="10"/>',
      "</svg>",
    ].join("\r\n");
    writeFileSync(
      filePath,
      Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(source, "utf8"),
      ]),
    );

    expect(executor.execute(`read "${filePath}"`)).toBe(
      `read ${filePath} (1 elements)`,
    );
    expect(editor.document?.getShape("r1")).toBeDefined();
    expect(executor.execute("tree")).toContain("rect#r1");
  });

  it("saves to an explicit path and uses it for the next pathless save", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    const firstPath = join(directory, "first.svg");
    const secondPath = join(directory, "second.svg");
    executor.execute("init 200 100");
    executor.execute("create rect r1 0 0 10 10");

    expect(executor.execute(`save "${firstPath}"`)).toBe(
      `saved to ${firstPath} (1 elements)`,
    );
    expect(editor.filePath).toBe(firstPath);
    expect(readFileSync(firstPath, "utf8")).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"',
    );

    executor.execute(`save "${secondPath}"`);
    expect(editor.filePath).toBe(secondPath);
    expect(() => readFileSync(secondPath, "utf8")).not.toThrow();
  });

  it("persists resized canvas dimensions in saved SVG", () => {
    const executor = new CommandExecutor();
    const filePath = join(directory, "resized.svg");
    executor.execute("init 200 100");
    executor.execute("create rect r1 0 0 10 10");
    executor.execute("canvas 320 180");

    expect(executor.execute(`save "${filePath}"`)).toBe(
      `saved to ${filePath} (1 elements)`,
    );
    const saved = createTestSvgReader().read(filePath).document;
    expect(saved.width).toBe(320);
    expect(saved.height).toBe(180);
  });

  it("disables history after read until the next edit", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    const filePath = join(directory, "input.svg");
    writeFileSync(
      filePath,
      '<svg width="100" height="100"><rect id="r1" x="0" y="0" width="10" height="10"/></svg>',
      "utf8",
    );
    executor.execute("init 400 300");
    executor.execute("create g old");

    executor.execute(`read "${filePath}"`);
    expect(executor.execute("undo")).toBe(
      "error: undo not allowed after io command",
    );
    expect(executor.execute("move r1 5 0")).toBe(
      "rect#r1 moved to (5,0)",
    );
    expect(executor.execute("undo")).toBe(
      "rect#r1 moved back to (0,0)",
    );
  });

  it("preserves the current document and history after read failure", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    const missingPath = join(directory, "missing.svg");
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");

    expect(executor.execute(`read "${missingPath}"`)).toBe(
      `error: cannot read file: ${missingPath}`,
    );
    expect(editor.document?.getShape("r1")).toBeDefined();
    expect(executor.execute("undo")).toBe(
      "rect#r1 creation undone",
    );
  });

  it("preserves document and history after save failure", () => {
    const editor = new Editor();
    const executor = new CommandExecutor(editor);
    const invalidPath = join(directory, "missing", "output.svg");
    executor.execute("init 400 300");
    executor.execute("create rect r1 0 0 10 10");

    expect(executor.execute(`save "${invalidPath}"`)).toBe(
      `error: cannot write file: ${invalidPath}`,
    );
    expect(editor.filePath).toBeUndefined();
    expect(executor.execute("undo")).toBe(
      "rect#r1 creation undone",
    );
  });

  it("requires a path when saving an initialized document", () => {
    const executor = new CommandExecutor();
    executor.execute("init 400 300");

    expect(executor.execute("save")).toBe(
      "error: no file path for save",
    );
  });
});
