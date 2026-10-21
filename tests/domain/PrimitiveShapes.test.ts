import { describe, expect, it } from "vitest";

import { Circle } from "../../src/domain/Circle.js";
import { Ellipse } from "../../src/domain/Ellipse.js";
import { Line } from "../../src/domain/Line.js";
import { Rect } from "../../src/domain/Rect.js";
import { Text } from "../../src/domain/Text.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("primitive shapes", () => {
  it("moves, scales, sets attributes, and clones a rect", () => {
    const rect = new Rect("r1", 10, 20, 30, 40, "red");

    rect.move(5, -10);
    expect([rect.x, rect.y]).toEqual([15, 10]);

    rect.setAttribute("width", "25");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "2");
    rect.scale(2);

    expect(rect.getAttribute("x")).toBe("30");
    expect(rect.getAttribute("y")).toBe("20");
    expect(rect.getAttribute("width")).toBe("50");
    expect(rect.getAttribute("height")).toBe("80");
    expect(rect.getAttribute("fill")).toBe("red");
    expect(rect.getAttribute("stroke")).toBe("black");
    expect(rect.getAttribute("stroke-width")).toBe("2");

    const clone = rect.clone();
    clone.setAttribute("x", "500");
    clone.setAttribute("fill", "blue");

    expect(clone).not.toBe(rect);
    expect(clone.x).toBe(500);
    expect(rect.x).toBe(30);
    expect(rect.fill).toBe("red");
  });

  it("moves, scales, sets attributes, and clones a circle", () => {
    const circle = new Circle("c1", 10, 20, 5, "green");

    circle.move(-5, 10);
    circle.setAttribute("cx", "20");
    circle.setAttribute("r", "8");
    circle.scale(1.5);

    expect(circle.getAttribute("cx")).toBe("30");
    expect(circle.getAttribute("cy")).toBe("45");
    expect(circle.getAttribute("r")).toBe("12");

    const clone = circle.clone();
    clone.setAttribute("r", "2");
    expect(circle.radius).toBe(12);
    expect(clone.radius).toBe(2);
  });

  it("moves, scales, sets attributes, and clones an ellipse", () => {
    const ellipse = new Ellipse("e1", 4, 6, 2, 3, "orange");

    ellipse.move(2, 4);
    ellipse.setAttribute("rx", "4");
    ellipse.setAttribute("ry", "5");
    ellipse.scale(2);

    expect(ellipse.getAttribute("cx")).toBe("12");
    expect(ellipse.getAttribute("cy")).toBe("20");
    expect(ellipse.getAttribute("rx")).toBe("8");
    expect(ellipse.getAttribute("ry")).toBe("10");
    expect(ellipse.clone().getAttribute("fill")).toBe("orange");
  });

  it("moves, scales, sets attributes, and clones a line", () => {
    const line = new Line("l1", 0, 0, 10, 20, undefined, "black");

    line.move(3, -2);
    line.setAttribute("x2", "20");
    line.scale(2);

    expect(line.getAttribute("x1")).toBe("6");
    expect(line.getAttribute("y1")).toBe("-4");
    expect(line.getAttribute("x2")).toBe("40");
    expect(line.getAttribute("y2")).toBe("36");
    expect(line.getAttribute("stroke")).toBe("black");
    expect(line.clone().getAttribute("x1")).toBe("6");
  });

  it("moves text coordinates, preserves content, and clones it", () => {
    const text = new Text("t1", -5, 10, "My Diagram", "white");

    text.move(5, 2);
    text.setAttribute("text", "Updated title");
    text.scale(2);

    expect(text.getAttribute("x")).toBe("0");
    expect(text.getAttribute("y")).toBe("24");
    expect(text.getAttribute("text")).toBe("Updated title");

    const clone = text.clone();
    clone.setAttribute("text", "Clone");
    expect(text.text).toBe("Updated title");
    expect(clone.text).toBe("Clone");
  });

  it("allows negative coordinates but rejects invalid dimensions", () => {
    expect(() => new Rect("negative", -10, -20, 30, 40)).not.toThrow();
    expect(() => new Rect("zero", 0, 0, 0, 10)).toThrow(
      "invalid value for attribute: width",
    );
    expect(() => new Circle("circle", 0, 0, -1)).toThrow(
      "invalid value for attribute: r",
    );
    expect(() => new Ellipse("ellipse", 0, 0, 2, 0)).toThrow(
      "invalid value for attribute: ry",
    );
    expect(() => new Line("line", 0, 0, Number.NaN, 1)).toThrow(
      EditorError,
    );
  });

  it("rejects unknown attributes and non-positive scaling", () => {
    const rect = new Rect("r1", 1, 2, 3, 4);

    expect(() => rect.setAttribute("opacity", "0.5")).toThrow(
      "unknown attribute: opacity",
    );
    expect(() => rect.scale(0)).toThrow(
      "scale factor must be positive",
    );
    expect([rect.x, rect.width]).toEqual([1, 3]);
  });
});
