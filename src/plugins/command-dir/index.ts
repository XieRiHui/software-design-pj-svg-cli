import {
  type Command,
  type CommandExecutionContext,
  type CommandHelp,
  type CommandToken,
  type DirectoryEntry,
} from "../../kernel/CommandContracts.js";
import {
  type PluginActivationContext,
  type PluginDefinition,
} from "../../kernel/PluginContracts.js";
import { EditorError } from "../../shared/EditorError.js";

const KIND_ORDER: Readonly<Record<DirectoryEntry["kind"], number>> = {
  directory: 0,
  file: 1,
  symlink: 2,
  other: 3,
};

const KIND_LABEL: Readonly<Record<DirectoryEntry["kind"], string>> = {
  directory: "[DIR]",
  file: "[FILE]",
  symlink: "[SYMLINK]",
  other: "[OTHER]",
};

class DirCommand implements Command {
  public readonly name = "dir";
  public readonly help: CommandHelp = {
    section: "Plugin commands",
    sectionOrder: 50,
    line: "dir",
    order: 20,
  };

  public execute(
    args: readonly CommandToken[],
    context: CommandExecutionContext,
  ): string {
    if (args.length !== 0) {
      throw new EditorError("usage: dir");
    }

    let entries: readonly DirectoryEntry[];
    try {
      entries = context.directories.list(context.workingDirectory);
    } catch {
      throw new EditorError(
        `cannot read directory: ${context.workingDirectory}`,
      );
    }

    if (entries.length === 0) {
      return "(empty directory)";
    }

    return [...entries]
      .sort(
        (left, right) =>
          KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
          compareNames(left.name, right.name),
      )
      .map(
        (entry) => `${KIND_LABEL[entry.kind]}  ${entry.name}`,
      )
      .join("\n");
  }
}

export const commandDirPlugin: PluginDefinition = {
  name: "@svgframe/plugin-command-dir",
  contributes: {
    commands: ["dir"],
  },
  activate(context: PluginActivationContext): void {
    context.registerCommand(new DirCommand());
  },
};

export default commandDirPlugin;

function compareNames(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
