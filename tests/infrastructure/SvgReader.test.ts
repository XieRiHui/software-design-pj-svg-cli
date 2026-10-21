import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Group } from "../../src/domain/Group.js";
import { SvgReader } from "../../src/infrastructure/SvgReader.js";

describe("SvgReader", () => {
  const reader = new SvgReader();
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "svg-editor-reader-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("reads canvas dimensions, all built-in shapes, attributes, text, and order", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
      '  <g id="g1" fill="none" stroke="black" stroke-width="2">',
      '    <rect id="r1" x="0" y="0" width="400" height="300" fill="#ffffff"/>',
      '    <g id="inner">',
      '      <circle id="c1" cx="50" cy="60" r="10" fill="red"/>',
      '      <text id="t1" x="10" y="290">Hello &amp; SVG</text>',
      "    </g>",
      "  </g>",
      '  <line id="l1" x1="0" y1="0" x2="20" y2="20" stroke="blue"/>',
      '  <ellipse id="e1" cx="100" cy="100" rx="20" ry="10"/>',
      "</svg>",
    ].join("\n");

    const result = reader.parseContent(source);
    const document = result.document;

    expect(document.width).toBe(400);
    expect(document.height).toBe(300);
    expect(document.elementCount).toBe(7);
    expect(document.rootShapes.map((shape) => shape.id)).toEqual([
      "g1",
      "l1",
      "e1",
    ]);
    expect(document.getParent("r1")?.id).toBe("g1");
    expect(document.getParent("c1")?.id).toBe("inner");
    expect(document.getParent("t1")?.id).toBe("inner");
    expect(document.getShape("g1")).toBeInstanceOf(Group);
    expect(document.getShape("g1")?.getAttribute("fill")).toBe("none");
    expect(document.getShape("g1")?.getAttribute("stroke")).toBe("black");
    expect(document.getShape("g1")?.getAttribute("stroke-width")).toBe(
      "2",
    );
    expect(document.getShape("r1")?.getAttribute("fill")).toBe(
      "#ffffff",
    );
    expect(document.getShape("c1")?.getAttribute("r")).toBe("10");
    expect(document.getShape("t1")?.getAttribute("text")).toBe(
      "Hello & SVG",
    );
    expect(document.getShape("l1")?.getAttribute("stroke")).toBe(
      "blue",
    );
    expect(document.getShape("e1")?.getAttribute("rx")).toBe("20");
    expect(result.warnings).toEqual([]);
  });

  it("assigns deterministic missing ids without colliding with explicit ids", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">',
      '  <rect id="rect1" x="0" y="0" width="10" height="10"/>',
      '  <rect x="10" y="0" width="10" height="10"/>',
      '  <rect x="20" y="0" width="10" height="10"/>',
      '  <circle cx="30" cy="10" r="5"/>',
      '  <g><rect x="40" y="10" width="5" height="5"/></g>',
      "</svg>",
    ].join("\n");

    const result = reader.parseContent(source);

    expect(result.document.rootShapes.map((shape) => shape.id)).toEqual([
      "rect1",
      "rect2",
      "rect3",
      "circle1",
      "g1",
    ]);
    expect(result.document.getShape("rect2")).toBeDefined();
    expect(result.document.getShape("rect3")).toBeDefined();
    expect(result.document.getShape("g1")?.children[0]?.id).toBe("rect4");
    expect(result.warnings).toEqual([
      "warning: assigned id rect2 to unnamed <rect>",
      "warning: assigned id rect3 to unnamed <rect>",
      "warning: assigned id circle1 to unnamed <circle>",
      "warning: assigned id g1 to unnamed <g>",
      "warning: assigned id rect4 to unnamed <rect>",
    ]);
  });

  it("reads UTF-8 files containing a byte order mark", () => {
    const filePath = join(directory, "bom.svg");
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">',
      '  <rect id="r1" x="0" y="0" width="320" height="200"/>',
      "</svg>",
    ].join("\n");
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    writeFileSync(
      filePath,
      Buffer.concat([bom, Buffer.from(source, "utf8")]),
    );

    const result = reader.read(filePath);

    expect(result.document.width).toBe(320);
    expect(result.document.height).toBe(200);
    expect(result.document.getShape("r1")?.typeName).toBe("rect");
    expect(result.warnings).toEqual([]);
  });

  it("skips unsupported elements and degrades data-kind groups to g", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">',
      '  <path id="path1" d="M0 0L10 10"/>',
      '  <g id="box" data-kind="box">',
      '    <rect id="inside" x="0" y="0" width="10" height="10"/>',
      "  </g>",
      "</svg>",
    ].join("\n");

    const result = reader.parseContent(source);

    expect(result.document.getShape("path1")).toBeUndefined();
    expect(result.document.getShape("box")).toBeInstanceOf(Group);
    expect(result.document.getParent("inside")?.id).toBe("box");
    expect(result.document.elementCount).toBe(2);
  });

  it("does not reserve ids from unsupported containers such as defs", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">',
      '  <defs><rect id="same" x="0" y="0" width="5" height="5"/></defs>',
      '  <rect id="same" x="10" y="10" width="10" height="10"/>',
      "</svg>",
    ].join("\n");

    const result = reader.parseContent(source);

    expect(result.document.rootShapes.map((shape) => shape.id)).toEqual([
      "same",
    ]);
    expect(result.document.elementCount).toBe(1);
  });

  it("rejects duplicate explicit ids when reading a file", () => {
    const filePath = join(directory, "duplicate.svg");
    writeFileSync(
      filePath,
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">',
        '  <rect id="same" x="0" y="0" width="10" height="10"/>',
        '  <circle id="same" cx="10" cy="10" r="5"/>',
        "</svg>",
      ].join("\n"),
      "utf8",
    );

    expect(() => reader.read(filePath)).toThrow(
      `cannot read file: ${filePath}`,
    );
  });

  it("reports missing files and invalid XML with the read error", () => {
    const missingPath = join(directory, "missing.svg");
    expect(() => reader.read(missingPath)).toThrow(
      `cannot read file: ${missingPath}`,
    );

    const invalidPath = join(directory, "invalid.svg");
    writeFileSync(
      invalidPath,
      '<svg width="100" height="100"><rect></svg>',
      "utf8",
    );
    expect(() => reader.read(invalidPath)).toThrow(
      `cannot read file: ${invalidPath}`,
    );
  });
});
