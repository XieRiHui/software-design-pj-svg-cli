import * as vscode from "vscode";

import {
  parseSvgOutline,
  type SourceRange,
  type SvgOutlineNode,
} from "./svgOutlineParser.js";

export class SvgDocumentSymbolProvider
implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
  ): vscode.DocumentSymbol[] {
    return parseSvgOutline(document.getText()).map((node) =>
      toDocumentSymbol(node)
    );
  }
}

function toDocumentSymbol(node: SvgOutlineNode): vscode.DocumentSymbol {
  const label = node.id === undefined
    ? node.tagName
    : `${node.tagName}#${node.id}`;
  const symbol = new vscode.DocumentSymbol(
    label,
    node.tagName,
    node.children.length > 0
      ? vscode.SymbolKind.Object
      : vscode.SymbolKind.Field,
    toRange(node.range),
    toRange(node.selectionRange),
  );
  symbol.children = node.children.map((child) => toDocumentSymbol(child));
  return symbol;
}

function toRange(range: SourceRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}
