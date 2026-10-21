import { Circle } from "./Circle.js";
import { Ellipse } from "./Ellipse.js";
import { Group } from "./Group.js";
import { Line } from "./Line.js";
import { Rect } from "./Rect.js";
import { Shape } from "./Shape.js";
import { Text } from "./Text.js";
import { EditorError } from "../shared/EditorError.js";

export class ShapeFactory {
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
}
