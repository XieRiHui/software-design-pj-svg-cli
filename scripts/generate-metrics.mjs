import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

const options = parseArguments(process.argv.slice(2));
const baseRef = options.base;
const targetRef = options.target;
const targetLabel = options.label;
const outputDirectory = join(process.cwd(), "doc", "metrics");

const baseFiles = readTypeScriptTree(baseRef);
const targetFiles = readTypeScriptTree(targetRef);
const baseMetrics = summarize(baseFiles);
const targetMetrics = summarize(targetFiles);

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  join(outputDirectory, "metrics.json"),
  `${JSON.stringify(
    {
      baseRef,
      targetRef,
      targetLabel,
      categories: ["kernel", "assembly", "plugin"],
      base: baseMetrics,
      target: targetMetrics,
      files: targetMetrics.files,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
writeFileSync(
  join(outputDirectory, "files.md"),
  renderFiles(targetMetrics.files, baseFiles, targetRef),
  "utf8",
);
writeFileSync(
  join(outputDirectory, "summary.md"),
  renderSummary(baseMetrics, targetMetrics, baseRef, targetRef, targetLabel),
  "utf8",
);

process.stdout.write(
  `metrics written to ${outputDirectory} for ${baseRef}..${targetRef}\n`,
);

function parseArguments(args) {
  const parsed = {
    base: "final",
    target: "p2",
    label: "p2",
  };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`invalid metrics argument: ${key ?? ""}`);
    }

    if (key === "--base") {
      parsed.base = value;
    } else if (key === "--target") {
      parsed.target = value;
    } else if (key === "--label") {
      parsed.label = value;
    } else {
      throw new Error(`unknown metrics argument: ${key}`);
    }
    index += 1;
  }
  return parsed;
}

function readTypeScriptTree(ref) {
  const output = git(["ls-tree", "-r", "--name-only", ref, "--", "src"]);
  const paths = output
    .split(/\r?\n/)
    .filter((path) => path.startsWith("src/") && path.endsWith(".ts"))
    .sort();
  const files = new Map();
  for (const path of paths) {
    const source = git(["show", `${ref}:${path}`]);
    files.set(path, analyzeFile(path, source));
  }
  return files;
}

function analyzeFile(path, source) {
  return {
    path,
    category: categoryOf(path),
    responsibility: responsibilityOf(path),
    lines: countLines(source),
    complexity: cyclomaticComplexity(path, source),
  };
}

function countLines(source) {
  const normalized = source.replace(/\r\n/g, "\n").trimEnd();
  return normalized.length === 0 ? 0 : normalized.split("\n").length;
}

function cyclomaticComplexity(path, source) {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let complexity = 1;

  const visit = (node) => {
    if (
      ts.isIfStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCaseClause(node) ||
      ts.isCatchClause(node) ||
      (ts.isBinaryExpression(node) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(node.operatorToken.kind))
    ) {
      complexity += 1;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return complexity;
}

function categoryOf(path) {
  if (
    path.startsWith("src/kernel/") ||
    path.startsWith("src/domain/") ||
    path.startsWith("src/application/") ||
    path.startsWith("src/shared/")
  ) {
    return "kernel";
  }

  if (path.startsWith("src/plugins/")) {
    return "plugin";
  }

  return "assembly";
}

function responsibilityOf(path) {
  const rules = [
    ["src/kernel/", "Extension contracts and public catalogs"],
    ["src/domain/", "Shape model and document invariants"],
    ["src/application/", "Editing operations, snapshots, and undo/redo"],
    ["src/shared/", "Shared error type"],
    ["src/bootstrap/", "Plugin activation, validation, and composition root"],
    ["src/cli/", "Command parsing, dispatch, output, and process entry"],
    ["src/infrastructure/", "SVG and filesystem adapters"],
    ["src/plugins/builtin-shapes/", "Built-in ShapeProvider plugin"],
    ["src/plugins/builtin-commands/", "Built-in Command plugin"],
    ["src/plugins/", "Optional plugin implementation"],
  ];
  return (
    rules.find(([prefix]) => path.startsWith(prefix))?.[1] ??
    "Repository tooling"
  );
}

function summarize(files) {
  const categories = {
    kernel: emptyTotals(),
    assembly: emptyTotals(),
    plugin: emptyTotals(),
  };
  const total = emptyTotals();

  for (const file of files.values()) {
    add(categories[file.category], file);
    add(total, file);
  }

  return {
    categories,
    total,
    files: [...files.values()].sort((left, right) =>
      left.path.localeCompare(right.path)
    ),
  };
}

function emptyTotals() {
  return { files: 0, lines: 0, complexity: 0 };
}

function add(totals, file) {
  totals.files += 1;
  totals.lines += file.lines;
  totals.complexity += file.complexity;
}

function renderFiles(files, baseFiles, targetRef) {
  const rows = files.map((file) => {
    const status = baseFiles.has(file.path) ? "M" : "A";
    return `| ${status} | \`${file.path}\` | ${file.lines} | ${file.complexity} | ${file.category} | ${file.responsibility} |`;
  });

  return [
    "# CLI File Inventory",
    "",
    `Target: \`${targetRef}\`. Category: \`kernel\`, \`assembly\`, or \`plugin\`.`,
    "",
    "| Status | File | Lines | Cyclomatic complexity | Category | Responsibility |",
    "|---|---:|---:|---:|---|---|",
    ...rows,
    "",
    "Status `M` means the path also exists in the baseline; `A` means it is new.",
    "",
  ].join("\n");
}

function renderSummary(base, target, baseRef, targetRef, targetLabel) {
  const rows = [
    renderCategoryRow("kernel", base, target),
    renderCategoryRow("assembly", base, target),
    renderCategoryRow("plugin", base, target),
    renderTotalRow(base, target),
  ];

  return [
    "# Phase 2 Metrics",
    "",
    `Generated by \`scripts/generate-metrics.mjs\` from \`${baseRef}..${targetRef}\`.`,
    `Target label: \`${targetLabel}\`.`,
    "",
    "| Scope | Baseline files | Target files | Baseline lines | Target lines | Line delta | Baseline CC | Target CC | CC delta |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...rows,
    "",
    "## Method",
    "",
    "The script reads TypeScript files from Git trees, excluding dependencies,",
    "tests, build output, and the VSCode extension. Lines are physical lines",
    "after terminal-trimming. Cyclomatic complexity starts at 1 per file and",
    "increments for conditionals, loops, cases, catches, and logical/nullish",
    "boolean operators. The source of truth is `metrics.json`.",
    "",
    "The library/application/domain/shared code is classified as **kernel**;",
    "CLI, infrastructure, and composition code as **assembly**; plugin packages",
    "under `src/plugins/` as **plugin**. Built-in plugins are included in the",
    "plugin column because they demonstrate real extension behavior.",
    "",
  ].join("\n");
}

function renderCategoryRow(category, base, target) {
  const before = base.categories[category];
  const after = target.categories[category];
  return `| ${category} | ${before.files} | ${after.files} | ${before.lines} | ${after.lines} | ${signed(after.lines - before.lines)} | ${before.complexity} | ${after.complexity} | ${signed(after.complexity - before.complexity)} |`;
}

function renderTotalRow(base, target) {
  return `| **total** | ${base.total.files} | ${target.total.files} | ${base.total.lines} | ${target.total.lines} | ${signed(target.total.lines - base.total.lines)} | ${base.total.complexity} | ${target.total.complexity} | ${signed(target.total.complexity - base.total.complexity)} |`;
}

function signed(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
}
