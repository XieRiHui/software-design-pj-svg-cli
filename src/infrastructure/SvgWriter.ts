import { writeFileSync } from "node:fs";

import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { type Shape } from "../domain/Shape.js";
import { EditorError } from "../shared/EditorError.js";

export class SvgWriter {
  public write(document: CanvasDocument, filePath: string): void {
    const content = this.serialize(document);
    try {
      writeFileSync(filePath, content, "utf8");
    } catch {
      throw new EditorError(`cannot write file: ${filePath}`);
    }
  }

  public serialize(document: CanvasDocument): string {
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">`,
    ];

    for (const shape of document.rootShapes) {
      lines.push(...this.serializeShape(shape, 1));
    }

    lines.push("</svg>");
    return `${lines.join("\n")}\n`;
  }

  private serializeShape(shape: Shape, depth: number): readonly string[] {
    const indent = "  ".repeat(depth);
    const attributes = [
      ...shape.getShowAttributes(),
      ...shape.getSerializationAttributes(),
    ];
    const textAttribute = attributes.find(
      (attribute) => attribute.name === "text",
    );
    const xmlAttributes = attributes.filter(
      (attribute) => attribute.name !== "text",
    );
    const attributeText = [
      `id="${this.escapeAttribute(shape.id)}"`,
      ...xmlAttributes.map(
        (attribute) =>
          `${attribute.name}="${this.escapeAttribute(attribute.value)}"`,
      ),
    ].join(" ");
    const opening =
      `${indent}<${shape.serializationName} ${attributeText}`;

    if (shape.children.length > 0) {
      const lines = [`${opening}>`];
      for (const child of shape.children) {
        lines.push(...this.serializeShape(child, depth + 1));
      }
      lines.push(`${indent}</${shape.serializationName}>`);
      return lines;
    }

    if (textAttribute !== undefined) {
      return [
        `${opening}>${this.escapeText(textAttribute.value)}</${shape.serializationName}>`,
      ];
    }

    return [`${opening}/>`];
  }

  private escapeAttribute(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  private escapeText(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}
