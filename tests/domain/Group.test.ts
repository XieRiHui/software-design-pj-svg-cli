import { describe, expect, it } from "vitest";

import { Group } from "../../src/domain/Group.js";
import { Rect } from "../../src/domain/Rect.js";
import { Text } from "../../src/domain/Text.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("Group", () => {
  it("applies move and scale recursively to all descendants", () => {
    const group = new Group("g1");
    const rect = new Rect("r1", 10, 20, 30, 40);
    const text = new Text("t1", 5, 10, "Label");
    group.appendChild(rect);
    group.appendChild(text);

    group.move(5, 10);
    group.scale(2);

    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([
      30,
      60,
      60,
      80,
    ]);
    expect([text.x, text.y, text.text]).toEqual([20, 40, "Label"]);
  });

  it("keeps child order and clones the tree independently", () => {
    const group = new Group("g1", "red");
    const rect = new Rect("r1", 0, 0, 10, 10);
    const text = new Text("t1", 1, 2, "Title");
    group.appendChild(rect);
    group.appendChild(text);

    const clone = group.clone();
    const clonedRect = clone.children[0];

    expect(clone.children.map((child) => child.id)).toEqual(["r1", "t1"]);
    expect(clone.fill).toBe("red");
    expect(clonedRect).not.toBe(rect);

    clonedRect?.move(100, 100);
    expect(rect.x).toBe(0);
  });

  it("sets common group attributes but rejects geometry attributes", () => {
    const group = new Group("g1");

    group.setAttribute("fill", "blue");
    group.setAttribute("stroke-width", "3");

    expect(group.getAttribute("fill")).toBe("blue");
    expect(group.getAttribute("stroke-width")).toBe("3");
    expect(() => group.setAttribute("x", "10")).toThrow(
      "unknown attribute: x",
    );
  });

  it("prevents adding itself or an ancestor into a descendant group", () => {
    const outer = new Group("outer");
    const inner = new Group("inner");
    outer.appendChild(inner);

    expect(() => outer.appendChild(outer)).toThrow(EditorError);
    expect(() => inner.appendChild(outer)).toThrow(
      "cannot group a container into its own descendant: outer",
    );
    expect(inner.children).toEqual([]);
  });

  it("removes children without disturbing the remaining order", () => {
    const group = new Group("g1");
    const first = new Rect("first", 0, 0, 1, 1);
    const second = new Rect("second", 0, 0, 1, 1);
    group.appendChild(first);
    group.appendChild(second);

    expect(group.removeChild(first)).toBe(true);
    expect(group.removeChild(first)).toBe(false);
    expect(group.children.map((child) => child.id)).toEqual(["second"]);
  });
});
