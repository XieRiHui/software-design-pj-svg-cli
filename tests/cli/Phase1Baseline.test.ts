import { describe, expect, it } from "vitest";

import { CommandExecutor } from "../../src/cli/CommandExecutor.js";

describe("Phase 1 baseline through plugin assembly", () => {
  it("keeps the complete help text byte-for-byte", () => {
    const executor = new CommandExecutor();

    expect(executor.execute("help")).toBe([
      "Document commands:",
      "  init [w] [h]",
      "  read <file.svg>",
      "  save [file.svg]",
      "  canvas [w] [h]",
      "",
      "Shape commands:",
      "  create <type> <id> [params...] [in <containerId>]",
      "  delete <id>",
      "  move <id> <dx> <dy>",
      "  scale <id> <factor>",
      "  set <id> <attr> <value>",
      "  group <newGid> <id1> <id2>...",
      "  ungroup <gid>",
      "  addto <gid> <id>",
      "  front <id>",
      "  back <id>",
      "",
      "Display commands:",
      "  tree [id]",
      "  show <id>",
      "  help",
      "",
      "History commands:",
      "  undo",
      "  redo",
    ].join("\n"));
  });

  it("keeps the baseline tree unchanged when no decorators are loaded", () => {
    const executor = new CommandExecutor();
    executor.execute("init 800 600");
    executor.execute("create g node1");
    executor.execute("create rect start 120 100 160 60 #4a90d9 in node1");
    executor.execute('create text start-label 155 135 "开始" in node1');

    expect(executor.execute("tree")).toBe([
      "svg (800x600)",
      "└── g#node1",
      "    ├── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9",
      '    └── text#start-label  (155,135) "开始"',
    ].join("\n"));
  });
});
