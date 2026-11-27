import {
  Shape,
  type Point,
  type ShapeAttribute,
} from "../../domain/Shape.js";

export class Arrow extends Shape {
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
    stroke?: string,
    strokeWidth?: number,
  ) {
    super(id, "none", stroke, strokeWidth);
    this.x1Value = Shape.validateFinite(x1, "x1");
    this.y1Value = Shape.validateFinite(y1, "y1");
    this.x2Value = Shape.validateFinite(x2, "x2");
    this.y2Value = Shape.validateFinite(y2, "y2");
  }

  public get typeName(): string {
    return "arrow";
  }

  public override get serializationName(): string {
    return "path";
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

  public get pathData(): string {
    const deltaX = this.x2Value - this.x1Value;
    const deltaY = this.y2Value - this.y1Value;
    const length = Math.hypot(deltaX, deltaY);
    const unitX = length === 0 ? 1 : deltaX / length;
    const unitY = length === 0 ? 0 : deltaY / length;
    const headLength = Math.min(12, Math.max(1, length * 0.5));
    const halfWidth = headLength * 0.6;
    const baseX = this.x2Value - unitX * headLength;
    const baseY = this.y2Value - unitY * headLength;
    const normalX = -unitY * halfWidth;
    const normalY = unitX * halfWidth;

    return [
      `M ${number(this.x1Value)} ${number(this.y1Value)}`,
      `L ${number(this.x2Value)} ${number(this.y2Value)}`,
      `M ${number(baseX + normalX)} ${number(baseY + normalY)}`,
      `L ${number(this.x2Value)} ${number(this.y2Value)}`,
      `L ${number(baseX - normalX)} ${number(baseY - normalY)}`,
    ].join(" ");
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

  public override clone(): Arrow {
    return new Arrow(
      this.id,
      this.x1Value,
      this.y1Value,
      this.x2Value,
      this.y2Value,
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
      { name: "d", value: this.pathData },
      ...this.getCommonAttributes(),
    ];
  }

  public override getSerializationAttributes(): readonly ShapeAttribute[] {
    return [
      { name: "data-kind", value: "arrow" },
      { name: "data-x1", value: number(this.x1Value) },
      { name: "data-y1", value: number(this.y1Value) },
      { name: "data-x2", value: number(this.x2Value) },
      { name: "data-y2", value: number(this.y2Value) },
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
        return number(this.x1Value);
      case "y1":
        return number(this.y1Value);
      case "x2":
        return number(this.x2Value);
      case "y2":
        return number(this.y2Value);
      default:
        return undefined;
    }
  }
}

function number(value: number): string {
  return Object.is(value, -0) ? "0" : value.toString();
}
