import {
  type EditDirection,
  type EditResult,
} from "../application/EditResult.js";
import {
  type Command,
} from "../kernel/CommandContracts.js";
import { type TreeDecorator } from "../kernel/PluginContracts.js";
import { type CanvasDocument } from "../domain/CanvasDocument.js";
import {
  type Shape,
  type ShapeAttribute,
} from "../domain/Shape.js";
import { EditorError } from "../shared/EditorError.js";

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

  public help(commands: readonly Command[]): string {
    const ordered = [...commands].sort(
      (left, right) =>
        left.help.sectionOrder - right.help.sectionOrder ||
        left.help.order - right.help.order,
    );
    const groups = new Map<string, Command[]>();
    for (const command of ordered) {
      const group = groups.get(command.help.section) ?? [];
      group.push(command);
      groups.set(command.help.section, group);
    }

    return [...groups.entries()]
      .map(([section, entries]) => [
        `${section}:`,
        ...entries.map((command) => `  ${command.help.line}`),
      ].join("\n"))
      .join("\n\n");
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
        return this.formatSetResult(result, document, direction);
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
          ? `${result.typeName}#${result.id} moved back to ${result.previousParentId === null ? "svg" : `${result.previousParentTypeName ?? "g"}#${result.previousParentId}`}`
          : `${result.typeName}#${result.id} added to ${result.groupTypeName ?? "g"}#${result.groupId}`;
      case "reorder":
        return direction === "undo"
          ? `${result.typeName}#${result.id} order restored`
          : `${result.typeName}#${result.id} moved to ${result.position}`;
    }
  }

  public tree(
    document: CanvasDocument,
    decorators: readonly TreeDecorator[],
    rootId?: string,
    savedDocument?: CanvasDocument,
    saveSequence = 0,
  ): string {
    if (rootId === undefined) {
      const lines = [
        this.appendDecorations(
          `svg (${document.width}x${document.height})`,
          decorators,
          {
            document,
            shape: undefined,
            isRoot: true,
            savedDocument,
            saveSequence,
          },
        ),
      ];
      this.appendTree(
        lines,
        document.rootShapes,
        "",
        decorators,
        document,
        savedDocument,
        saveSequence,
      );
      return lines.join("\n");
    }

    const root = this.requireShape(document, rootId);
    const lines = [
      this.formatTreeLine(
        "",
        root,
        decorators,
        document,
        savedDocument,
        saveSequence,
      ),
    ];
    this.appendTree(
      lines,
      root.children,
      "",
      decorators,
      document,
      savedDocument,
      saveSequence,
    );
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
      : ` in ${result.containerTypeName ?? "g"}#${result.containerId}`;
    const details = result.details === undefined
      ? ""
      : ` (${result.details})`;
    return `${result.typeName}#${result.id} created${details}${location}`;
  }

  private formatDeleteResult(
    result: Extract<EditResult, { kind: "delete" }>,
    direction: EditDirection,
  ): string {
    if (direction === "undo") {
      return result.parentId === null
        ? `${result.typeName}#${result.id} restored to svg`
        : `${result.typeName}#${result.id} restored into ${result.parentTypeName ?? "g"}#${result.parentId}`;
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
    direction: EditDirection,
  ): string {
    const customMessage = direction === "undo"
      ? result.undoMessage
      : direction === "redo"
        ? result.redoMessage
        : result.message;
    if (customMessage !== undefined) {
      return `${result.typeName}#${result.id} ${customMessage}`;
    }

    const current = document.getShape(result.id)?.getAttribute(
      result.attribute,
    ) ?? result.value;
    return `${result.typeName}#${result.id} updated: ${result.attribute}=${this.formatAttributeValue(result.attribute, current)}`;
  }

  private appendTree(
    lines: string[],
    shapes: readonly Shape[],
    indent: string,
    decorators: readonly TreeDecorator[],
    document: CanvasDocument,
    savedDocument: CanvasDocument | undefined,
    saveSequence: number,
  ): void {
    shapes.forEach((shape, index) => {
      const isLast = index === shapes.length - 1;
      const branch = isLast ? "└── " : "├── ";
      lines.push(
        this.formatTreeLine(
          `${indent}${branch}`,
          shape,
          decorators,
          document,
          savedDocument,
          saveSequence,
        ),
      );
      const childIndent = indent + (isLast ? "    " : "│   ");
      this.appendTree(
        lines,
        shape.children,
        childIndent,
        decorators,
        document,
        savedDocument,
        saveSequence,
      );
    });
  }

  private formatTreeLine(
    prefix: string,
    shape: Shape,
    decorators: readonly TreeDecorator[],
    document: CanvasDocument,
    savedDocument: CanvasDocument | undefined,
    saveSequence: number,
  ): string {
    const label = `${shape.treeTypeName}#${shape.id}`;
    const summary = shape.getTreeSummary();
    const line = summary.length === 0
      ? `${prefix}${label}`
      : this.padTreeSummary(prefix, label, summary);

    return this.appendDecorations(line, decorators, {
      document,
      shape,
      isRoot: false,
      savedDocument,
      saveSequence,
    });
  }

  private padTreeSummary(
    prefix: string,
    label: string,
    summary: string,
  ): string {
    if (summary.length === 0) {
      return `${prefix}${label}`;
    }

    const lineStart = `${prefix}${label}`;
    const padding = " ".repeat(Math.max(2, 19 - lineStart.length));
    return `${lineStart}${padding}${summary}`;
  }

  private appendDecorations(
    line: string,
    decorators: readonly TreeDecorator[],
    context: Parameters<TreeDecorator["decorate"]>[0],
  ): string {
    const labels = decorators.flatMap((decorator) =>
      decorator.decorate(context)
    );

    if (labels.length === 0) {
      return line;
    }

    return `${line}  ${labels.join(" ")}`;
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
