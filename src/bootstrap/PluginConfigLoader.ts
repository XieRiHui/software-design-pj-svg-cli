import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { pathToFileURL } from "node:url";

import {
  type PluginActivationContext,
  type PluginDefinition,
} from "../kernel/PluginContracts.js";
import { PluginHost } from "./PluginHost.js";

interface PluginConfigEntry {
  readonly module: string;
  readonly enabled: boolean;
  readonly options: Readonly<Record<string, unknown>>;
}

interface PackageMetadata {
  readonly name: string;
  readonly contributes: Readonly<Record<string, unknown>>;
}

interface LoadedModule {
  readonly default?: unknown;
}

export async function loadPluginConfig(
  configFilePath: string,
  host: PluginHost,
): Promise<readonly string[]> {
  const absoluteConfigPath = resolve(configFilePath);
  const entries = readConfig(absoluteConfigPath);
  if (entries === undefined) {
    return ["error: invalid plugin config"];
  }

  const errors: string[] = [];
  const requireFromConfig = createRequire(absoluteConfigPath);

  for (const entry of entries) {
    if (!entry.enabled) {
      continue;
    }

    let modulePath: string;
    try {
      modulePath = requireFromConfig.resolve(entry.module);
    } catch {
      errors.push(`error: plugin not found: ${entry.module}`);
      continue;
    }

    const packageMetadata = readNearestPackageMetadata(modulePath);
    const packageName = packageMetadata?.name ?? entry.module;
    let loaded: LoadedModule;
    try {
      loaded = await import(pathToFileURL(modulePath).href) as LoadedModule;
    } catch (error) {
      errors.push(
        `error: plugin failed to activate: ${packageName} (${reasonOf(error)})`,
      );
      continue;
    }

    if (!isPluginModule(loaded.default)) {
      errors.push(`error: plugin has no default export: ${entry.module}`);
      continue;
    }

    const plugin: PluginDefinition = {
      name: packageName,
      contributes: readContributions(packageMetadata),
      activate: loaded.default.activate.bind(loaded.default),
    };
    const result = host.install(plugin, entry.options);
    if (!result.ok) {
      errors.push(`error: ${result.message}`);
    }
  }

  return errors;
}

function readConfig(
  configFilePath: string,
): readonly PluginConfigEntry[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configFilePath, "utf8")) as unknown;
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.plugins)) {
    return undefined;
  }

  const entries: PluginConfigEntry[] = [];
  for (const rawEntry of parsed.plugins) {
    if (!isRecord(rawEntry) || typeof rawEntry.module !== "string") {
      return undefined;
    }

    const enabled = rawEntry.enabled ?? true;
    if (typeof enabled !== "boolean") {
      return undefined;
    }

    const options = rawEntry.options ?? {};
    if (!isRecord(options)) {
      return undefined;
    }

    if (rawEntry.module.trim().length === 0) {
      return undefined;
    }

    entries.push({
      module: rawEntry.module,
      enabled,
      options,
    });
  }

  return entries;
}

function readNearestPackageMetadata(
  modulePath: string,
): PackageMetadata | undefined {
  let directory = dirname(modulePath);
  while (true) {
    const packagePath = join(directory, "package.json");
    try {
      const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as unknown;
      if (isRecord(parsed) && typeof parsed.name === "string") {
        return {
          name: parsed.name,
          contributes: isRecord(parsed.contributes)
            ? parsed.contributes
            : {},
        };
      }
    } catch {
      // Continue toward the filesystem root.
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
}

function readContributions(
  metadata: PackageMetadata | undefined,
): PluginDefinition["contributes"] {
  if (metadata === undefined) {
    return {};
  }

  const contributes = metadata.contributes;
  return {
    shapes: stringList(contributes.shapes),
    commands: stringList(contributes.commands),
    decorators: stringList(contributes.decorators),
    attributes: stringList(contributes.attributes),
  };
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function isPluginModule(
  value: unknown,
): value is { activate(context: PluginActivationContext): void } {
  return (
    isRecord(value) &&
    typeof value.activate === "function"
  );
}

function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
