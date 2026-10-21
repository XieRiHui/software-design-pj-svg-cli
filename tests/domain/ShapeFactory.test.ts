import { describe, expect, it } from "vitest";

import { Circle } from "../../src/domain/Circle.js";
import { Ellipse } from "../../src/domain/Ellipse.js";
import { Group } from "../../src/domain/Group.js";
import { Line } from "../../src/domain/Line.js";
import { Rect } from "../../src/domain/Rect.js";
import { ShapeFactory } from "../../src/domain/ShapeFactory.js";
import { Text } from "../../src/domain/Text.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("ShapeFactory", () => {
  const factory = new ShapeFactory();

  it("creates all built-in shape types", () => {
    const rect = factory.create("rect", "r1", [
      "10",
      "20",
      "30",
      "40",
      "red",
    ]);
    const circle = factory.create("circle", "c1", [
      "10",
      "20",
      "5",
      "green",
    ]);
    const ellipse = factory.create("ellipse", "e1", [
      "1",
      "2",
      "3",
      "4",
    ]);
    const line = factory.create("line", "l1", [
      "0",
      "0",
      "10",
      "10",
      "black",
    ]);
    const text = factory.create("text", "t1", [
      "10",
      "20",
      "My Diagram",
    ]);
    const group = factory.create("g", "g1", []);

    expect(rect).toBeInstanceOf(Rect);
    expect(circle).toBeInstanceOf(Circle);
    expect(ellipse).toBeInstanceOf(Ellipse);
    expect(line).toBeInstanceOf(Line);
    expect(text).toBeInstanceOf(Text);
    expect(group).toBeInstanceOf(Group);
    expect(rect.getAttribute("fill")).toBe("red");
    expect(circle.getAttribute("fill")).toBe("green");
    expect(line.getAttribute("stroke")).toBe("black");
    expect(text.getAttribute("text")).toBe("My Diagram");
  });

  it("omits optional presentation attributes when not provided", () => {
    const rect = factory.create("rect", "r1", [
      "0",
      "0",
      "10",
      "10",
    ]);
    const circle = factory.create("circle", "c1", ["0", "0", "5"]);
    const line = factory.create("line", "l1", ["0", "0", "1", "1"]);

    expect(rect.getAttribute("fill")).toBeUndefined();
    expect(circle.getAttribute("fill")).toBeUndefined();
    expect(line.getAttribute("stroke")).toBeUndefined();
  });

  it("rejects unknown, box, and malformed shape requests", () => {
    expect(() => factory.create("hexagon", "h1", [])).toThrow(
      "unknown shape type: hexagon (is the plugin loaded?)",
    );
    expect(() => factory.create("box", "b1", [])).toThrow(
      "unknown shape type: box (is the plugin loaded?)",
    );
    expect(() =>
      factory.create("rect", "r1", ["0", "0", "10"]),
    ).toThrow("invalid rect parameters");
    expect(() =>
      factory.create("circle", "c1", ["0", "0", "not-a-number"]),
    ).toThrow(EditorError);
  });
});
