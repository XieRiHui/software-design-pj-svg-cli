import { describe, expect, it } from "vitest";

import { parseSvgOutline } from "../src/svgOutlineParser.js";

describe("parseSvgOutline", () => {
  it("builds nested svg, container, and leaf symbols", () => {
    const nodes = parseSvgOutline(
      [
        '<svg width="800" height="600">',
        '  <g id="flowchart">',
        '    <g id="node1">',
        '      <rect id="start" x="10" y="20" width="30" height="40"/>',
        "    </g>",
        "  </g>",
        "</svg>",
      ].join("\n"),
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.tagName).toBe("svg");
    expect(nodes[0]?.children[0]?.id).toBe("flowchart");
    expect(nodes[0]?.children[0]?.children[0]?.children[0])
      .toMatchObject({
        tagName: "rect",
        id: "start",
        selectionRange: {
          start: { line: 3, character: 7 },
          end: { line: 3, character: 11 },
        },
      });
  });

  it("keeps elements without ids and supports source edits", () => {
    const first = parseSvgOutline(
      '<svg><g><text>First</text></g></svg>',
    );
    const edited = parseSvgOutline(
      [
        "<svg>",
        '  <g id="edited">',
        "    <text>Second</text>",
        "  </g>",
        "</svg>",
      ].join("\n"),
    );

    expect(first[0]?.children[0]?.children[0]).toMatchObject({
      tagName: "text",
      id: undefined,
    });
    expect(edited[0]?.children[0]?.id).toBe("edited");
    expect(edited[0]?.children[0]?.children[0]?.tagName).toBe("text");
  });

  it("returns an empty outline for incomplete XML", () => {
    expect(parseSvgOutline('<svg><g id="open">')).toEqual([]);
    expect(parseSvgOutline('<svg><rect id="unterminated"')).toEqual([]);
  });

  it("never throws and clears the outline on malformed input", () => {
    const malformedInputs = [
      "<svg><g></rect></svg>",
      "<svg><1bad/></svg>",
      "<svg>\u0000乱码",
      "<!-- unfinished",
    ];

    for (const source of malformedInputs) {
      expect(() => parseSvgOutline(source)).not.toThrow();
      expect(parseSvgOutline(source)).toEqual([]);
    }
  });

  it("ignores comments, declarations, quotes, and self-closing syntax", () => {
    const nodes = parseSvgOutline(
      [
        "<?xml version=\"1.0\"?>",
        "<!DOCTYPE svg>",
        "<svg>",
        "  <!-- <rect id=\"ignored\"/> -->",
        "  <g data-text=\">\">",
        "    <circle id='c1'/>",
        "  </g>",
        "</svg>",
      ].join("\n"),
    );

    expect(nodes[0]?.children).toHaveLength(1);
    expect(nodes[0]?.children[0]?.id).toBeUndefined();
    expect(nodes[0]?.children[0]?.children[0]).toMatchObject({
      tagName: "circle",
      id: "c1",
    });
  });
});
