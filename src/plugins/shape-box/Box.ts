import { CompositeShape } from "../../domain/CompositeShape.js";
import { Rect } from "../../domain/Rect.js";
import {
  type Point,
  type Shape,
  type ShapeAttribute,
} from "../../domain/Shape.js";
import { Text } from "../../domain/Text.js";
import { EditorError } from "../../shared/EditorError.js";

export class Box extends CompositeShape {
  public constructor(id: string) {
    super(id);
  }

  public static create(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
  ): Box {
    const box = new Box(id);
    box.appendChild(
      new Rect(
        `${id}-rect`,
        x,
        y,
        width,
        height,
        "#4a90d9",
      ),
    );
    box.appendChild(
      new Text(`${id}-label`, x + 20, y + 35, label),
    );
    return box;
  }

  public get typeName(): string {
    return "box";
  }

  public override get serializationName(): string {
    return "g";
  }

  public override get treeTypeName(): string {
    return "g";
  }

  public override get isUngroupable(): boolean {
    return false;
  }

  public override get fill(): string | undefined {
    return this.rect?.getAttribute("fill");
  }

  public get label(): string | undefined {
    return this.labelShape?.text;
  }

  public setFill(value: string): void {
    this.requireRect().setAttribute("fill", value);
  }

  public setLabel(value: string): void {
    this.requireLabel().setAttribute("text", value);
  }

  public override clone(): Box {
    const clone = new Box(this.id);
    for (const child of this.children) {
      clone.appendChild(child.clone());
    }
    return clone;
  }

  public override getPosition(): Point | null {
    return null;
  }

  public override getTreeSummary(): string {
    return "";
  }

  public override getCreationDetails(): string {
    return [
      `${this.serializationName}#${this.id}`,
      ...this.children.map(
        (child) => `${child.typeName}#${child.id}`,
      ),
    ].join(" + ");
  }

  public override getShowAttributes(): readonly ShapeAttribute[] {
    return [];
  }

  public override getSerializationAttributes(): readonly ShapeAttribute[] {
    return [{ name: "data-kind", value: "box" }];
  }

  public override setAttribute(attribute: string, value: string): void {
    if (attribute === "fill") {
      this.setFill(value);
      return;
    }
    if (attribute === "label") {
      this.setLabel(value);
      return;
    }

    super.setAttribute(attribute, value);
  }

  public override getAttribute(
    attribute: string,
  ): string | undefined {
    if (attribute === "fill") {
      return this.fill;
    }
    if (attribute === "label") {
      return this.label;
    }
    return super.getAttribute(attribute);
  }

  public finalizeRestored(): void {
    if (this.rect === undefined || this.labelShape === undefined) {
      throw new EditorError(
        `invalid box structure: ${this.id}`,
      );
    }
  }

  protected override assertCanRemoveChild(shape: Shape): void {
    const expectedIds = new Set([
      `${this.id}-rect`,
      `${this.id}-label`,
    ]);
    if (expectedIds.has(shape.id)) {
      throw new EditorError(
        `cannot remove required box child: ${shape.id}`,
      );
    }
  }

  private get rect(): Rect | undefined {
    const shape = this.getChild(`${this.id}-rect`);
    return shape instanceof Rect ? shape : undefined;
  }

  private get labelShape(): Text | undefined {
    const shape = this.getChild(`${this.id}-label`);
    return shape instanceof Text ? shape : undefined;
  }

  private getChild(id: string) {
    return this.children.find((shape) => shape.id === id);
  }

  private requireRect(): Rect {
    const rect = this.rect;
    if (rect === undefined) {
      throw new EditorError(
        `box is missing its required rect: ${this.id}`,
      );
    }
    return rect;
  }

  private requireLabel(): Text {
    const label = this.labelShape;
    if (label === undefined) {
      throw new EditorError(
        `box is missing its required text: ${this.id}`,
      );
    }
    return label;
  }
}
