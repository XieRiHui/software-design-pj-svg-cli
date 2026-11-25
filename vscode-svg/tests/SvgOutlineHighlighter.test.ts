import { beforeEach, describe, expect, it, vi } from "vitest";

const vscodeMock = vi.hoisted(() => {
  class Position {
    public constructor(
      public readonly line: number,
      public readonly character: number,
    ) {}
  }

  class Range {
    public readonly start: Position;
    public readonly end: Position;

    public constructor(
      startLine: number,
      startCharacter: number,
      endLine: number,
      endCharacter: number,
    ) {
      this.start = new Position(startLine, startCharacter);
      this.end = new Position(endLine, endCharacter);
    }

    public isEqual(other: Range): boolean {
      return (
        this.start.line === other.start.line &&
        this.start.character === other.start.character &&
        this.end.line === other.end.line &&
        this.end.character === other.end.character
      );
    }
  }

  const state = {
    activeTextEditor: undefined as unknown,
    selectionListeners: [] as Array<(event: unknown) => void>,
    documentListeners: [] as Array<(event: unknown) => void>,
    decorationOptions: undefined as unknown,
    decorations: [] as Array<readonly Range[]>,
    revealedRanges: [] as Range[],
  };

  const source = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg width="320" height="180">',
    '  <g id="flowchart">',
    '    <rect id="start" width="10" height="10"/>',
    "  </g>",
    "</svg>",
  ].join("\n");

  const editor = {
    document: {
      languageId: "svg",
      getText: () => source,
    },
    setDecorations: (_type: unknown, ranges: readonly Range[]) => {
      state.decorations.push(ranges);
    },
    revealRange: (range: Range) => {
      state.revealedRanges.push(range);
    },
  };

  return {
    Range,
    Position,
    state,
    editor,
    OverviewRulerLane: { Right: 4 },
    DecorationRangeBehavior: { ClosedClosed: 1 },
    TextEditorRevealType: { InCenterIfOutsideViewport: 2 },
    window: {
      get activeTextEditor() {
        return state.activeTextEditor;
      },
      createTextEditorDecorationType: (options: unknown) => {
        state.decorationOptions = options;
        return { dispose: vi.fn() };
      },
      onDidChangeTextEditorSelection: (
        listener: (event: unknown) => void,
      ) => {
        state.selectionListeners.push(listener);
        return { dispose: vi.fn() };
      },
      onDidChangeActiveTextEditor: () => ({ dispose: vi.fn() }),
    },
    workspace: {
      onDidChangeTextDocument: (listener: (event: unknown) => void) => {
        state.documentListeners.push(listener);
        return { dispose: vi.fn() };
      },
    },
  };
});

vi.mock("vscode", () => vscodeMock);

import { SvgOutlineHighlighter } from "../src/SvgOutlineHighlighter.js";

describe("SvgOutlineHighlighter", () => {
  beforeEach(() => {
    vscodeMock.state.activeTextEditor = vscodeMock.editor;
    vscodeMock.state.selectionListeners.length = 0;
    vscodeMock.state.documentListeners.length = 0;
    vscodeMock.state.decorationOptions = undefined;
    vscodeMock.state.decorations.length = 0;
    vscodeMock.state.revealedRanges.length = 0;
  });

  it("highlights the full source range after outline navigation", () => {
    const highlighter = new SvgOutlineHighlighter();
    const selectionListener =
      vscodeMock.state.selectionListeners[0];
    expect(selectionListener).toBeDefined();

    selectionListener?.({
      textEditor: vscodeMock.editor,
      selections: [{
        isEmpty: false,
        start: { line: 3, character: 5 },
        active: { line: 3, character: 5 },
      }],
    });

    const range = vscodeMock.state.decorations[0]?.[0];
    expect(range).toBeInstanceOf(vscodeMock.Range);
    expect(range).toMatchObject({
      start: { line: 3, character: 4 },
      end: { line: 3, character: 45 },
    });
    expect(vscodeMock.state.revealedRanges[0]).toBe(range);
    expect(vscodeMock.state.decorationOptions).toMatchObject({
      backgroundColor: "rgba(0, 120, 215, 0.22)",
      border: "1px solid #3794ff",
    });

    highlighter.dispose();
  });

  it("clears the blue range when selection leaves the outline node", () => {
    const highlighter = new SvgOutlineHighlighter();
    const selectionListener =
      vscodeMock.state.selectionListeners[0];

    selectionListener?.({
      textEditor: vscodeMock.editor,
      selections: [{
        isEmpty: true,
        start: { line: 3, character: 5 },
        active: { line: 3, character: 5 },
      }],
    });
    selectionListener?.({
      textEditor: vscodeMock.editor,
      selections: [{
        isEmpty: true,
        start: { line: 2, character: 1 },
        active: { line: 2, character: 1 },
      }],
    });

    expect(vscodeMock.state.decorations.at(-1)).toEqual([]);

    highlighter.dispose();
  });
});
