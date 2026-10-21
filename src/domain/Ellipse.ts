import { PrimitiveShape } from "./PrimitiveShape.js";
import { Shape } from "./Shape.js";

export class Ellipse extends PrimitiveShape {
  private cxValue: number;
  private cyValue: number;
  private radiusXValue: number;
  private radiusYValue: number;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
  ) {
    super(id, fill, stroke, strokeWidth);
    this.cxValue = Shape.validateFinite(cx, "cx");
    this.cyValue = Shape.validateFinite(cy, "cy");
    this.radiusXValue = Shape.validatePositive(radiusX, "rx");
    this.radiusYValue = Shape.validatePositive(radiusY, "ry");
  }

  public get typeName(): string {
    return "ellipse";
  }

  public get cx(): number {
    return this.cxValue;
  }

  public get cy(): number {
    return this.cyValue;
  }

  public get radiusX(): number {
    return this.radiusXValue;
  }

  public get radiusY(): number {
    return this.radiusYValue;
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
    const radiusX = this.scaleGeometry(this.radiusXValue, factor);
    const radiusY = this.scaleGeometry(this.radiusYValue, factor);
    this.cxValue = cx;
    this.cyValue = cy;
    this.radiusXValue = radiusX;
    this.radiusYValue = radiusY;
  }

  public override clone(): Ellipse {
    return new Ellipse(
      this.id,
      this.cxValue,
      this.cyValue,
      this.radiusXValue,
      this.radiusYValue,
      this.fill,
      this.stroke,
      this.strokeWidth,
    );
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
      case "rx":
        this.radiusXValue = Shape.parsePositive(value, attribute);
        return;
      case "ry":
        this.radiusYValue = Shape.parsePositive(value, attribute);
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
      case "rx":
        return this.radiusXValue.toString();
      case "ry":
        return this.radiusYValue.toString();
      default:
        return undefined;
    }
  }
}
