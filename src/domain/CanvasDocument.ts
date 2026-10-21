import { EditorError } from "../shared/EditorError.js";
import { CompositeShape } from "./CompositeShape.js";
import { Group } from "./Group.js";
import { type Shape } from "./Shape.js";

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

export class CanvasDocument {
  private canvasWidth: number;
  private canvasHeight: number;
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

  public resize(width: number, height: number): CanvasSize {
    this.assertCanvasSize(width, height);
    this.canvasWidth = width;
    this.canvasHeight = height;
    return this.canvasSize;
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

  public groupShapes(
    newId: string,
    ids: readonly string[],
  ): Group {
    if (this.shapesById.has(newId)) {
      throw new EditorError(`id already exists: ${newId}`);
    }

    if (ids.length === 0) {
      throw new EditorError("group requires at least one shape");
    }

    const group = new Group(newId);
    const selected: Shape[] = [];
    for (const id of ids) {
      const shape = this.requireShape(id);
      if (selected.includes(shape)) {
        throw new EditorError(`duplicate group target: ${id}`);
      }
      selected.push(shape);
    }

    this.assertNoSelectedDescendant(selected);

    const locations = new Map<
      Shape,
      { readonly parent: CompositeShape | null; readonly index: number }
    >();
    for (const shape of selected) {
      locations.set(shape, this.getLocation(shape));
    }

    const first = selected[0];
    if (first === undefined) {
      throw new EditorError("group requires at least one shape");
    }

    const firstLocation = locations.get(first);
    if (firstLocation === undefined) {
      throw new EditorError(`no such shape: ${first.id}`);
    }

    let insertionIndex = firstLocation.index;
    for (const shape of selected.slice(1)) {
      const location = locations.get(shape);
      if (
        location !== undefined &&
        location.parent === firstLocation.parent &&
        location.index < firstLocation.index
      ) {
        insertionIndex -= 1;
      }
    }

    for (const shape of selected) {
      this.detachShape(shape);
    }

    for (const shape of selected) {
      group.appendChild(shape);
    }

    if (firstLocation.parent === null) {
      this.rootChildren.splice(insertionIndex, 0, group);
    } else {
      firstLocation.parent.insertChild(insertionIndex, group);
    }

    this.shapesById.set(group.id, group);
    this.parentsById.set(group.id, firstLocation.parent);
    for (const shape of selected) {
      this.parentsById.set(shape.id, group);
    }

    return group;
  }

  public ungroupGroup(id: string): readonly Shape[] {
    const shape = this.requireShape(id);
    if (!(shape instanceof CompositeShape)) {
      throw new EditorError(`not a container: ${id}`);
    }

    if (!shape.isUngroupable) {
      throw new EditorError(
        `cannot ungroup composite shape: ${id}`,
      );
    }

    const parent = this.parentsById.get(id);
    if (parent === undefined || parent === null) {
      throw new EditorError(
        `cannot ungroup top-level container: ${id}`,
      );
    }

    const index = parent.children.indexOf(shape);
    if (index === -1) {
      throw new EditorError(`no such shape: ${id}`);
    }

    const children = shape.children;
    for (const child of children) {
      shape.removeChild(child);
    }
    parent.removeChild(shape);

    children.forEach((child, childIndex) => {
      parent.insertChild(index + childIndex, child);
      this.parentsById.set(child.id, parent);
    });

    this.shapesById.delete(id);
    this.parentsById.delete(id);
    return children;
  }

  public moveToFront(id: string): void {
    const shape = this.requireShape(id);
    const parent = this.parentsById.get(id) ?? null;

    if (parent === null) {
      this.removeRoot(shape);
      this.rootChildren.push(shape);
      return;
    }

    parent.removeChild(shape);
    parent.appendChild(shape);
  }

  public moveToBack(id: string): void {
    const shape = this.requireShape(id);
    const parent = this.parentsById.get(id) ?? null;

    if (parent === null) {
      this.removeRoot(shape);
      this.rootChildren.unshift(shape);
      return;
    }

    parent.removeChild(shape);
    parent.insertChild(0, shape);
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

  private assertNoSelectedDescendant(
    selected: readonly Shape[],
  ): void {
    for (const shape of selected) {
      if (!(shape instanceof CompositeShape)) {
        continue;
      }

      for (const other of selected) {
        if (shape !== other && shape.contains(other)) {
          throw new EditorError(
            `cannot group a container into its own descendant: ${shape.id}`,
          );
        }
      }
    }
  }

  private getLocation(shape: Shape): {
    readonly parent: CompositeShape | null;
    readonly index: number;
  } {
    const parent = this.parentsById.get(shape.id) ?? null;
    const siblings = parent === null
      ? this.rootChildren
      : parent.children;
    const index = siblings.indexOf(shape);
    if (index === -1) {
      throw new EditorError(`no such shape: ${shape.id}`);
    }

    return { parent, index };
  }

  private detachShape(shape: Shape): void {
    const parent = this.parentsById.get(shape.id) ?? null;
    if (parent === null) {
      this.removeRoot(shape);
    } else {
      parent.removeChild(shape);
    }
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
