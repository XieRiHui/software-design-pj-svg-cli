import {
  type PluginActivationContext,
  type PluginDefinition,
  type ShapeProvider,
} from "../../kernel/PluginContracts.js";
import { type Shape } from "../../domain/Shape.js";
import { EditorError } from "../../shared/EditorError.js";
import { Arrow } from "./Arrow.js";

class ArrowShapeProvider implements ShapeProvider {
  public readonly name = "arrow";
  public readonly typeName = "arrow";
  public readonly restorePriority = 100;

  public canRestore(
    elementName: string,
    attributes: ReadonlyMap<string, string>,
  ): boolean {
    return elementName === "path" &&
      attributes.get("data-kind") === "arrow";
  }

  public create(id: string, args: readonly string[]): Shape {
    if (args.length < 4 || args.length > 5) {
      throw new EditorError("invalid arrow parameters");
    }

    return new Arrow(
      id,
      number(args[0]),
      number(args[1]),
      number(args[2]),
      number(args[3]),
      args[4],
    );
  }

  public restore(
    id: string,
    attributes: ReadonlyMap<string, string>,
  ): Shape {
    const arrow = new Arrow(
      id,
      attributeNumber("data-x1", attributes),
      attributeNumber("data-y1", attributes),
      attributeNumber("data-x2", attributes),
      attributeNumber("data-y2", attributes),
    );

    for (const name of ["fill", "stroke", "stroke-width"]) {
      const value = attributes.get(name);
      if (value !== undefined) {
        arrow.setAttribute(name, value);
      }
    }

    return arrow;
  }
}

export const shapeArrowPlugin: PluginDefinition = {
  name: "@svgframe/plugin-shape-arrow",
  contributes: {
    shapes: ["arrow"],
  },
  activate(context: PluginActivationContext): void {
    context.registerShape(new ArrowShapeProvider());
  },
};

export default shapeArrowPlugin;

function number(value: string | undefined): number {
  const parsed = Number(value);
  if (
    value === undefined ||
    value.trim().length === 0 ||
    !Number.isFinite(parsed)
  ) {
    throw new EditorError("invalid arrow parameters");
  }
  return parsed;
}

function attributeNumber(
  attribute: string,
  attributes: ReadonlyMap<string, string>,
): number {
  return number(attributes.get(attribute));
}
