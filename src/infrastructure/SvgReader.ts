import { readFileSync } from "node:fs";

import {
  DOMParser,
  type Element,
} from "@xmldom/xmldom";

import {
  CanvasDocument,
} from "../domain/CanvasDocument.js";
import { CompositeShape } from "../domain/CompositeShape.js";
import {
  type ShapeProviderCatalog,
  type SvgReadResult,
} from "../kernel/CommandContracts.js";
import { EditorError } from "../shared/EditorError.js";

export type { SvgReadResult } from "../kernel/CommandContracts.js";

interface IdAssignmentState {
  readonly usedIds: Set<string>;
  readonly counters: Map<string, number>;
  readonly warnings: string[];
}

export class SvgReader {
  public constructor(
    private readonly shapeProviders: ShapeProviderCatalog,
  ) {}

  public read(filePath: string): SvgReadResult {
    let source: string;
    try {
      source = readFileSync(filePath, "utf8");
    } catch {
      throw new EditorError(`cannot read file: ${filePath}`);
    }

    try {
      return this.parseContent(source);
    } catch {
      throw new EditorError(`cannot read file: ${filePath}`);
    }
  }

  public parseContent(source: string): SvgReadResult {
    const xmlSource = source.charCodeAt(0) === 0xfeff
      ? source.slice(1)
      : source;
    const parseErrors: string[] = [];
    const dom = new DOMParser({
      onError: (level, message) => {
        if (level !== "warning") {
          parseErrors.push(message);
        }
      },
    }).parseFromString(xmlSource, "image/svg+xml");

    if (parseErrors.length > 0) {
      throw new Error("invalid SVG XML");
    }

    const root = dom.documentElement;
    if (root === null || this.elementName(root) !== "svg") {
      throw new Error("SVG root element is required");
    }

    const width = this.canvasDimension(root, "width");
    const height = this.canvasDimension(root, "height");
    const document = new CanvasDocument(width, height);
    const usedIds = this.collectExplicitIds(root);
    const state: IdAssignmentState = {
      usedIds,
      counters: new Map<string, number>(),
      warnings: [],
    };

    this.appendChildren(root, document, undefined, state);
    return {
      document,
      warnings: [...state.warnings],
    };
  }

  private appendChildren(
    source: Element,
    document: CanvasDocument,
    parent: CompositeShape | undefined,
    state: IdAssignmentState,
  ): void {
    for (const element of this.childElements(source)) {
      const type = this.elementName(element);
      const attributes = this.attributesOf(element);
      const provider = this.shapeProviders.getForRestore(
        type,
        attributes,
      );
      if (provider === undefined) {
        state.warnings.push(
          `warning: skipped unsupported element <${type}>`,
        );
        continue;
      }

      const id = this.resolveId(type, attributes, state);
      const shape = provider.restore(
        id,
        attributes,
        element.textContent ?? "",
      );

      document.addShape(shape, parent?.id);
      if (shape instanceof CompositeShape) {
        this.appendChildren(element, document, shape, state);
      }
      provider.finalizeRestored?.(shape);
    }
  }

  private collectExplicitIds(root: Element): Set<string> {
    const ids = new Set<string>();
    const visit = (element: Element): void => {
      for (const child of this.childElements(element)) {
        const type = this.elementName(child);
        const attributes = this.attributesOf(child);
        const provider = this.shapeProviders.getForRestore(
          type,
          attributes,
        );
        if (provider !== undefined) {
          const id = this.elementId(child);
          if (id !== undefined) {
            if (ids.has(id)) {
              throw new Error(`duplicate id: ${id}`);
            }
            ids.add(id);
          }
          visit(child);
        }
      }
    };

    visit(root);
    return ids;
  }

  private resolveId(
    type: string,
    attributes: ReadonlyMap<string, string>,
    state: IdAssignmentState,
  ): string {
    const explicit = attributes.get("id")?.trim();
    if (explicit !== undefined && explicit.length > 0) {
      return explicit;
    }

    let counter = (state.counters.get(type) ?? 0) + 1;
    let candidate = `${type}${counter}`;
    while (state.usedIds.has(candidate)) {
      counter += 1;
      candidate = `${type}${counter}`;
    }

    state.counters.set(type, counter);
    state.usedIds.add(candidate);
    state.warnings.push(
      `warning: assigned id ${candidate} to unnamed <${type}>`,
    );
    return candidate;
  }

  private elementId(element: Element): string | undefined {
    const value = element.getAttribute("id")?.trim();
    return value !== undefined && value.length > 0 ? value : undefined;
  }

  private attributesOf(element: Element): ReadonlyMap<string, string> {
    const attributes = new Map<string, string>();
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      if (attribute !== null) {
        attributes.set(attribute.name, attribute.value);
      }
    }

    return attributes;
  }

  private childElements(element: Element): readonly Element[] {
    const children: Element[] = [];
    for (let index = 0; index < element.childNodes.length; index += 1) {
      const node = element.childNodes.item(index);
      if (node !== null && node.nodeType === 1) {
        children.push(node as Element);
      }
    }

    return children;
  }

  private elementName(element: Element): string {
    return element.localName ?? element.tagName;
  }

  private canvasDimension(
    root: Element,
    attribute: "width" | "height",
  ): number {
    const value = Number(root.getAttribute(attribute));
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`invalid SVG ${attribute}`);
    }

    return value;
  }
}
