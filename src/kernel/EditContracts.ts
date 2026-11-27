import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { type Shape } from "../domain/Shape.js";
import { EditorError } from "../shared/EditorError.js";

export type EditDirection = "execute" | "undo" | "redo";

export interface CreateEditResult {
  readonly kind: "create";
  readonly typeName: string;
  readonly id: string;
  readonly containerId: string | null;
  readonly containerTypeName?: string;
  readonly details?: string;
}

export interface DeleteEditResult {
  readonly kind: "delete";
  readonly typeName: string;
  readonly id: string;
  readonly parentId: string | null;
  readonly parentTypeName?: string;
}

export interface MoveEditResult {
  readonly kind: "move";
  readonly typeName: string;
  readonly id: string;
  readonly dx: number;
  readonly dy: number;
}

export interface ScaleEditResult {
  readonly kind: "scale";
  readonly typeName: string;
  readonly id: string;
  readonly factor: number;
}

export interface SetEditResult {
  readonly kind: "set";
  readonly typeName: string;
  readonly id: string;
  readonly attribute: string;
  readonly value: string;
  readonly message?: string;
  readonly undoMessage?: string;
  readonly redoMessage?: string;
}

export interface GroupEditResult {
  readonly kind: "group";
  readonly groupId: string;
  readonly childIds: readonly string[];
}

export interface UngroupEditResult {
  readonly kind: "ungroup";
  readonly groupId: string;
  readonly childIds: readonly string[];
}

export interface AddToEditResult {
  readonly kind: "addto";
  readonly typeName: string;
  readonly id: string;
  readonly groupId: string;
  readonly previousParentId: string | null;
  readonly groupTypeName?: string;
  readonly previousParentTypeName?: string;
}

export interface ReorderEditResult {
  readonly kind: "reorder";
  readonly typeName: string;
  readonly id: string;
  readonly position: "front" | "back";
}

export type EditResult =
  | CreateEditResult
  | DeleteEditResult
  | MoveEditResult
  | ScaleEditResult
  | SetEditResult
  | GroupEditResult
  | UngroupEditResult
  | AddToEditResult
  | ReorderEditResult;

export abstract class EditCommand {
  public abstract execute(document: CanvasDocument): EditResult;

  protected requireShape(
    document: CanvasDocument,
    id: string,
  ): Shape {
    const shape = document.getShape(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }

    return shape;
  }
}
