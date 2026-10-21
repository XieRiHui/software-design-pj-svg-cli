import { EditorError } from "../shared/EditorError.js";
import { Shape } from "./Shape.js";

export abstract class CompositeShape extends Shape {
  private readonly childShapes: Shape[] = [];

  public override get children(): readonly Shape[] {
    return [...this.childShapes];
  }

  public appendChild(shape: Shape): void {
    this.assertCanAccept(shape);
    this.childShapes.push(shape);
  }

  public insertChild(index: number, shape: Shape): void {
    if (!Number.isInteger(index) || index < 0 || index > this.childShapes.length) {
      throw new EditorError("invalid child index");
    }

    this.assertCanAccept(shape);
    this.childShapes.splice(index, 0, shape);
  }

  public removeChild(shape: Shape): boolean {
    const index = this.childShapes.indexOf(shape);
    if (index === -1) {
      return false;
    }

    this.childShapes.splice(index, 1);
    return true;
  }

  public contains(shape: Shape): boolean {
    if (shape === this) {
      return true;
    }

    return this.childShapes.some(
      (child) =>
        child === shape ||
        (child instanceof CompositeShape && child.contains(shape)),
    );
  }

  public override move(dx: number, dy: number): void {
    this.assertMove(dx, dy);
    for (const child of this.childShapes) {
      child.move(dx, dy);
    }
  }

  public override scale(factor: number): void {
    this.assertScale(factor);
    for (const child of this.childShapes) {
      child.scale(factor);
    }
  }

  protected override setTypeAttribute(
    attribute: string,
    _value: string,
  ): void {
    this.unknownAttribute(attribute);
  }

  protected override getTypeAttribute(
    _attribute: string,
  ): undefined {
    return undefined;
  }

  private assertCanAccept(shape: Shape): void {
    if (
      shape === this ||
      (shape instanceof CompositeShape && shape.contains(this))
    ) {
      throw new EditorError(
        `cannot group a container into its own descendant: ${shape.id}`,
      );
    }
  }
}
