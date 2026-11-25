import { Circle } from "../../domain/Circle.js";
import { Ellipse } from "../../domain/Ellipse.js";
import { Group } from "../../domain/Group.js";
import { Line } from "../../domain/Line.js";
import { Rect } from "../../domain/Rect.js";
import { type Shape } from "../../domain/Shape.js";
import { Text } from "../../domain/Text.js";
import {
  type PluginActivationContext,
  type PluginDefinition,
  type ShapeProvider,
} from "../../kernel/PluginContracts.js";
import { EditorError } from "../../shared/EditorError.js";

type ShapeCreator = (
  id: string,
  args: readonly string[],
) => Shape;
type ShapeRestorer = (
  id: string,
  attributes: ReadonlyMap<string, string>,
  textContent: string,
) => Shape;

class BuiltinShapeProvider implements ShapeProvider {
  public readonly restorePriority = 0;

  public constructor(
    public readonly name: string,
    public readonly typeName: string,
    private readonly creator: ShapeCreator,
    private readonly restorer: ShapeRestorer,
  ) {}

  public canRestore(elementName: string): boolean {
    return elementName === this.elementName;
  }

  public create(id: string, args: readonly string[]): Shape {
    return this.creator(id, args);
  }

  public restore(
    id: string,
    attributes: ReadonlyMap<string, string>,
    textContent: string,
  ): Shape {
    const shape = this.restorer(id, attributes, textContent);
    for (const name of ["fill", "stroke", "stroke-width"]) {
      const value = attributes.get(name);
      if (value !== undefined) {
        shape.setAttribute(name, value);
      }
    }
    return shape;
  }

  private get elementName(): string {
    return this.typeName;
  }
}

const providers: readonly ShapeProvider[] = [
  new BuiltinShapeProvider(
    "rect",
    "rect",
    (id, args) => {
      requireCount("rect", args, 4, 5);
      return new Rect(
        id,
        number("rect", args[0]),
        number("rect", args[1]),
        number("rect", args[2]),
        number("rect", args[3]),
        args[4],
      );
    },
    (id, attributes) =>
      new Rect(
        id,
        attributeNumber("rect", "x", attributes),
        attributeNumber("rect", "y", attributes),
        attributeNumber("rect", "width", attributes),
        attributeNumber("rect", "height", attributes),
      ),
  ),
  new BuiltinShapeProvider(
    "circle",
    "circle",
    (id, args) => {
      requireCount("circle", args, 3, 4);
      return new Circle(
        id,
        number("circle", args[0]),
        number("circle", args[1]),
        number("circle", args[2]),
        args[3],
      );
    },
    (id, attributes) =>
      new Circle(
        id,
        attributeNumber("circle", "cx", attributes),
        attributeNumber("circle", "cy", attributes),
        attributeNumber("circle", "r", attributes),
      ),
  ),
  new BuiltinShapeProvider(
    "ellipse",
    "ellipse",
    (id, args) => {
      requireCount("ellipse", args, 4, 5);
      return new Ellipse(
        id,
        number("ellipse", args[0]),
        number("ellipse", args[1]),
        number("ellipse", args[2]),
        number("ellipse", args[3]),
        args[4],
      );
    },
    (id, attributes) =>
      new Ellipse(
        id,
        attributeNumber("ellipse", "cx", attributes),
        attributeNumber("ellipse", "cy", attributes),
        attributeNumber("ellipse", "rx", attributes),
        attributeNumber("ellipse", "ry", attributes),
      ),
  ),
  new BuiltinShapeProvider(
    "line",
    "line",
    (id, args) => {
      requireCount("line", args, 4, 5);
      return new Line(
        id,
        number("line", args[0]),
        number("line", args[1]),
        number("line", args[2]),
        number("line", args[3]),
        undefined,
        args[4],
      );
    },
    (id, attributes) =>
      new Line(
        id,
        attributeNumber("line", "x1", attributes),
        attributeNumber("line", "y1", attributes),
        attributeNumber("line", "x2", attributes),
        attributeNumber("line", "y2", attributes),
      ),
  ),
  new BuiltinShapeProvider(
    "text",
    "text",
    (id, args) => {
      requireCount("text", args, 3, 3);
      return new Text(
        id,
        number("text", args[0]),
        number("text", args[1]),
        args[2] ?? "",
      );
    },
    (id, attributes, textContent) =>
      new Text(
        id,
        attributeNumber("text", "x", attributes),
        attributeNumber("text", "y", attributes),
        textContent,
      ),
  ),
  new BuiltinShapeProvider(
    "g",
    "g",
    (id, args) => {
      requireCount("g", args, 0, 0);
      return new Group(id);
    },
    (id) => new Group(id),
  ),
];

export const builtinShapesPlugin: PluginDefinition = {
  name: "@svgframe/plugin-builtin-shapes",
  contributes: {
    shapes: providers.map((provider) => provider.name),
  },
  activate(context: PluginActivationContext): void {
    for (const provider of providers) {
      context.registerShape(provider);
    }
  },
};

export default builtinShapesPlugin;

function requireCount(
  type: string,
  args: readonly string[],
  minimum: number,
  maximum: number,
): void {
  if (args.length < minimum || args.length > maximum) {
    throw new EditorError(`invalid ${type} parameters`);
  }
}

function number(type: string, value: string | undefined): number {
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

function attributeNumber(
  type: string,
  attribute: string,
  attributes: ReadonlyMap<string, string>,
): number {
  return number(type, attributes.get(attribute));
}
