import { PrimitiveShape } from "./PrimitiveShape.js";
import {
  Shape,
  type Point,
  type ShapeAttribute,
} from "./Shape.js";

export class Text extends PrimitiveShape {
  private xValue: number;
  private yValue: number;
  private textValue: string;

  public constructor(
    id: string,
    x: number,
    y: number,
    text: string,
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
  ) {
    super(id, fill, stroke, strokeWidth);
    this.xValue = Shape.validateFinite(x, "x");
    this.yValue = Shape.validateFinite(y, "y");
    this.textValue = text;
  }

  public get typeName(): string {
    return "text";
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get text(): string {
    return this.textValue;
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
    this.xValue = x;
    this.yValue = y;
  }

  public override clone(): Text {
    return new Text(
      this.id,
      this.xValue,
      this.yValue,
      this.textValue,
      this.fill,
      this.stroke,
      this.strokeWidth,
    );
  }

  public override getPosition(): Point {
    return { x: this.xValue, y: this.yValue };
  }

  public override getTreeSummary(): string {
    return `(${this.xValue},${this.yValue}) ` +
      `"${this.textValue}"${this.styleSummary()}`;
  }

  public override getShowAttributes(): readonly ShapeAttribute[] {
    return [
      { name: "x", value: this.xValue.toString() },
      { name: "y", value: this.yValue.toString() },
      { name: "text", value: this.textValue },
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
      case "text":
        this.textValue = value;
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
      case "text":
        return this.textValue;
      default:
        return undefined;
    }
  }
}
