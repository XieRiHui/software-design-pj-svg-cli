import { CompositeShape } from "./CompositeShape.js";

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
}
