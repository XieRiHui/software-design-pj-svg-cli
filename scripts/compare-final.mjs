import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temporaryRoot = mkdtempSync(join(tmpdir(), "svg-cli-final-"));
const worktree = join(temporaryRoot, "final");
const inputPath = join(root, "doc", "transcript", "cli-1.txt");
const input = readFileSync(inputPath, "utf8");

try {
  git(["worktree", "add", "--detach", worktree, "final"]);
  npm(["ci", "--ignore-scripts"], worktree);

  const finalOutput = runFinal(worktree, input);
  const currentOutput = run(
    join(root, "dist", "cli", "main.js"),
    ["--builtins-only"],
    root,
    input,
  );
  if (finalOutput !== currentOutput) {
    throw new Error("final and current builtin-only outputs differ");
  }

  const evidence = {
    baseRef: "final",
    currentMode: "--builtins-only",
    input: "doc/transcript/cli-1.txt",
    equal: true,
    bytes: Buffer.byteLength(currentOutput, "utf8"),
  };
  writeFileSync(
    join(root, "doc", "transcript", "final-compat.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `final compatibility: identical (${evidence.bytes} bytes)\n`,
  );
} finally {
  try {
    git(["worktree", "remove", "--force", worktree]);
  } catch {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
}

function runFinal(worktreePath, text) {
  const tsx = join(
    worktreePath,
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs",
  );
  const entry = join(worktreePath, "src", "cli", "main.ts");
  return run(tsx, [entry], worktreePath, text);
}

function npm(args, cwd) {
  const npmEntry = process.env.npm_execpath;
  if (npmEntry === undefined) {
    throw new Error("npm_execpath is required; run through npm");
  }
  const result = spawnSync(process.execPath, [npmEntry, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
}

function run(entry, args, cwd, text) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    input: text,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  if (result.stderr.length > 0) {
    throw new Error(result.stderr);
  }
  return result.stdout;
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  return result.stdout;
}
