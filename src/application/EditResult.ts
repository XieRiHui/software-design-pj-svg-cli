export type EditDirection = "execute" | "undo" | "redo";

export interface CreateEditResult {
  readonly kind: "create";
  readonly typeName: string;
  readonly id: string;
  readonly containerId: string | null;
}

export interface DeleteEditResult {
  readonly kind: "delete";
  readonly typeName: string;
  readonly id: string;
  readonly parentId: string | null;
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
