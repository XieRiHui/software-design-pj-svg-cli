import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class GroupCommand extends EditCommand {
  public constructor(
    private readonly groupId: string,
    private readonly memberIds: readonly string[],
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const group = document.groupShapes(
      this.groupId,
      this.memberIds,
    );

    return {
      kind: "group",
      groupId: group.id,
      childIds: group.children.map((child) => child.id),
    };
  }
}
