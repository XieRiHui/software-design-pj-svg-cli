import { describe, expect, it } from "vitest";

import {
  isSvgDecorationCandidate,
  shouldDecorateSvg,
} from "../src/svgFileDecorationPolicy.js";

describe("SVG file decoration policy", () => {
  it("accepts SVG files case-insensitively", () => {
    expect(isSvgDecorationCandidate("/workspace/demo.svg")).toBe(true);
    expect(isSvgDecorationCandidate("/workspace/DIAGRAM.SVG")).toBe(true);
  });

  it("rejects ordinary files and unrelated suffixes", () => {
    expect(isSvgDecorationCandidate("/workspace/notes.txt")).toBe(false);
    expect(isSvgDecorationCandidate("/workspace/archive.svg.txt")).toBe(false);
  });

  it("never decorates directories, even when their names end in svg", () => {
    expect(shouldDecorateSvg("/workspace/demo.svg", true)).toBe(false);
    expect(shouldDecorateSvg("/workspace/demo.svg", false)).toBe(true);
  });
});
