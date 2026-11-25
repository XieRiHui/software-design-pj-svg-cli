import { describe, expect, it } from "vitest";

import { PluginHost } from "../../src/bootstrap/PluginHost.js";
import {
  type AttributeHandler,
  type PluginContributions,
  type PluginDefinition,
  type ShapeProvider,
  type TreeDecorator,
} from "../../src/kernel/PluginContracts.js";
import { type Command } from "../../src/kernel/CommandContracts.js";
import { Group } from "../../src/domain/Group.js";

const shape: ShapeProvider = {
  name: "diamond",
  typeName: "diamond",
  restorePriority: 10,
  canRestore: (elementName) => elementName === "polygon",
  create: (id) => new Group(id),
  restore: (id) => new Group(id),
};

const command: Command = {
  name: "sample",
  help: {
    section: "Plugin commands",
    sectionOrder: 50,
    line: "sample",
    order: 1,
  },
  execute: () => "sample",
};

const decorator: TreeDecorator = {
  name: "sample-mark",
  decorate: () => ["[sample]"],
};

const handler: AttributeHandler = {
  name: "sample-attributes",
  handles: () => false,
  apply: () => {},
};

describe("PluginHost", () => {
  it("validates and commits all four extension categories", () => {
    const host = new PluginHost();
    const plugin = pluginDefinition("sample-plugin", {
      shapes: [shape],
      commands: [command],
      decorators: [decorator],
      attributes: [handler],
    });

    expect(host.install(plugin)).toEqual({
      ok: true,
      name: "sample-plugin",
    });
    expect(host.snapshot()).toMatchObject({
      shapes: [shape],
      commands: [command],
      decorators: [decorator],
      attributes: [handler],
    });
  });

  it("rolls back all staged registrations on manifest mismatch", () => {
    const host = new PluginHost();
    const plugin = pluginDefinition(
      "mismatch",
      {
        commands: [command],
        decorators: [decorator],
      },
      { commands: ["sample"] },
    );

    const result = host.install(plugin);

    expect(result).toMatchObject({
      ok: false,
      code: "manifest-mismatch",
    });
    expect(host.snapshot().commands).toEqual([]);
    expect(host.snapshot().decorators).toEqual([]);
  });

  it("rolls back staged registrations when activate throws", () => {
    const host = new PluginHost();
    const plugin: PluginDefinition = {
      name: "broken",
      contributes: { commands: ["sample"] },
      activate(context) {
        context.registerCommand(command);
        throw new Error("boom");
      },
    };

    expect(host.install(plugin)).toEqual({
      ok: false,
      code: "activation-failed",
      message: "plugin failed to activate: broken (boom)",
    });
    expect(host.snapshot().commands).toEqual([]);
  });

  it("rejects duplicate names without committing the new plugin", () => {
    const host = new PluginHost();
    expect(host.install(
      pluginDefinition("first", { commands: [command] }),
    ).ok).toBe(true);

    const secondCommand = { ...command, help: { ...command.help, order: 2 } };
    const result = host.install(
      pluginDefinition(
        "second",
        {
          commands: [secondCommand],
          decorators: [decorator],
        },
      ),
    );

    expect(result).toEqual({
      ok: false,
      code: "duplicate-registration",
      message: "duplicate registration: commands/sample",
    });
    expect(host.snapshot().decorators).toEqual([]);
  });
});

function pluginDefinition(
  name: string,
  registrations: {
    readonly shapes?: readonly ShapeProvider[];
    readonly commands?: readonly Command[];
    readonly decorators?: readonly TreeDecorator[];
    readonly attributes?: readonly AttributeHandler[];
  },
  contributions: PluginContributions = contributionsFrom(registrations),
): PluginDefinition {
  return {
    name,
    contributes: contributions,
    activate(context) {
      for (const provider of registrations.shapes ?? []) {
        context.registerShape(provider);
      }
      for (const item of registrations.commands ?? []) {
        context.registerCommand(item);
      }
      for (const item of registrations.decorators ?? []) {
        context.registerTreeDecorator(item);
      }
      for (const item of registrations.attributes ?? []) {
        context.registerAttributeHandler(item);
      }
    },
  };
}

function contributionsFrom(registrations: {
  readonly shapes?: readonly ShapeProvider[];
  readonly commands?: readonly Command[];
  readonly decorators?: readonly TreeDecorator[];
  readonly attributes?: readonly AttributeHandler[];
}): PluginContributions {
  const contributions: {
    shapes?: readonly string[];
    commands?: readonly string[];
    decorators?: readonly string[];
    attributes?: readonly string[];
  } = {};
  if (registrations.shapes !== undefined) {
    contributions.shapes = registrations.shapes.map((item) => item.name);
  }
  if (registrations.commands !== undefined) {
    contributions.commands = registrations.commands.map((item) => item.name);
  }
  if (registrations.decorators !== undefined) {
    contributions.decorators = registrations.decorators.map(
      (item) => item.name,
    );
  }
  if (registrations.attributes !== undefined) {
    contributions.attributes = registrations.attributes.map(
      (item) => item.name,
    );
  }
  return contributions;
}
