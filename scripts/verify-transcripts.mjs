import { spawnSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const update = process.argv.includes("--update");
const cliEntry = join(root, "dist", "cli", "main.js");
const transcriptDirectory = join(root, "doc", "transcript");
const workingDirectory = join(transcriptDirectory, "transcript-cwd");
const fullConfig = join(root, "plugins.config.json");
const builtinConfig = join(root, "plugins.builtins.config.json");

const scenarios = [
  {
    name: "baseline",
    input: join(transcriptDirectory, "cli-1.txt"),
    expected: join(transcriptDirectory, "cli-1.expected.txt"),
    left: ["--builtins-only"],
    right: ["--config", builtinConfig],
  },
  {
    name: "box",
    input: join(transcriptDirectory, "cli-2-box.txt"),
    expected: join(transcriptDirectory, "cli-2-box.expected.txt"),
    left: [],
    right: ["--config", fullConfig],
  },
  {
    name: "commands",
    input: join(transcriptDirectory, "cli-2-commands.txt"),
    expected: join(transcriptDirectory, "cli-2-commands.expected.txt"),
    left: [],
    right: ["--config", fullConfig],
    fixedDirectory: workingDirectory,
  },
];

for (const scenario of scenarios) {
  const input = readFileSync(scenario.input, "utf8");
  const before = scenario.fixedDirectory === undefined
    ? undefined
    : snapshotDirectory(scenario.fixedDirectory);

  const left = run(scenario.left, input);
  const right = run(scenario.right, input);

  if (!left.equals(right)) {
    throw new Error(`${scenario.name}: code/config outputs differ`);
  }

  if (before !== undefined) {
    const after = snapshotDirectory(scenario.fixedDirectory);
    if (before.join("\n") !== after.join("\n")) {
      throw new Error(
        `${scenario.name}: fixed directory changed during the run`,
      );
    }
  }

  if (update) {
    writeFileSync(scenario.expected, left);
  } else {
    // The CLI always writes LF, but core.autocrlf=true checks the tracked
    // .expected.txt fixtures out as CRLF locally. Compare text content only
    // here; the two assemblies' outputs are still compared byte for byte
    // (Buffer.equals) above.
    const expected = readFileSync(scenario.expected, "utf8");
    const actual = normalizeLineEndings(left.toString("utf8"));
    if (actual !== normalizeLineEndings(expected)) {
      throw new Error(`${scenario.name}: output differs from expected file`);
    }
  }

  const suffix = before === undefined ? "" : ", fixed directory unchanged";
  process.stdout.write(
    `${scenario.name}: code/config outputs identical${suffix}\n`,
  );
}

function run(args, input) {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workingDirectory,
    input,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `CLI failed (${result.status}): ${
        result.stderr.toString("utf8") || result.stdout.toString("utf8")
      }`,
    );
  }
  if (result.stderr.length > 0) {
    throw new Error(`CLI wrote stderr: ${result.stderr.toString("utf8")}`);
  }
  return result.stdout;
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n");
}

function snapshotDirectory(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      const kind = entry.isDirectory() ? "dir" : "file";
      const content = entry.isDirectory()
        ? ""
        : readFileSync(join(directory, entry.name), "utf8");
      return `${kind}\t${entry.name}\t${content}`;
    })
    .sort();
}
