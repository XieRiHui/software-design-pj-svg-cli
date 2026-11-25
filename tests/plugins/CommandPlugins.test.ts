import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createPluginApplication,
  type PluginApplication,
} from "../../src/bootstrap/ApplicationAssembler.js";
import { createCodeAssembledApplication } from "../../src/bootstrap/codeAssembly.js";
import { createConfiguredApplication } from "../../src/bootstrap/configuredAssembly.js";
import { CommandExecutor } from "../../src/cli/CommandExecutor.js";
import {
  type DirectoryEntry,
  type DirectoryReader,
} from "../../src/kernel/CommandContracts.js";
import { commandDirPlugin } from "../../src/plugins/command-dir/index.js";
import { commandStatsPlugin } from "../../src/plugins/command-stats/index.js";
import { shapeBoxPlugin } from "../../src/plugins/shape-box/index.js";

describe("stats command plugin", () => {
  it("counts leaves depth-first and containers without mutating history", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [commandStatsPlugin],
    }));
    executor.execute("init");

    expect(executor.execute("stats")).toBe("(total 0, containers 0)");
    executor.execute("create g left");
    executor.execute("create circle c1 10 10 5 in left");
    executor.execute('create text t1 20 20 "Label" in left');
    executor.execute("create g right");
    executor.execute("create line l1 0 0 10 10 in right");
    executor.execute("create rect r1 0 0 10 10 in right");

    expect(executor.execute("stats")).toBe(
      "circle: 1  text: 1  line: 1  rect: 1  (total 4, containers 2)",
    );
    expect(executor.execute("undo")).toBe("rect#r1 creation undone");
    expect(executor.execute("stats")).toBe(
      "circle: 1  text: 1  line: 1  (total 3, containers 2)",
    );
  });

  it("counts leaves inside box containers", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [commandStatsPlugin, shapeBoxPlugin],
    }));
    executor.execute("init");
    executor.execute('create box parent 0 0 200 100 "Parent"');
    executor.execute(
      'create box child 20 10 80 40 "Child" in parent',
    );

    expect(executor.execute("stats")).toBe(
      "rect: 2  text: 2  (total 4, containers 2)",
    );
  });

  it("is absent when its plugin is not loaded", () => {
    const executor = createExecutor(createPluginApplication());

    expect(executor.execute("stats")).toBe(
      "error: unknown command: stats",
    );
  });
});

describe("dir command plugin", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uses a test double for sorting, hidden entries, and empty directories", () => {
    const reader = new FakeDirectoryReader({
      entries: [
        { name: "z.txt", kind: "file" },
        { name: "beta", kind: "directory" },
        { name: ".hidden", kind: "file" },
        { name: "alpha", kind: "directory" },
        { name: "a.txt", kind: "file" },
        { name: "link", kind: "symlink" },
      ],
    });
    const application = createPluginApplication({
      plugins: [commandDirPlugin],
      directories: reader,
      workingDirectory: "fixed-directory",
    });
    const executor = createExecutor(application);

    expect(executor.execute("dir")).toBe([
      "[DIR]  alpha",
      "[DIR]  beta",
      "[FILE]  .hidden",
      "[FILE]  a.txt",
      "[FILE]  z.txt",
      "[SYMLINK]  link",
    ].join("\n"));
    expect(reader.paths).toEqual(["fixed-directory"]);

    reader.entries = [];
    expect(executor.execute("dir")).toBe("(empty directory)");
  });

  it("reports adapter failure without requiring a document", () => {
    const reader = new FakeDirectoryReader({
      error: new Error("denied"),
    });
    const executor = createExecutor(createPluginApplication({
      plugins: [commandDirPlugin],
      directories: reader,
      workingDirectory: "locked",
    }));

    expect(executor.execute("dir")).toBe(
      "error: cannot read directory: locked",
    );
    expect(executor.execute("help")).toContain("dir");
    expect(executor.execute("dir extra")).toBe("error: usage: dir");
  });

  it("keeps document and history unchanged on success and failure", () => {
    const reader = new FakeDirectoryReader({ entries: [] });
    const application = createPluginApplication({
      plugins: [commandDirPlugin],
      directories: reader,
      workingDirectory: "folder",
    });
    const executor = createExecutor(application);
    executor.execute("init");
    executor.execute("create rect r1 0 0 10 10");

    expect(application.editor.document?.getShape("r1")).toBeDefined();
    expect(executor.execute("dir")).toBe("(empty directory)");
    reader.error = new Error("broken");
    expect(executor.execute("dir")).toBe(
      "error: cannot read directory: folder",
    );
    expect(executor.execute("undo")).toBe("rect#r1 creation undone");
  });

  it("keeps the process working directory after read and save", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-cli-cwd-"));
    temporaryDirectories.push(directory);
    const inputPath = join(directory, "input.svg");
    const outputPath = join(directory, "output.svg");
    writeFileSync(
      inputPath,
      '<svg width="100" height="100"><rect id="r1" x="0" y="0" width="10" height="10"/></svg>',
      "utf8",
    );
    const reader = new FakeDirectoryReader({ entries: [] });
    const application = createPluginApplication({
      plugins: [commandDirPlugin],
      directories: reader,
      workingDirectory: "fixed-process-directory",
    });
    const executor = createExecutor(application);

    executor.execute(`read "${inputPath}"`);
    executor.execute(`save "${outputPath}"`);

    expect(executor.execute("dir")).toBe("(empty directory)");
    expect(reader.paths).toEqual(["fixed-process-directory"]);
  });

  it("works through the real filesystem adapter", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-cli-dir-"));
    temporaryDirectories.push(directory);
    mkdirSync(join(directory, "beta"));
    mkdirSync(join(directory, "alpha"));
    writeFileSync(join(directory, "z.txt"), "");
    writeFileSync(join(directory, ".hidden"), "");
    writeFileSync(join(directory, "a.txt"), "");

    const application = createPluginApplication({
      plugins: [commandDirPlugin],
      workingDirectory: directory,
    });
    const executor = createExecutor(application);

    expect(executor.execute("dir")).toBe([
      "[DIR]  alpha",
      "[DIR]  beta",
      "[FILE]  .hidden",
      "[FILE]  a.txt",
      "[FILE]  z.txt",
    ].join("\n"));
  });
});

describe("command plugin dual assembly", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("produces identical output through code and config assembly", async () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-cli-dual-"));
    temporaryDirectories.push(directory);
    mkdirSync(join(directory, "docs"));
    writeFileSync(join(directory, "demo.svg"), "");
    writeFileSync(join(directory, "package.json"), "{}");

    const codeApplication = createCodeAssembledApplication({
      workingDirectory: directory,
    });
    const configApplication = await createConfiguredApplication(
      join(process.cwd(), "tests", "fixtures", "plugin-configs", "enabled.json"),
      { workingDirectory: directory },
    );
    const lines = [
      "help",
      "init 800 600",
      "create rect r1 0 0 10 10",
      "create circle c1 20 20 5",
      "stats",
      "dir",
      "tree",
      'create box n1 120 100 160 60 "开始"',
      "set n1 fill #f5a623",
      'set n1 label "处理数据 v2"',
      "tree",
      "stats",
    ];

    expect(executeLines(createExecutor(configApplication), lines)).toEqual(
      executeLines(createExecutor(codeApplication), lines),
    );
  });
});

class FakeDirectoryReader implements DirectoryReader {
  public readonly paths: string[] = [];
  public entries: readonly DirectoryEntry[];
  public error: Error | undefined;

  public constructor(
    options: {
      readonly entries?: readonly DirectoryEntry[];
      readonly error?: Error;
    },
  ) {
    this.entries = options.entries ?? [];
    this.error = options.error;
  }

  public list(path: string): readonly DirectoryEntry[] {
    this.paths.push(path);
    if (this.error !== undefined) {
      throw this.error;
    }
    return this.entries;
  }
}

function createExecutor(application: PluginApplication): CommandExecutor {
  return new CommandExecutor(
    application.editor,
    application.formatter,
    application.router,
  );
}

function executeLines(
  executor: CommandExecutor,
  lines: readonly string[],
): readonly (string | null)[] {
  return lines.map((line) => executor.execute(line));
}
