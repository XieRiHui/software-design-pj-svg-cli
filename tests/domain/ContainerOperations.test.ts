import { describe, expect, it } from "vitest";

import { CanvasDocument } from "../../src/domain/CanvasDocument.js";
import { Group } from "../../src/domain/Group.js";
import { Rect } from "../../src/domain/Rect.js";

describe("CanvasDocument container operations", () => {
  it("groups shapes in command order at the first target position", () => {
    const document = new CanvasDocument(400, 300);
    const first = new Rect("first", 0, 0, 10, 10);
    const second = new Rect("second", 10, 0, 10, 10);
    const third = new Rect("third", 20, 0, 10, 10);
    document.addShape(first);
    document.addShape(second);
    document.addShape(third);

    const group = document.groupShapes("group", [
      "third",
      "first",
    ]);

    expect(document.rootShapes.map((shape) => shape.id)).toEqual([
      "second",
      "group",
    ]);
    expect(group.children.map((shape) => shape.id)).toEqual([
      "third",
      "first",
    ]);
    expect(document.getParent("third")).toBe(group);
    expect(document.getParent("first")).toBe(group);
    expect(document.getParent("group")).toBeUndefined();
  });

  it("rejects a selected container and its descendant atomically", () => {
    const document = new CanvasDocument(400, 300);
    const container = new Group("container");
    const child = new Rect("child", 0, 0, 10, 10);
    document.addShape(container);
    document.addShape(child, "container");
    document.addShape(new Rect("outside", 20, 0, 10, 10));

    expect(() =>
      document.groupShapes("bad", ["child", "container"]),
    ).toThrow(
      "cannot group a container into its own descendant: container",
    );
    expect(document.rootShapes.map((shape) => shape.id)).toEqual([
      "container",
      "outside",
    ]);
    expect(document.getParent("child")).toBe(container);
    expect(document.getShape("bad")).toBeUndefined();
  });

  it("groups shapes selected from different original parents", () => {
    const document = new CanvasDocument(400, 300);
    const firstParent = new Group("first-parent");
    const secondParent = new Group("second-parent");
    const first = new Rect("first", 0, 0, 10, 10);
    const second = new Rect("second", 10, 0, 10, 10);
    document.addShape(firstParent);
    document.addShape(secondParent);
    document.addShape(first, "first-parent");
    document.addShape(second, "second-parent");

    const group = document.groupShapes("group", [
      "second",
      "first",
    ]);

    expect(document.getChildren("first-parent")).toEqual([]);
    expect(document.getChildren("second-parent")).toEqual([group]);
    expect(group.children.map((shape) => shape.id)).toEqual([
      "second",
      "first",
    ]);
    expect(document.getParent("first")).toBe(group);
    expect(document.getParent("second")).toBe(group);
  });

  it("rejects duplicate targets and existing group ids without mutation", () => {
    const document = new CanvasDocument(400, 300);
    const rect = new Rect("rect", 0, 0, 10, 10);
    document.addShape(rect);
    document.addShape(new Group("existing"));

    expect(() =>
      document.groupShapes("group", ["rect", "rect"]),
    ).toThrow("duplicate group target: rect");
    expect(() =>
      document.groupShapes("existing", ["rect"]),
    ).toThrow("id already exists: existing");
    expect(document.rootShapes.map((shape) => shape.id)).toEqual([
      "rect",
      "existing",
    ]);
  });

  it("ungroups a nested container in place and reparents its children", () => {
    const document = new CanvasDocument(400, 300);
    const parent = new Group("parent");
    const nested = new Group("nested");
    const first = new Rect("first", 0, 0, 10, 10);
    const last = new Rect("last", 10, 0, 10, 10);
    document.addShape(parent);
    document.addShape(nested, "parent");
    document.addShape(first, "nested");
    document.addShape(last, "nested");

    const children = document.ungroupGroup("nested");

    expect(children.map((shape) => shape.id)).toEqual([
      "first",
      "last",
    ]);
    expect(document.getChildren("parent").map((shape) => shape.id)).toEqual([
      "first",
      "last",
    ]);
    expect(document.getParent("first")).toBe(parent);
    expect(document.getShape("nested")).toBeUndefined();
  });

  it("rejects ungrouping a root container without mutation", () => {
    const document = new CanvasDocument(400, 300);
    const root = new Group("root");
    document.addShape(root);

    expect(() => document.ungroupGroup("root")).toThrow(
      "cannot ungroup top-level container: root",
    );
    expect(document.getShape("root")).toBe(root);
    expect(document.rootShapes).toEqual([root]);
    expect(() => document.ungroupGroup("missing")).toThrow(
      "no such shape: missing",
    );
  });

  it("adds shapes to the last position and rejects containers moving into descendants", () => {
    const document = new CanvasDocument(400, 300);
    const outer = new Group("outer");
    const inner = new Group("inner");
    const first = new Rect("first", 0, 0, 10, 10);
    const second = new Rect("second", 10, 0, 10, 10);
    document.addShape(outer);
    document.addShape(inner, "outer");
    document.addShape(first, "inner");
    document.addShape(second, "inner");

    document.moveShape("first", "inner");
    expect(document.getChildren("inner").map((shape) => shape.id)).toEqual([
      "second",
      "first",
    ]);

    expect(() => document.moveShape("outer", "inner")).toThrow(
      "cannot move a container into its own descendant: outer",
    );
    expect(document.getParent("inner")).toBe(outer);
  });

  it("moves nodes only within their sibling order", () => {
    const document = new CanvasDocument(400, 300);
    const first = new Rect("first", 0, 0, 10, 10);
    const group = new Group("group");
    const last = new Rect("last", 10, 0, 10, 10);
    const childA = new Rect("a", 0, 0, 5, 5);
    const childB = new Rect("b", 5, 0, 5, 5);
    const childC = new Rect("c", 10, 0, 5, 5);
    document.addShape(first);
    document.addShape(group);
    document.addShape(last);
    document.addShape(childA, "group");
    document.addShape(childB, "group");
    document.addShape(childC, "group");

    document.moveToFront("first");
    document.moveToBack("last");
    expect(document.rootShapes.map((shape) => shape.id)).toEqual([
      "last",
      "group",
      "first",
    ]);

    document.moveToFront("a");
    expect(document.getChildren("group").map((shape) => shape.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    document.moveToBack("a");
    expect(document.getChildren("group").map((shape) => shape.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(document.getParent("a")).toBe(group);
    expect(() => document.moveToFront("missing")).toThrow(
      "no such shape: missing",
    );
  });
});
