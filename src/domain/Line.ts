import { PrimitiveShape } from "./PrimitiveShape.js";
import {
  Shape,
  type Point,
  type ShapeAttribute,
} from "./Shape.js";

export class Line extends PrimitiveShape {
  private x1Value: number;
  private y1Value: number;
  private x2Value: number;
  private y2Value: number;

  public constructor(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
  ) {
    super(id, fill, stroke, strokeWidth);
    this.x1Value = Shape.validateFinite(x1, "x1");
    this.y1Value = Shape.validateFinite(y1, "y1");
    this.x2Value = Shape.validateFinite(x2, "x2");
    this.y2Value = Shape.validateFinite(y2, "y2");
  }

  public get typeName(): string {
    return "line";
  }

  public get x1(): number {
    return this.x1Value;
  }

  public get y1(): number {
    return this.y1Value;
  }

  public get x2(): number {
    return this.x2Value;
  }

  public get y2(): number {
    return this.y2Value;
  }

  public override move(dx: number, dy: number): void {
    this.assertMove(dx, dy);
    const x1 = this.translate(this.x1Value, dx);
    const y1 = this.translate(this.y1Value, dy);
    const x2 = this.translate(this.x2Value, dx);
    const y2 = this.translate(this.y2Value, dy);
    this.x1Value = x1;
    this.y1Value = y1;
    this.x2Value = x2;
    this.y2Value = y2;
  }

  public override scale(factor: number): void {
    this.assertScale(factor);
    const x1 = this.scaleGeometry(this.x1Value, factor);
    const y1 = this.scaleGeometry(this.y1Value, factor);
    const x2 = this.scaleGeometry(this.x2Value, factor);
    const y2 = this.scaleGeometry(this.y2Value, factor);
    this.x1Value = x1;
    this.y1Value = y1;
    this.x2Value = x2;
    this.y2Value = y2;
  }

  public override clone(): Line {
    return new Line(
      this.id,
      this.x1Value,
      this.y1Value,
      this.x2Value,
      this.y2Value,
      this.fill,
      this.stroke,
      this.strokeWidth,
    );
  }

  public override getPosition(): Point {
    return { x: this.x1Value, y: this.y1Value };
  }

  public override getTreeSummary(): string {
    return `(${this.x1Value},${this.y1Value}) -> (${this.x2Value},${this.y2Value})`;
  }

  public override getShowAttributes(): readonly ShapeAttribute[] {
    return [
      { name: "x1", value: this.x1Value.toString() },
      { name: "y1", value: this.y1Value.toString() },
      { name: "x2", value: this.x2Value.toString() },
      { name: "y2", value: this.y2Value.toString() },
      ...this.getCommonAttributes(),
    ];
  }

  protected override setTypeAttribute(
    attribute: string,
    value: string,
  ): void {
    switch (attribute) {
      case "x1":
        this.x1Value = Shape.parseFinite(value, attribute);
        return;
      case "y1":
        this.y1Value = Shape.parseFinite(value, attribute);
        return;
      case "x2":
        this.x2Value = Shape.parseFinite(value, attribute);
        return;
      case "y2":
        this.y2Value = Shape.parseFinite(value, attribute);
        return;
      default:
        this.unknownAttribute(attribute);
    }
  }

  protected override getTypeAttribute(
    attribute: string,
  ): string | undefined {
    switch (attribute) {
      case "x1":
        return this.x1Value.toString();
      case "y1":
        return this.y1Value.toString();
      case "x2":
        return this.x2Value.toString();
      case "y2":
        return this.y2Value.toString();
      default:
        return undefined;
    }
  }
}
