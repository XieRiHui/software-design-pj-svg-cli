import {
  type EditDirection,
  type EditResult,
} from "../application/EditResult.js";
import { type CanvasDocument } from "../domain/CanvasDocument.js";
import {
  type Shape,
  type ShapeAttribute,
} from "../domain/Shape.js";
import { EditorError } from "../shared/EditorError.js";

const HELP_TEXT = [
  "Document commands:",
  "  init [w] [h]",
  "  read <file.svg>",
  "  save [file.svg]",
  "  canvas [w] [h]",
  "",
  "Shape commands:",
  "  create <type> <id> [params...] [in <containerId>]",
  "  delete <id>",
  "  move <id> <dx> <dy>",
  "  scale <id> <factor>",
  "  set <id> <attr> <value>",
  "  group <newGid> <id1> <id2>...",
  "  ungroup <gid>",
  "  addto <gid> <id>",
  "  front <id>",
  "  back <id>",
  "",
  "Display commands:",
  "  tree [id]",
  "  show <id>",
  "  help",
  "",
  "History commands:",
  "  undo",
  "  redo",
].join("\n");

const STYLE_ATTRIBUTE_NAMES = new Set([
  "fill",
  "stroke",
  "stroke-width",
]);

export class OutputFormatter {
  public canvasCreated(width: number, height: number): string {
    return `canvas ${width}x${height} created`;
  }

  public canvasInfo(width: number, height: number): string {
    return `canvas ${width}x${height}`;
  }

  public canvasResized(width: number, height: number): string {
    return `canvas resized to ${width}x${height}`;
  }

  public readCompleted(
    filePath: string,
    elementCount: number,
    warnings: readonly string[],
  ): string {
    return [
      ...warnings,
      `read ${filePath} (${elementCount} elements)`,
    ].join("\n");
  }

  public savedTo(filePath: string, elementCount: number): string {
    return `saved to ${filePath} (${elementCount} elements)`;
  }

  public help(): string {
    return HELP_TEXT;
  }

  public editResult(
    result: EditResult,
    document: CanvasDocument,
    direction: EditDirection,
  ): string {
    switch (result.kind) {
      case "create":
        return this.formatCreateResult(result, direction);
      case "delete":
        return this.formatDeleteResult(result, direction);
      case "move":
        return this.formatMoveResult(result, document, direction);
      case "scale":
        return direction === "undo"
          ? `${result.typeName}#${result.id} scale undone`
          : `${result.typeName}#${result.id} scaled by ${result.factor}`;
      case "set":
        return this.formatSetResult(result, document);
      case "group":
        return direction === "undo"
          ? `g#${result.groupId} grouping undone`
          : `g#${result.groupId} created with ${this.formatChildCount(result.childIds.length)}`;
      case "ungroup":
        return direction === "undo"
          ? `g#${result.groupId} restored with ${this.formatChildCount(result.childIds.length)}`
          : `g#${result.groupId} ungrouped`;
      case "addto":
        return direction === "undo"
          ? `${result.typeName}#${result.id} moved back to ${result.previousParentId === null ? "svg" : `g#${result.previousParentId}`}`
          : `${result.typeName}#${result.id} added to g#${result.groupId}`;
      case "reorder":
        return direction === "undo"
          ? `${result.typeName}#${result.id} order restored`
          : `${result.typeName}#${result.id} moved to ${result.position}`;
    }
  }

  public tree(document: CanvasDocument, rootId?: string): string {
    if (rootId === undefined) {
      const lines = [
        `svg (${document.width}x${document.height})`,
      ];
      this.appendTree(lines, document.rootShapes, "");
      return lines.join("\n");
    }

    const root = this.requireShape(document, rootId);
    const lines = [this.formatTreeLine("", root)];
    this.appendTree(lines, root.children, "");
    return lines.join("\n");
  }

  public show(document: CanvasDocument, id: string): string {
    const shape = this.requireShape(document, id);
    const parent = document.getParent(id);
    const parentLabel = parent === undefined
      ? "svg"
      : `${parent.typeName}#${parent.id}`;
    const lines = [
      `${shape.typeName}#${shape.id}  parent=${parentLabel}`,
    ];

    const attributes = shape.getShowAttributes();
    const geometryAttributes = attributes.filter(
      (attribute) => !STYLE_ATTRIBUTE_NAMES.has(attribute.name),
    );
    const styleAttributes = attributes.filter((attribute) =>
      STYLE_ATTRIBUTE_NAMES.has(attribute.name),
    );

    if (geometryAttributes.length > 0) {
      lines.push(
        `  ${this.formatAttributes(geometryAttributes)}`,
      );
    }

    for (const attribute of styleAttributes) {
      lines.push(`  ${this.formatAttribute(attribute)}`);
    }

    return lines.join("\n");
  }

  public error(message: string): string {
    return `error: ${message}`;
  }

  private formatCreateResult(
    result: Extract<EditResult, { kind: "create" }>,
    direction: EditDirection,
  ): string {
    if (direction === "undo") {
      return `${result.typeName}#${result.id} creation undone`;
    }

    const location = result.containerId === null
      ? ""
      : ` in g#${result.containerId}`;
    return `${result.typeName}#${result.id} created${location}`;
  }

  private formatDeleteResult(
    result: Extract<EditResult, { kind: "delete" }>,
    direction: EditDirection,
  ): string {
    if (direction === "undo") {
      return result.parentId === null
        ? `${result.typeName}#${result.id} restored to svg`
        : `${result.typeName}#${result.id} restored into g#${result.parentId}`;
    }

    return `${result.typeName}#${result.id} deleted`;
  }

  private formatMoveResult(
    result: Extract<EditResult, { kind: "move" }>,
    document: CanvasDocument,
    direction: EditDirection,
  ): string {
    const shape = document.getShape(result.id);
    const position = shape?.getPosition();
    if (position !== undefined && position !== null) {
      const verb = direction === "undo" ? "moved back to" : "moved to";
      return `${result.typeName}#${result.id} ${verb} (${position.x},${position.y})`;
    }

    const dx = direction === "undo" ? -result.dx : result.dx;
    const dy = direction === "undo" ? -result.dy : result.dy;
    const verb = direction === "undo" ? "moved back by" : "moved by";
    return `${result.typeName}#${result.id} ${verb} (${dx},${dy})`;
  }

  private formatSetResult(
    result: Extract<EditResult, { kind: "set" }>,
    document: CanvasDocument,
  ): string {
    const current = document.getShape(result.id)?.getAttribute(
      result.attribute,
    ) ?? result.value;
    return `${result.typeName}#${result.id} updated: ${result.attribute}=${this.formatAttributeValue(result.attribute, current)}`;
  }

  private appendTree(
    lines: string[],
    shapes: readonly Shape[],
    indent: string,
  ): void {
    shapes.forEach((shape, index) => {
      const isLast = index === shapes.length - 1;
      const branch = isLast ? "└── " : "├── ";
      lines.push(this.formatTreeLine(`${indent}${branch}`, shape));
      const childIndent = indent + (isLast ? "    " : "│   ");
      this.appendTree(lines, shape.children, childIndent);
    });
  }

  private formatTreeLine(prefix: string, shape: Shape): string {
    const label = `${shape.typeName}#${shape.id}`;
    const summary = shape.getTreeSummary();
    if (summary.length === 0) {
      return `${prefix}${label}`;
    }

    const lineStart = `${prefix}${label}`;
    const padding = " ".repeat(Math.max(2, 19 - lineStart.length));
    return `${lineStart}${padding}${summary}`;
  }

  private formatAttribute(attribute: ShapeAttribute): string {
    return `${attribute.name}=${this.formatAttributeValue(
      attribute.name,
      attribute.value,
    )}`;
  }

  private formatAttributes(attributes: readonly ShapeAttribute[]): string {
    return attributes
      .map((attribute) => this.formatAttribute(attribute))
      .join(" ");
  }

  private formatAttributeValue(name: string, value: string): string {
    return name === "text" ? `"${value}"` : value;
  }

  private formatChildCount(count: number): string {
    return `${count} ${count === 1 ? "child" : "children"}`;
  }

  private requireShape(
    document: CanvasDocument,
    id: string,
  ): Shape {
    const shape = document.getShape(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }

    return shape;
  }
}
