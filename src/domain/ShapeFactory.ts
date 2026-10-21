import { Circle } from "./Circle.js";
import { Ellipse } from "./Ellipse.js";
import { Group } from "./Group.js";
import { Line } from "./Line.js";
import { Rect } from "./Rect.js";
import { Shape } from "./Shape.js";
import { Text } from "./Text.js";
import { EditorError } from "../shared/EditorError.js";

export class ShapeFactory {
  public isSupported(type: string): boolean {
    switch (type) {
      case "rect":
      case "circle":
      case "ellipse":
      case "line":
      case "text":
      case "g":
        return true;
      default:
        return false;
    }
  }

  public create(
    type: string,
    id: string,
    args: readonly string[],
  ): Shape {
    switch (type) {
      case "rect":
        this.requireParameterCount(type, args, 4, 5);
        return new Rect(
          id,
          this.number(type, args[0]),
          this.number(type, args[1]),
          this.number(type, args[2]),
          this.number(type, args[3]),
          args[4],
        );
      case "circle":
        this.requireParameterCount(type, args, 3, 4);
        return new Circle(
          id,
          this.number(type, args[0]),
          this.number(type, args[1]),
          this.number(type, args[2]),
          args[3],
        );
      case "ellipse":
        this.requireParameterCount(type, args, 4, 5);
        return new Ellipse(
          id,
          this.number(type, args[0]),
          this.number(type, args[1]),
          this.number(type, args[2]),
          this.number(type, args[3]),
          args[4],
        );
      case "line":
        this.requireParameterCount(type, args, 4, 5);
        return new Line(
          id,
          this.number(type, args[0]),
          this.number(type, args[1]),
          this.number(type, args[2]),
          this.number(type, args[3]),
          undefined,
          args[4],
        );
      case "text":
        this.requireParameterCount(type, args, 3, 3);
        return new Text(
          id,
          this.number(type, args[0]),
          this.number(type, args[1]),
          args[2] ?? "",
        );
      case "g":
        this.requireParameterCount(type, args, 0, 0);
        return new Group(id);
      default:
        throw new EditorError(
          `unknown shape type: ${type} (is the plugin loaded?)`,
        );
    }
  }

  public createFromAttributes(
    type: string,
    id: string,
    attributes: ReadonlyMap<string, string>,
    textContent = "",
  ): Shape | null {
    let shape: Shape;

    switch (type) {
      case "rect":
        shape = new Rect(
          id,
          this.attributeNumber(type, "x", attributes),
          this.attributeNumber(type, "y", attributes),
          this.attributeNumber(type, "width", attributes),
          this.attributeNumber(type, "height", attributes),
        );
        break;
      case "circle":
        shape = new Circle(
          id,
          this.attributeNumber(type, "cx", attributes),
          this.attributeNumber(type, "cy", attributes),
          this.attributeNumber(type, "r", attributes),
        );
        break;
      case "ellipse":
        shape = new Ellipse(
          id,
          this.attributeNumber(type, "cx", attributes),
          this.attributeNumber(type, "cy", attributes),
          this.attributeNumber(type, "rx", attributes),
          this.attributeNumber(type, "ry", attributes),
        );
        break;
      case "line":
        shape = new Line(
          id,
          this.attributeNumber(type, "x1", attributes),
          this.attributeNumber(type, "y1", attributes),
          this.attributeNumber(type, "x2", attributes),
          this.attributeNumber(type, "y2", attributes),
        );
        break;
      case "text":
        shape = new Text(
          id,
          this.attributeNumber(type, "x", attributes),
          this.attributeNumber(type, "y", attributes),
          textContent,
        );
        break;
      case "g":
        shape = new Group(id);
        break;
      default:
        return null;
    }

    this.applyCommonAttributes(shape, attributes);
    return shape;
  }

  private requireParameterCount(
    type: string,
    args: readonly string[],
    minimum: number,
    maximum: number,
  ): void {
    if (args.length < minimum || args.length > maximum) {
      throw new EditorError(`invalid ${type} parameters`);
    }
  }

  private number(type: string, value: string | undefined): number {
    const parsed = Number(value);
    if (
      value === undefined ||
      value.trim().length === 0 ||
      !Number.isFinite(parsed)
    ) {
      throw new EditorError(`invalid ${type} parameters`);
    }

    return parsed;
  }

  private attributeNumber(
    type: string,
    attribute: string,
    attributes: ReadonlyMap<string, string>,
  ): number {
    return this.number(type, attributes.get(attribute));
  }

  private applyCommonAttributes(
    shape: Shape,
    attributes: ReadonlyMap<string, string>,
  ): void {
    for (const name of ["fill", "stroke", "stroke-width"]) {
      const value = attributes.get(name);
      if (value !== undefined) {
        shape.setAttribute(name, value);
      }
    }
  }
}
