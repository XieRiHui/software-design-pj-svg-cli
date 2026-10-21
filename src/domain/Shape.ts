import { EditorError } from "../shared/EditorError.js";

export abstract class Shape {
  private readonly shapeId: string;
  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  protected constructor(
    id: string,
    fill?: string,
    stroke?: string,
    strokeWidth?: number,
  ) {
    if (id.length === 0) {
      throw new EditorError("shape id must not be empty");
    }

    this.shapeId = id;
    this.fillValue = fill;
    this.strokeValue = stroke;
    this.strokeWidthValue = strokeWidth === undefined
      ? undefined
      : Shape.validateNonNegative(strokeWidth, "stroke-width");
  }

  public get id(): string {
    return this.shapeId;
  }

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public get stroke(): string | undefined {
    return this.strokeValue;
  }

  public get strokeWidth(): number | undefined {
    return this.strokeWidthValue;
  }

  public abstract get typeName(): string;

  public abstract move(dx: number, dy: number): void;

  public abstract scale(factor: number): void;

  public abstract clone(): Shape;

  public setAttribute(attribute: string, value: string): void {
    if (attribute === "fill") {
      this.fillValue = value;
      return;
    }

    if (attribute === "stroke") {
      this.strokeValue = value;
      return;
    }

    if (attribute === "stroke-width") {
      const parsed = Shape.parseNonNegative(value, "stroke-width");
      this.strokeWidthValue = parsed;
      return;
    }

    this.setTypeAttribute(attribute, value);
  }

  public getAttribute(attribute: string): string | undefined {
    if (attribute === "fill") {
      return this.fillValue;
    }

    if (attribute === "stroke") {
      return this.strokeValue;
    }

    if (attribute === "stroke-width") {
      return this.strokeWidthValue?.toString();
    }

    return this.getTypeAttribute(attribute);
  }

  protected abstract setTypeAttribute(
    attribute: string,
    value: string,
  ): void;

  protected abstract getTypeAttribute(
    attribute: string,
  ): string | undefined;

  protected unknownAttribute(attribute: string): never {
    throw new EditorError(`unknown attribute: ${attribute}`);
  }

  protected assertMove(dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new EditorError("move delta must be finite");
    }
  }

  protected assertScale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new EditorError("scale factor must be positive");
    }
  }

  protected translate(value: number, delta: number): number {
    return Shape.checkedGeometry(value + delta);
  }

  protected scaleGeometry(value: number, factor: number): number {
    return Shape.checkedGeometry(value * factor);
  }

  protected static parseFinite(value: string, attribute: string): number {
    const parsed = Number(value);
    if (value.trim().length === 0) {
      throw Shape.invalidAttributeValue(attribute);
    }

    return Shape.validateFinite(parsed, attribute);
  }

  protected static parsePositive(
    value: string,
    attribute: string,
  ): number {
    return Shape.validatePositive(
      Shape.parseFinite(value, attribute),
      attribute,
    );
  }

  protected static parseNonNegative(
    value: string,
    attribute: string,
  ): number {
    return Shape.validateNonNegative(
      Shape.parseFinite(value, attribute),
      attribute,
    );
  }

  protected static validateFinite(
    value: number,
    attribute: string,
  ): number {
    if (!Number.isFinite(value)) {
      throw Shape.invalidAttributeValue(attribute);
    }

    return value;
  }

  protected static validatePositive(
    value: number,
    attribute: string,
  ): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw Shape.invalidAttributeValue(attribute);
    }

    return value;
  }

  protected static validateNonNegative(
    value: number,
    attribute: string,
  ): number {
    if (!Number.isFinite(value) || value < 0) {
      throw Shape.invalidAttributeValue(attribute);
    }

    return value;
  }

  private static invalidAttributeValue(attribute: string): EditorError {
    return new EditorError(
      `invalid value for attribute: ${attribute}`,
    );
  }

  private static checkedGeometry(value: number): number {
    if (!Number.isFinite(value)) {
      throw new EditorError("invalid geometry value");
    }

    return value;
  }
}
