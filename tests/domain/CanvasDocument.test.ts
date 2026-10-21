import { describe, expect, it } from "vitest";

import { CanvasDocument } from "../../src/domain/CanvasDocument.js";
import { Group } from "../../src/domain/Group.js";
import { Rect } from "../../src/domain/Rect.js";
import { Text } from "../../src/domain/Text.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("CanvasDocument", () => {
  it("stores root order, parent relationships, and case-sensitive ids", () => {
    const document = new CanvasDocument(400, 300);
    const group = new Group("g1");
    const rect = new Rect("shape", 0, 0, 10, 10);
    const upper = new Rect("Shape", 0, 0, 5, 5);
    const text = new Text("title", 10, 20, "Title");

    document.addShape(group);
    document.addShape(rect, "g1");
    document.addShape(upper);
    document.addShape(text);

    expect(document.rootShapes.map((shape) => shape.id)).toEqual([
      "g1",
      "Shape",
      "title",
    ]);
    expect(document.getParent("shape")).toBe(group);
    expect(document.getParent("g1")).toBeUndefined();
    expect(document.getChildren("g1")).toEqual([rect]);
    expect(document.getShape("shape")).toBe(rect);
    expect(document.getShape("Shape")).toBe(upper);
    expect(document.elementCount).toBe(4);
  });

  it("rejects duplicate ids and invalid containers without mutation", () => {
    const document = new CanvasDocument(400, 300);
    const rect = new Rect("r1", 0, 0, 10, 10);
    const duplicate = new Rect("r1", 10, 10, 5, 5);
    document.addShape(rect);

    expect(() => document.addShape(duplicate)).toThrow(
      "id already exists: r1",
    );
    expect(() => document.addShape(new Group("g1"), "missing")).toThrow(
      "no such container: missing",
    );
    expect(() => document.addShape(new Group("g1"), "r1")).toThrow(
      "not a container: r1",
    );
    expect(document.rootShapes).toEqual([rect]);
    expect(document.elementCount).toBe(1);
  });

  it("registers descendants when adding a populated group", () => {
    const document = new CanvasDocument(400, 300);
    const group = new Group("g1");
    const inner = new Group("inner");
    const rect = new Rect("r1", 0, 0, 10, 10);
    inner.appendChild(rect);
    group.appendChild(inner);

    document.addShape(group);

    expect(document.getParent("inner")).toBe(group);
    expect(document.getParent("r1")).toBe(inner);
    expect(document.elementCount).toBe(3);
  });

  it("rejects duplicate ids inside a populated group atomically", () => {
    const document = new CanvasDocument(400, 300);
    const group = new Group("g1");
    group.appendChild(new Rect("duplicate", 0, 0, 1, 1));
    group.appendChild(new Rect("duplicate", 1, 1, 1, 1));

    expect(() => document.addShape(group)).toThrow(
      "id already exists: duplicate",
    );
    expect(document.getShape("g1")).toBeUndefined();
    expect(document.elementCount).toBe(0);
  });

  it("reparents a shape and appends it in target order", () => {
    const document = new CanvasDocument(400, 300);
    const firstGroup = new Group("first");
    const secondGroup = new Group("second");
    const rect = new Rect("r1", 0, 0, 10, 10);
    document.addShape(firstGroup);
    document.addShape(secondGroup);
    document.addShape(rect, "first");

    document.moveShape("r1", "second");

    expect(document.getChildren("first")).toEqual([]);
    expect(document.getChildren("second")).toEqual([rect]);
    expect(document.getParent("r1")).toBe(secondGroup);

    document.moveShape("r1");
    expect(document.getParent("r1")).toBeUndefined();
    expect(document.rootShapes.at(-1)).toBe(rect);
  });

  it("prevents moving a group into itself or a descendant", () => {
    const document = new CanvasDocument(400, 300);
    const outer = new Group("outer");
    const inner = new Group("inner");
    document.addShape(outer);
    document.addShape(inner, "outer");

    expect(() => document.moveShape("outer", "outer")).toThrow(
      "cannot group a container into its own descendant: outer",
    );
    expect(() => document.moveShape("outer", "inner")).toThrow(
      "cannot group a container into its own descendant: outer",
    );
    expect(document.getParent("inner")).toBe(outer);
  });

  it("removes an entire subtree and unregisters all ids", () => {
    const document = new CanvasDocument(400, 300);
    const group = new Group("g1");
    const rect = new Rect("r1", 0, 0, 10, 10);
    document.addShape(group);
    document.addShape(rect, "g1");

    expect(document.removeShape("g1")).toBe(group);
    expect(document.getShape("g1")).toBeUndefined();
    expect(document.getShape("r1")).toBeUndefined();
    expect(document.rootShapes).toEqual([]);
    expect(() => document.removeShape("missing")).toThrow(
      "no such shape: missing",
    );
  });

  it("deep clones the tree and preserves a case-sensitive tree", () => {
    const document = new CanvasDocument(800, 600);
    const group = new Group("group");
    const lower = new Rect("node", 1, 2, 3, 4);
    const upper = new Rect("Node", 5, 6, 7, 8);
    document.addShape(group);
    document.addShape(lower, "group");
    document.addShape(upper);

    const clone = document.clone();
    const clonedGroup = clone.getShape("group");
    const clonedLower = clone.getShape("node");

    expect(clonedGroup).not.toBe(group);
    expect(clonedLower).not.toBe(lower);
    expect(clone.getParent("node")).toBe(clonedGroup);
    expect(clone.getShape("Node")).toBeDefined();

    clonedLower?.move(100, 0);
    expect(lower.x).toBe(1);
  });

  it("rejects invalid canvas dimensions", () => {
    expect(() => new CanvasDocument(0, 600)).toThrow(EditorError);
    expect(() => new CanvasDocument(800, Number.POSITIVE_INFINITY)).toThrow(
      "invalid canvas size",
    );
  });

  it("resizes only with valid dimensions", () => {
    const document = new CanvasDocument(800, 600);

    expect(document.resize(1024, 768)).toEqual({
      width: 1024,
      height: 768,
    });
    expect(document.width).toBe(1024);
    expect(document.height).toBe(768);

    expect(() => document.resize(0, 300)).toThrow(
      "invalid canvas size",
    );
    expect(document.canvasSize).toEqual({
      width: 1024,
      height: 768,
    });
  });
});
