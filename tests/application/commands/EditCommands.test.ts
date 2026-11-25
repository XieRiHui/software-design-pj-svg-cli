import { describe, expect, it } from "vitest";

import { CreateCommand } from "../../../src/application/commands/CreateCommand.js";
import { AddToCommand } from "../../../src/application/commands/AddToCommand.js";
import { BackCommand } from "../../../src/application/commands/BackCommand.js";
import { DeleteCommand } from "../../../src/application/commands/DeleteCommand.js";
import { FrontCommand } from "../../../src/application/commands/FrontCommand.js";
import { GroupCommand } from "../../../src/application/commands/GroupCommand.js";
import { MoveCommand } from "../../../src/application/commands/MoveCommand.js";
import { ScaleCommand } from "../../../src/application/commands/ScaleCommand.js";
import { SetCommand } from "../../../src/application/commands/SetCommand.js";
import { UngroupCommand } from "../../../src/application/commands/UngroupCommand.js";
import { CanvasDocument } from "../../../src/domain/CanvasDocument.js";
import { Group } from "../../../src/domain/Group.js";
import { Rect } from "../../../src/domain/Rect.js";
import { EditorError } from "../../../src/shared/EditorError.js";
import { TEST_SHAPES } from "../../helpers/TestPlugins.js";

describe("edit commands", () => {
  it("creates a shape inside an existing container", () => {
    const document = new CanvasDocument(400, 300);
    document.addShape(new Group("g1"));

    const result = new CreateCommand(
      "rect",
      "r1",
      ["10", "20", "30", "40", "red"],
      "g1",
      TEST_SHAPES,
    ).execute(document);

    expect(result).toEqual({
      kind: "create",
      typeName: "rect",
      id: "r1",
      containerId: "g1",
    });
    expect(document.getShape("r1")).toBeInstanceOf(Rect);
    expect(document.getParent("r1")?.id).toBe("g1");
  });

  it("moves, scales, and sets one shape through command objects", () => {
    const document = new CanvasDocument(400, 300);
    document.addShape(new Rect("r1", 10, 20, 30, 40));

    expect(new MoveCommand("r1", 5, -10).execute(document).kind).toBe(
      "move",
    );
    expect(new ScaleCommand("r1", 2).execute(document).kind).toBe(
      "scale",
    );
    expect(
      new SetCommand("r1", "fill", "blue").execute(document).kind,
    ).toBe("set");

    const rect = document.getShape("r1");
    expect(rect?.getAttribute("x")).toBe("30");
    expect(rect?.getAttribute("width")).toBe("60");
    expect(rect?.getAttribute("fill")).toBe("blue");
  });

  it("deletes a shape and reports its previous parent", () => {
    const document = new CanvasDocument(400, 300);
    const group = new Group("g1");
    document.addShape(group);
    document.addShape(new Rect("r1", 0, 0, 10, 10), "g1");

    const result = new DeleteCommand("r1").execute(document);

    expect(result).toEqual({
      kind: "delete",
      typeName: "rect",
      id: "r1",
      parentId: "g1",
    });
    expect(document.getShape("r1")).toBeUndefined();
  });

  it("rejects edits for missing shapes", () => {
    const document = new CanvasDocument(400, 300);

    expect(() => new MoveCommand("missing", 1, 1).execute(document)).toThrow(
      "no such shape: missing",
    );
    expect(() => new ScaleCommand("missing", 2).execute(document)).toThrow(
      EditorError,
    );
    expect(() =>
      new SetCommand("missing", "fill", "red").execute(document),
    ).toThrow("no such shape: missing");
  });

  it("groups and ungroups through separate command objects", () => {
    const document = new CanvasDocument(400, 300);
    document.addShape(new Rect("first", 0, 0, 10, 10));
    document.addShape(new Rect("second", 10, 0, 10, 10));
    document.addShape(new Group("parent"));
    document.moveShape("first", "parent");
    document.moveShape("second", "parent");

    const grouped = new GroupCommand("nested", [
      "second",
      "first",
    ]).execute(document);

    expect(grouped).toEqual({
      kind: "group",
      groupId: "nested",
      childIds: ["second", "first"],
    });
    expect(document.getChildren("parent")[0]?.id).toBe("nested");

    expect(new UngroupCommand("nested").execute(document)).toEqual({
      kind: "ungroup",
      groupId: "nested",
      childIds: ["second", "first"],
    });
    expect(document.getChildren("parent").map((shape) => shape.id)).toEqual([
      "second",
      "first",
    ]);
  });

  it("moves shapes between groups and reorders siblings through commands", () => {
    const document = new CanvasDocument(400, 300);
    document.addShape(new Group("first"));
    document.addShape(new Group("second"));
    document.addShape(new Rect("rect", 0, 0, 10, 10));
    document.addShape(new Rect("front", 10, 0, 10, 10));

    expect(
      new AddToCommand("first", "rect").execute(document),
    ).toEqual({
      kind: "addto",
      typeName: "rect",
      id: "rect",
      groupId: "first",
      previousParentId: null,
    });
    expect(new FrontCommand("rect").execute(document).kind).toBe(
      "reorder",
    );
    expect(new BackCommand("rect").execute(document).kind).toBe(
      "reorder",
    );
    expect(document.getParent("rect")?.id).toBe("first");
    expect(document.getChildren("first")[0]?.id).toBe("rect");
  });
});
