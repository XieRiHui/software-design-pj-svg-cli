import { CompositeShape } from "./CompositeShape.js";
import {
  type Point,
  type ShapeAttribute,
} from "./Shape.js";

export class Group extends CompositeShape {
  public constructor(
    id: string,
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
  ) {
    super(id, fill, stroke, strokeWidth);
  }

  public get typeName(): string {
    return "g";
  }

  public override get isUngroupable(): boolean {
    return true;
  }

  public override clone(): Group {
    const clone = new Group(
      this.id,
      this.fill,
      this.stroke,
      this.strokeWidth,
    );

    for (const child of this.children) {
      clone.appendChild(child.clone());
    }

    return clone;
  }

  public override getPosition(): Point | null {
    return null;
  }

  public override getTreeSummary(): string {
    return this.styleSummary().trim();
  }

  public override getShowAttributes(): readonly ShapeAttribute[] {
    return this.getCommonAttributes();
  }
}
