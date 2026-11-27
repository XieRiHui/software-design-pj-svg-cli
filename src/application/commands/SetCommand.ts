import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";
import {
  type AttributeHandlerCatalog,
} from "../../kernel/CommandContracts.js";
import {
  type AttributeHandlerResult,
} from "../../kernel/PluginContracts.js";
import { EditorError } from "../../shared/EditorError.js";

const NO_ATTRIBUTE_HANDLERS: AttributeHandlerCatalog = {
  findApplicable: () => [],
  all: () => [],
};

export class SetCommand extends EditCommand {
  public constructor(
    private readonly shapeId: string,
    private readonly attribute: string,
    private readonly value: string,
    private readonly handlers: AttributeHandlerCatalog =
      NO_ATTRIBUTE_HANDLERS,
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.requireShape(document, this.shapeId);
    const handlers = this.handlers.findApplicable(
      shape,
      this.attribute,
    );

    if (handlers.length > 1) {
      const names = handlers.map((handler) => handler.name).join(", ");
      throw new EditorError(
        `conflicting attribute handlers for ${shape.id}/${this.attribute}: ${names}`,
      );
    }

    const handler = handlers[0];
    let handlerResult: AttributeHandlerResult | void = undefined;
    if (handler === undefined) {
      shape.setAttribute(this.attribute, this.value);
    } else {
      handlerResult = handler.apply({
        document,
        shape,
        attribute: this.attribute,
        value: this.value,
      });
    }

    return {
      kind: "set",
      typeName: shape.typeName,
      id: shape.id,
      attribute: this.attribute,
      value: this.value,
      ...(handlerResult === undefined
        ? {}
        : {
          message: handlerResult.message,
          ...(handlerResult.undoMessage === undefined
            ? {}
            : { undoMessage: handlerResult.undoMessage }),
          ...(handlerResult.redoMessage === undefined
            ? {}
            : { redoMessage: handlerResult.redoMessage }),
        }),
    };
  }
}
