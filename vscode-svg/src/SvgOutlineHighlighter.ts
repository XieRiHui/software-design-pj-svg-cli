import * as vscode from "vscode";

import {
  findOutlineNodeAtPosition,
  parseSvgOutline,
  type SvgOutlineNode,
} from "./svgOutlineParser.js";

const BLUE_HIGHLIGHT = "rgba(0, 120, 215, 0.22)";
const BLUE_BORDER = "1px solid #3794ff";

export class SvgOutlineHighlighter implements vscode.Disposable {
  private readonly decorationType =
    vscode.window.createTextEditorDecorationType({
      backgroundColor: BLUE_HIGHLIGHT,
      border: BLUE_BORDER,
      borderRadius: "2px",
      isWholeLine: false,
      overviewRulerColor: "#0078d4",
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
  private highlightedEditor: vscode.TextEditor | undefined;
  private highlightedRange: vscode.Range | undefined;
  private applyingSelection = false;
  private readonly disposables: vscode.Disposable[] = [
    vscode.window.onDidChangeTextEditorSelection((event) => {
      this.handleSelectionChange(event);
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.clearHighlight();
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        this.highlightedEditor !== undefined &&
        event.document === this.highlightedEditor.document
      ) {
        this.clearHighlight();
      }
    }),
  ];

  public dispose(): void {
    this.clearHighlight();
    this.decorationType.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private handleSelectionChange(
    event: vscode.TextEditorSelectionChangeEvent,
  ): void {
    if (this.applyingSelection) {
      return;
    }

    const editor = event.textEditor;
    if (
      editor !== vscode.window.activeTextEditor ||
      editor.document.languageId !== "svg"
    ) {
      this.clearHighlight();
      return;
    }

    const selection = event.selections[0];
    if (selection === undefined) {
      this.clearHighlight();
      return;
    }

    const node = findOutlineNodeAtPosition(
      parseSvgOutline(editor.document.getText()),
      {
        line: selection.start.line,
        character: selection.start.character,
      },
    );
    if (node === undefined) {
      this.clearHighlight();
      return;
    }

    this.applyHighlight(editor, node);
  }

  private applyHighlight(
    editor: vscode.TextEditor,
    node: SvgOutlineNode,
  ): void {
    const range = toRange(node.range);
    if (
      this.highlightedEditor === editor &&
      this.highlightedRange?.isEqual(range) === true
    ) {
      return;
    }

    if (this.highlightedEditor !== undefined && this.highlightedEditor !== editor) {
      this.highlightedEditor.setDecorations(this.decorationType, []);
    }

    this.highlightedEditor = editor;
    this.highlightedRange = range;
    editor.setDecorations(this.decorationType, [range]);

    this.applyingSelection = true;
    try {
      editor.revealRange(
        range,
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );
    } finally {
      this.applyingSelection = false;
    }
  }

  private clearHighlight(): void {
    if (this.highlightedEditor !== undefined) {
      this.highlightedEditor.setDecorations(this.decorationType, []);
    }
    this.highlightedEditor = undefined;
    this.highlightedRange = undefined;
  }
}

function toRange(sourceRange: SvgOutlineNode["range"]): vscode.Range {
  return new vscode.Range(
    sourceRange.start.line,
    sourceRange.start.character,
    sourceRange.end.line,
    sourceRange.end.character,
  );
}
