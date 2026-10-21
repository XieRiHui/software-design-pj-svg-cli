import { PrimitiveShape } from "./PrimitiveShape.js";
import {
  Shape,
  type Point,
  type ShapeAttribute,
} from "./Shape.js";

export class Circle extends PrimitiveShape {
  private cxValue: number;
  private cyValue: number;
  private radiusValue: number;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    radius: number,
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
  ) {
    super(id, fill, stroke, strokeWidth);
    this.cxValue = Shape.validateFinite(cx, "cx");
    this.cyValue = Shape.validateFinite(cy, "cy");
    this.radiusValue = Shape.validatePositive(radius, "r");
  }

  public get typeName(): string {
    return "circle";
  }

  public get cx(): number {
    return this.cxValue;
  }

  public get cy(): number {
    return this.cyValue;
  }

  public get radius(): number {
    return this.radiusValue;
  }

  public override move(dx: number, dy: number): void {
    this.assertMove(dx, dy);
    const cx = this.translate(this.cxValue, dx);
    const cy = this.translate(this.cyValue, dy);
    this.cxValue = cx;
    this.cyValue = cy;
  }

  public override scale(factor: number): void {
    this.assertScale(factor);
    const cx = this.scaleGeometry(this.cxValue, factor);
    const cy = this.scaleGeometry(this.cyValue, factor);
    const radius = this.scaleGeometry(this.radiusValue, factor);
    this.cxValue = cx;
    this.cyValue = cy;
    this.radiusValue = radius;
  }

  public override clone(): Circle {
    return new Circle(
      this.id,
      this.cxValue,
      this.cyValue,
      this.radiusValue,
      this.fill,
      this.stroke,
      this.strokeWidth,
    );
  }

  public override getPosition(): Point {
    return { x: this.cxValue, y: this.cyValue };
  }

  public override getTreeSummary(): string {
    return [
      `cx=${this.cxValue}`,
      `cy=${this.cyValue}`,
      `r=${this.radiusValue}`,
    ].join(" ") + this.styleSummary();
  }

  public override getShowAttributes(): readonly ShapeAttribute[] {
    return [
      { name: "cx", value: this.cxValue.toString() },
      { name: "cy", value: this.cyValue.toString() },
      { name: "r", value: this.radiusValue.toString() },
      ...this.getCommonAttributes(),
    ];
  }

  protected override setTypeAttribute(
    attribute: string,
    value: string,
  ): void {
    switch (attribute) {
      case "cx":
        this.cxValue = Shape.parseFinite(value, attribute);
        return;
      case "cy":
        this.cyValue = Shape.parseFinite(value, attribute);
        return;
      case "r":
        this.radiusValue = Shape.parsePositive(value, attribute);
        return;
      default:
        this.unknownAttribute(attribute);
    }
  }

  protected override getTypeAttribute(
    attribute: string,
  ): string | undefined {
    switch (attribute) {
      case "cx":
        return this.cxValue.toString();
      case "cy":
        return this.cyValue.toString();
      case "r":
        return this.radiusValue.toString();
      default:
        return undefined;
    }
  }
}
