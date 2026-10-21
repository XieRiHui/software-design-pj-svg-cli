import { EditorError } from "../shared/EditorError.js";
import { CompositeShape } from "./CompositeShape.js";
import { type Shape } from "./Shape.js";

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

export class CanvasDocument {
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly rootChildren: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();
  private readonly parentsById = new Map<
    string,
    CompositeShape | null
  >();

  public constructor(width: number, height: number) {
    this.assertCanvasSize(width, height);
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public get width(): number {
    return this.canvasWidth;
  }

  public get height(): number {
    return this.canvasHeight;
  }

  public get canvasSize(): CanvasSize {
    return Object.freeze({
      width: this.canvasWidth,
      height: this.canvasHeight,
    });
  }

  public get rootShapes(): readonly Shape[] {
    return [...this.rootChildren];
  }

  public get elementCount(): number {
    return this.shapesById.size;
  }

  public getShape(id: string): Shape | undefined {
    return this.shapesById.get(id);
  }

  public getParent(id: string): CompositeShape | undefined {
    return this.parentsById.get(id) ?? undefined;
  }

  public getChildren(containerId: string): readonly Shape[] {
    const container = this.requireContainer(containerId);
    return container.children;
  }

  public addShape(
    shape: Shape,
    containerId?: string,
  ): void {
    const parent = this.resolveParent(containerId);
    const subtree = this.collectSubtree(shape);
    this.assertUniqueSubtreeIds(subtree);

    if (parent === undefined) {
      this.rootChildren.push(shape);
    } else {
      parent.appendChild(shape);
    }

    this.registerSubtree(shape, parent ?? null);
  }

  public moveShape(
    id: string,
    containerId?: string,
  ): void {
    const shape = this.requireShape(id);
    const target = this.resolveParent(containerId);
    const parent = this.parentsById.get(id) ?? null;

    if (
      shape instanceof CompositeShape &&
      target !== undefined &&
      shape.contains(target)
    ) {
      throw new EditorError(
        `cannot group a container into its own descendant: ${id}`,
      );
    }

    if (parent === null) {
      this.removeRoot(shape);
    } else {
      parent.removeChild(shape);
    }

    if (target === undefined) {
      this.rootChildren.push(shape);
      this.parentsById.set(id, null);
    } else {
      target.appendChild(shape);
      this.parentsById.set(id, target);
    }
  }

  public removeShape(id: string): Shape {
    const shape = this.requireShape(id);
    const parent = this.parentsById.get(id) ?? null;

    if (parent === null) {
      this.removeRoot(shape);
    } else {
      parent.removeChild(shape);
    }

    this.unregisterSubtree(shape);
    return shape;
  }

  public clone(): CanvasDocument {
    const clone = new CanvasDocument(this.width, this.height);
    for (const shape of this.rootChildren) {
      clone.addShape(shape.clone());
    }

    return clone;
  }

  private resolveParent(
    containerId: string | undefined,
  ): CompositeShape | undefined {
    if (containerId === undefined) {
      return undefined;
    }

    return this.requireContainer(containerId);
  }

  private requireContainer(id: string): CompositeShape {
    const shape = this.shapesById.get(id);
    if (shape === undefined) {
      throw new EditorError(`no such container: ${id}`);
    }

    if (!(shape instanceof CompositeShape)) {
      throw new EditorError(`not a container: ${id}`);
    }

    return shape;
  }

  private requireShape(id: string): Shape {
    const shape = this.shapesById.get(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }

    return shape;
  }

  private collectSubtree(shape: Shape): readonly Shape[] {
    const shapes: Shape[] = [shape];
    if (shape instanceof CompositeShape) {
      for (const child of shape.children) {
        shapes.push(...this.collectSubtree(child));
      }
    }

    return shapes;
  }

  private assertUniqueSubtreeIds(
    shapes: readonly Shape[],
  ): void {
    const newIds = new Set<string>();
    for (const shape of shapes) {
      if (
        this.shapesById.has(shape.id) ||
        newIds.has(shape.id)
      ) {
        throw new EditorError(
          `id already exists: ${shape.id}`,
        );
      }

      newIds.add(shape.id);
    }
  }

  private registerSubtree(
    shape: Shape,
    parent: CompositeShape | null,
  ): void {
    this.shapesById.set(shape.id, shape);
    this.parentsById.set(shape.id, parent);

    if (shape instanceof CompositeShape) {
      for (const child of shape.children) {
        this.registerSubtree(child, shape);
      }
    }
  }

  private unregisterSubtree(shape: Shape): void {
    this.shapesById.delete(shape.id);
    this.parentsById.delete(shape.id);

    if (shape instanceof CompositeShape) {
      for (const child of shape.children) {
        this.unregisterSubtree(child);
      }
    }
  }

  private removeRoot(shape: Shape): void {
    const index = this.rootChildren.indexOf(shape);
    if (index === -1) {
      throw new EditorError(`no such shape: ${shape.id}`);
    }

    this.rootChildren.splice(index, 1);
  }

  private assertCanvasSize(width: number, height: number): void {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new EditorError("invalid canvas size");
    }
  }
}
