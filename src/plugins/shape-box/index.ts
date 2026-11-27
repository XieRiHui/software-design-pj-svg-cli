import { type Shape } from "../../domain/Shape.js";
import {
  type AttributeApplyContext,
  type AttributeHandler,
  type AttributeHandlerResult,
  type PluginActivationContext,
  type PluginDefinition,
  type ShapeProvider,
} from "../../kernel/PluginContracts.js";
import { EditorError } from "../../shared/EditorError.js";
import { Box } from "./Box.js";

class BoxShapeProvider implements ShapeProvider {
  public readonly name = "box";
  public readonly typeName = "box";
  public readonly restorePriority = 100;

  public canRestore(
    elementName: string,
    attributes: ReadonlyMap<string, string>,
  ): boolean {
    return elementName === "g" && attributes.get("data-kind") === "box";
  }

  public create(id: string, args: readonly string[]): Shape {
    if (args.length !== 5) {
      throw new EditorError("invalid box parameters");
    }

    return Box.create(
      id,
      number(args[0]),
      number(args[1]),
      number(args[2]),
      number(args[3]),
      args[4] ?? "",
    );
  }

  public restore(id: string): Shape {
    return new Box(id);
  }

  public finalizeRestored(shape: Shape): void {
    if (!(shape instanceof Box)) {
      throw new EditorError("invalid box shape");
    }
    shape.finalizeRestored();
  }
}

class BoxAttributeHandler implements AttributeHandler {
  public readonly name = "box-attributes";

  public handles(shape: Shape, attribute: string): boolean {
    return (
      shape instanceof Box &&
      (attribute === "fill" || attribute === "label")
    );
  }

  public apply(
    context: AttributeApplyContext,
  ): AttributeHandlerResult {
    if (!(context.shape instanceof Box)) {
      throw new EditorError("box attribute handler received another shape");
    }

    if (context.attribute === "fill") {
      context.shape.setFill(context.value);
      return {
        message: `fill propagated to ${context.shape.id}-rect`,
        undoMessage: "fill propagation undone",
        redoMessage: `fill propagated to ${context.shape.id}-rect`,
      };
    }
    if (context.attribute === "label") {
      const previous = context.shape.label ?? "";
      context.shape.setLabel(context.value);
      return {
        message: `label updated: "${context.value}"`,
        undoMessage: `label restored: "${previous}"`,
        redoMessage: `label updated: "${context.value}"`,
      };
    }

    throw new EditorError(
      `unknown attribute: ${context.attribute}`,
    );
  }
}

export const shapeBoxPlugin: PluginDefinition = {
  name: "@svgframe/plugin-shape-box",
  contributes: {
    shapes: ["box"],
    attributes: ["box-attributes"],
  },
  activate(context: PluginActivationContext): void {
    context.registerShape(new BoxShapeProvider());
    context.registerAttributeHandler(new BoxAttributeHandler());
  },
};

export default shapeBoxPlugin;

function number(value: string | undefined): number {
  const parsed = Number(value);
  if (
    value === undefined ||
    value.trim().length === 0 ||
    !Number.isFinite(parsed)
  ) {
    throw new EditorError("invalid box parameters");
  }
  return parsed;
}
