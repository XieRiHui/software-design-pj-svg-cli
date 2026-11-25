import {
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type CanvasDocument } from "../../src/domain/CanvasDocument.js";
import { type Shape } from "../../src/domain/Shape.js";
import { SvgWriter } from "../../src/infrastructure/SvgWriter.js";
import { createTestSvgReader } from "../helpers/TestPlugins.js";

interface ShapeSnapshot {
  readonly type: string;
  readonly id: string;
  readonly attributes: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  readonly children: readonly ShapeSnapshot[];
}

describe("SvgWriter", () => {
  const reader = createTestSvgReader();
  const writer = new SvgWriter();
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "svg-editor-writer-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("writes a browser-ready SVG declaration, namespace, and viewBox", () => {
    const document = reader.parseContent([
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">',
      '  <g id="group" fill="none">',
      '    <rect id="rect" x="10" y="20" width="30" height="40" fill="#fff"/>',
      '    <text id="title" x="5" y="15">A &amp; B &lt; C</text>',
      "  </g>",
      "</svg>",
    ].join("\n")).document;

    const output = writer.serialize(document);

    expect(output).toContain(
      '<?xml version="1.0" encoding="UTF-8"?>',
    );
    expect(output).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">',
    );
    expect(output).toContain('<g id="group" fill="none">');
    expect(output).toContain(
      '<rect id="rect" x="10" y="20" width="30" height="40" fill="#fff"/>',
    );
    expect(output).toContain(
      '<text id="title" x="5" y="15">A &amp; B &lt; C</text>',
    );
    expect(output.endsWith("</svg>\n")).toBe(true);
  });

  it("round-trips the supported tree, attributes, text, and order", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">',
      '  <rect id="bg" x="0" y="0" width="400" height="300" fill="#fff"/>',
      '  <g id="flow" stroke="black" stroke-width="1.5">',
      '    <circle id="node" cx="50" cy="50" r="20" fill="red"/>',
      '    <text id="label" x="20" y="30">Start</text>',
      '    <line id="edge" x1="70" y1="50" x2="120" y2="50"/>',
      "  </g>",
      '  <ellipse id="badge" cx="150" cy="50" rx="10" ry="5"/>',
      "</svg>",
    ].join("\n");
    const first = reader.parseContent(source).document;

    const second = reader.parseContent(
      writer.serialize(first),
    ).document;

    expect(snapshot(second)).toEqual(snapshot(first));
    expect(second.width).toBe(first.width);
    expect(second.height).toBe(first.height);
  });

  it("writes to a file and reports write failures", () => {
    const document = reader.parseContent(
      '<svg width="100" height="100"><rect id="r1" x="0" y="0" width="10" height="10"/></svg>',
    ).document;
    const filePath = join(directory, "output.svg");

    writer.write(document, filePath);
    expect(reader.read(filePath).document.elementCount).toBe(1);

    const invalidPath = join(directory, "missing", "output.svg");
    expect(() => writer.write(document, invalidPath)).toThrow(
      `cannot write file: ${invalidPath}`,
    );
  });
});

function snapshot(document: CanvasDocument): readonly ShapeSnapshot[] {
  return document.rootShapes.map(toSnapshot);
}

function toSnapshot(shape: Shape): ShapeSnapshot {
  return {
    type: shape.typeName,
    id: shape.id,
    attributes: shape.getShowAttributes(),
    children: shape.children.map(toSnapshot),
  };
}
