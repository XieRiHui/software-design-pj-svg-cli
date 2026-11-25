import {
  type Command,
} from "../kernel/CommandContracts.js";
import {
  type AttributeHandler,
  type PluginActivationContext,
  type PluginContributions,
  type PluginDefinition,
  type PluginOptions,
  type PluginRegistrationSnapshot,
  type ShapeProvider,
  type TreeDecorator,
} from "../kernel/PluginContracts.js";
import { type DirectoryReader } from "../kernel/CommandContracts.js";
import { NodeDirectoryReader } from "../infrastructure/NodeDirectoryReader.js";

interface MutableRegistrations {
  shapes: ShapeProvider[];
  commands: Command[];
  decorators: TreeDecorator[];
  attributes: AttributeHandler[];
}

interface NormalizedContributions {
  readonly shapes: readonly string[];
  readonly commands: readonly string[];
  readonly decorators: readonly string[];
  readonly attributes: readonly string[];
}

export type PluginInstallResult =
  | { readonly ok: true; readonly name: string }
  | {
    readonly ok: false;
    readonly code:
      | "manifest-mismatch"
      | "duplicate-registration"
      | "activation-failed";
    readonly message: string;
  };

export class PluginHost {
  private readonly registrations: MutableRegistrations = {
    shapes: [],
    commands: [],
    decorators: [],
    attributes: [],
  };
  private readonly installedNames: string[] = [];

  public constructor(
    private readonly directories: DirectoryReader =
      new NodeDirectoryReader(),
  ) {}

  public install(
    plugin: PluginDefinition,
    options: PluginOptions = {},
  ): PluginInstallResult {
    const stage: MutableRegistrations = {
      shapes: [],
      commands: [],
      decorators: [],
      attributes: [],
    };
    const context = this.createActivationContext(stage, options);

    try {
      plugin.activate(context);
    } catch (error) {
      return {
        ok: false,
        code: "activation-failed",
        message:
          `plugin failed to activate: ${plugin.name} (${reasonOf(error)})`,
      };
    }

    const actual = normalizeRegistrations(stage);
    const declared = normalizeContributions(plugin.contributes);
    if (!contributionsEqual(actual, declared)) {
      return {
        ok: false,
        code: "manifest-mismatch",
        message:
          `plugin manifest mismatch: ${plugin.name} ` +
          `(declared: ${formatContributions(declared)}, ` +
          `registered: ${formatContributions(actual)})`,
      };
    }

    const duplicate = this.findDuplicate(stage);
    if (duplicate !== undefined) {
      return {
        ok: false,
        code: "duplicate-registration",
        message: `duplicate registration: ${duplicate}`,
      };
    }

    this.registrations.shapes.push(...stage.shapes);
    this.registrations.commands.push(...stage.commands);
    this.registrations.decorators.push(...stage.decorators);
    this.registrations.attributes.push(...stage.attributes);
    this.installedNames.push(plugin.name);
    return { ok: true, name: plugin.name };
  }

  public snapshot(): PluginRegistrationSnapshot {
    return {
      shapes: [...this.registrations.shapes],
      commands: [...this.registrations.commands],
      decorators: [...this.registrations.decorators],
      attributes: [...this.registrations.attributes],
    };
  }

  public installedPlugins(): readonly string[] {
    return [...this.installedNames];
  }

  private createActivationContext(
    stage: MutableRegistrations,
    options: PluginOptions,
  ): PluginActivationContext {
    return {
      options: Object.freeze({ ...options }),
      directories: this.directories,
      registerShape: (provider) => {
        stage.shapes.push(provider);
      },
      registerCommand: (command) => {
        stage.commands.push(command);
      },
      registerTreeDecorator: (decorator) => {
        stage.decorators.push(decorator);
      },
      registerAttributeHandler: (handler) => {
        stage.attributes.push(handler);
      },
    };
  }

  private findDuplicate(stage: MutableRegistrations): string | undefined {
    const shapes = [
      ...this.registrations.shapes,
      ...stage.shapes,
    ];
    return (
      duplicateName(
        "shapes",
        shapes,
        (provider) => provider.name,
      ) ??
      duplicateName(
        "shapes",
        shapes,
        (provider) => provider.typeName,
      ) ??
      duplicateName(
        "commands",
        [...this.registrations.commands, ...stage.commands],
        (item) => item.name,
      ) ??
      duplicateName(
        "decorators",
        [...this.registrations.decorators, ...stage.decorators],
        (item) => item.name,
      ) ??
      duplicateName(
        "attributes",
        [...this.registrations.attributes, ...stage.attributes],
        (item) => item.name,
      )
    );
  }
}

function normalizeRegistrations(
  registrations: MutableRegistrations,
): NormalizedContributions {
  return {
    shapes: stableNames(
      registrations.shapes.map((provider) => provider.name),
    ),
    commands: stableNames(
      registrations.commands.map((command) => command.name),
    ),
    decorators: stableNames(
      registrations.decorators.map((decorator) => decorator.name),
    ),
    attributes: stableNames(
      registrations.attributes.map((handler) => handler.name),
    ),
  };
}

function normalizeContributions(
  contributions: PluginContributions,
): NormalizedContributions {
  return {
    shapes: stableNames(contributions.shapes ?? []),
    commands: stableNames(contributions.commands ?? []),
    decorators: stableNames(contributions.decorators ?? []),
    attributes: stableNames(contributions.attributes ?? []),
  };
}

function stableNames(names: readonly string[]): readonly string[] {
  return [...new Set(names)].sort();
}

function contributionsEqual(
  left: NormalizedContributions,
  right: NormalizedContributions,
): boolean {
  return (
    arraysEqual(left.shapes, right.shapes) &&
    arraysEqual(left.commands, right.commands) &&
    arraysEqual(left.decorators, right.decorators) &&
    arraysEqual(left.attributes, right.attributes)
  );
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function formatContributions(
  contributions: NormalizedContributions,
): string {
  return [
    `shapes=[${contributions.shapes.join(",")}]`,
    `commands=[${contributions.commands.join(",")}]`,
    `decorators=[${contributions.decorators.join(",")}]`,
    `attributes=[${contributions.attributes.join(",")}]`,
  ].join("; ");
}

function duplicateName<T>(
  category: string,
  items: readonly T[],
  keyOf: (item: T) => string,
): string | undefined {
  const names = new Set<string>();
  for (const item of items) {
    const registrationKey = keyOf(item);
    if (names.has(registrationKey)) {
      return `${category}/${itemName(item)}`;
    }
    names.add(registrationKey);
  }

  return undefined;
}

function itemName(item: unknown): string {
  return (item as { readonly name: string }).name;
}

function reasonOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
