import { PrimitiveShape } from "./PrimitiveShape.js";
import {
  Shape,
  type Point,
  type ShapeAttribute,
} from "./Shape.js";

export class Rect extends PrimitiveShape {
  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  public constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
  ) {
    super(id, fill, stroke, strokeWidth);
    this.xValue = Shape.validateFinite(x, "x");
    this.yValue = Shape.validateFinite(y, "y");
    this.widthValue = Shape.validatePositive(width, "width");
    this.heightValue = Shape.validatePositive(height, "height");
  }

  public get typeName(): string {
    return "rect";
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  public override move(dx: number, dy: number): void {
    this.assertMove(dx, dy);
    const x = this.translate(this.xValue, dx);
    const y = this.translate(this.yValue, dy);
    this.xValue = x;
    this.yValue = y;
  }

  public override scale(factor: number): void {
    this.assertScale(factor);
    const x = this.scaleGeometry(this.xValue, factor);
    const y = this.scaleGeometry(this.yValue, factor);
    const width = this.scaleGeometry(this.widthValue, factor);
    const height = this.scaleGeometry(this.heightValue, factor);
    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
  }

  public override clone(): Rect {
    return new Rect(
      this.id,
      this.xValue,
      this.yValue,
      this.widthValue,
      this.heightValue,
      this.fill,
      this.stroke,
      this.strokeWidth,
    );
  }

  public override getPosition(): Point {
    return { x: this.xValue, y: this.yValue };
  }

  public override getTreeSummary(): string {
    return [
      `x=${this.xValue}`,
      `y=${this.yValue}`,
      `w=${this.widthValue}`,
      `h=${this.heightValue}`,
    ].join(" ") + this.styleSummary();
  }

  public override getShowAttributes(): readonly ShapeAttribute[] {
    return [
      { name: "x", value: this.xValue.toString() },
      { name: "y", value: this.yValue.toString() },
      { name: "width", value: this.widthValue.toString() },
      { name: "height", value: this.heightValue.toString() },
      ...this.getCommonAttributes(),
    ];
  }

  protected override setTypeAttribute(
    attribute: string,
    value: string,
  ): void {
    switch (attribute) {
      case "x":
        this.xValue = Shape.parseFinite(value, attribute);
        return;
      case "y":
        this.yValue = Shape.parseFinite(value, attribute);
        return;
      case "width":
        this.widthValue = Shape.parsePositive(value, attribute);
        return;
      case "height":
        this.heightValue = Shape.parsePositive(value, attribute);
        return;
      default:
        this.unknownAttribute(attribute);
    }
  }

  protected override getTypeAttribute(
    attribute: string,
  ): string | undefined {
    switch (attribute) {
      case "x":
        return this.xValue.toString();
      case "y":
        return this.yValue.toString();
      case "width":
        return this.widthValue.toString();
      case "height":
        return this.heightValue.toString();
      default:
        return undefined;
    }
  }
}
