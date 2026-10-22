import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class UngroupCommand extends EditCommand {
  public constructor(private readonly groupId: string) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    this.requireShape(document, this.groupId);
    const children = document.ungroupGroup(this.groupId);

    return {
      kind: "ungroup",
      groupId: this.groupId,
      childIds: children.map((child) => child.id),
    };
  }
}
