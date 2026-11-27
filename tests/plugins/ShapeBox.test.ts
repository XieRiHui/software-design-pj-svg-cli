import {
  mkdtempSync,
  readFileSync,
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
import { CommandExecutor } from "../../src/cli/CommandExecutor.js";
import { Group } from "../../src/domain/Group.js";
import { Rect } from "../../src/domain/Rect.js";
import {
  type AttributeHandler,
  type PluginDefinition,
} from "../../src/kernel/PluginContracts.js";
import { EditorError } from "../../src/shared/EditorError.js";
import { Box } from "../../src/plugins/shape-box/Box.js";
import { shapeBoxPlugin } from "../../src/plugins/shape-box/index.js";
import { treeBoxLabelPlugin } from "../../src/plugins/tree-box-label/index.js";

describe("box shape plugin", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("creates the documented subtree and creates undo units per property", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [shapeBoxPlugin],
    }));
    executor.execute("init 800 600");

    expect(
      executor.execute('create box n1 120 100 160 60 "开始"'),
    ).toBe(
      "box#n1 created " +
        "(g#n1 + rect#n1-rect + text#n1-label)",
    );
    expect(executor.execute("tree")).toBe([
      "svg (800x600)",
      "└── g#n1",
      "    ├── rect#n1-rect  x=120 y=100 w=160 h=60 fill=#4a90d9",
      '    └── text#n1-label  (140,135) "开始"',
    ].join("\n"));

    expect(executor.execute("set n1 fill #f5a623")).toBe(
      "box#n1 fill propagated to n1-rect",
    );
    expect(executor.execute("undo")).toBe(
      "box#n1 fill propagation undone",
    );
    expect(executor.execute("show n1-rect")).toContain(
      "fill=#4a90d9",
    );
    expect(executor.execute("redo")).toBe(
      "box#n1 fill propagated to n1-rect",
    );

    expect(executor.execute('set n1 label "处理数据 v2"')).toBe(
      'box#n1 label updated: "处理数据 v2"',
    );
    expect(executor.execute("undo")).toBe(
      'box#n1 label restored: "开始"',
    );
    expect(executor.execute("redo")).toBe(
      'box#n1 label updated: "处理数据 v2"',
    );
    expect(executor.execute("show n1-rect")).toContain(
      "fill=#f5a623",
    );
    expect(executor.execute("show n1-label")).toContain(
      'text="处理数据 v2"',
    );
  });

  it("supports nesting box inside box", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [shapeBoxPlugin],
    }));
    executor.execute("init");
    executor.execute('create box parent 0 0 200 100 "Parent"');
    executor.execute(
      'create box child 20 10 80 40 "Child" in parent',
    );

    expect(executor.execute("tree")).toContain("└── g#child");
    expect(executor.execute("show child-rect")).toContain(
      "parent=box#child",
    );
  });

  it("reports the box parent when undoing a nested delete", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [shapeBoxPlugin],
    }));
    executor.execute("init");
    executor.execute('create box parent 0 0 200 100 "Parent"');
    executor.execute(
      'create box child 20 10 80 40 "Child" in parent',
    );
    executor.execute("delete child");

    expect(executor.execute("undo")).toBe(
      "box#child restored into box#parent",
    );
  });

  it("reproduces the Phase 1 section 6.1 box session", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [shapeBoxPlugin, treeBoxLabelPlugin],
    }));
    executor.execute("init 800 600");

    expect(
      executor.execute('create box n1 120 100 160 60 "开始"'),
    ).toBe(
      "box#n1 created " +
        "(g#n1 + rect#n1-rect + text#n1-label)",
    );
    expect(
      executor.execute('create box n2 520 100 160 60 "处理数据"'),
    ).toBe(
      "box#n2 created " +
        "(g#n2 + rect#n2-rect + text#n2-label)",
    );
    expect(
      executor.execute("create line arrow1 280 130 520 130 black"),
    ).toBe("line#arrow1 created");
    expect(
      executor.execute("group flowchart n1 n2 arrow1"),
    ).toBe("g#flowchart created with 3 children");

    expect(executor.execute("move n2 0 100")).toBe(
      "box#n2 moved by (0,100)",
    );
    expect(executor.execute("undo")).toBe(
      "box#n2 moved back by (0,-100)",
    );
    expect(executor.execute("set n2 fill #f5a623")).toBe(
      "box#n2 fill propagated to n2-rect",
    );
    expect(
      executor.execute('set n2 label "处理数据 v2"'),
    ).toBe('box#n2 label updated: "处理数据 v2"');
    expect(executor.execute("undo")).toBe(
      'box#n2 label restored: "处理数据"',
    );

    const tree = executor.execute("tree") ?? "";
    expect(tree).toContain("g#n1  (box)");
    expect(tree).toContain("fill=#4a90d9");
    expect(tree).toContain("g#n2  (box)");
    expect(tree).toContain("fill=#f5a623");
    expect(tree).toContain('"处理数据"');
  });

  it("rejects operations that would break required child invariants", () => {
    const executor = createExecutor(createPluginApplication({
      plugins: [shapeBoxPlugin],
    }));
    executor.execute("init");
    executor.execute('create box n1 0 0 100 50 "Box"');
    executor.execute("create g outside");

    expect(executor.execute("delete n1-rect")).toBe(
      "error: cannot remove required box child: n1-rect",
    );
    expect(executor.execute("addto outside n1-label")).toBe(
      "error: cannot remove required box child: n1-label",
    );
    expect(executor.execute("front n1-rect")).toBe(
      "error: cannot remove required box child: n1-rect",
    );
    expect(executor.execute("group regrouped n1-label")).toBe(
      "error: cannot remove required box child: n1-label",
    );
    expect(executor.execute("ungroup n1")).toBe(
      "error: cannot ungroup composite shape: n1",
    );
    expect(executor.execute("show n1-rect")).toContain(
      "rect#n1-rect  parent=box#n1",
    );
    expect(executor.execute("show n1-label")).toContain(
      "text#n1-label  parent=box#n1",
    );
  });

  it("rejects id collisions as one failed command without partial insertion", () => {
    const application = createPluginApplication({
      plugins: [shapeBoxPlugin],
    });
    const executor = createExecutor(application);
    executor.execute("init");
    executor.execute("create rect n1-rect 0 0 10 10");

    expect(
      executor.execute('create box n1 0 0 100 50 "Box"'),
    ).toBe("error: id already exists: n1-rect");
    expect(application.editor.document?.getShape("n1")).toBeUndefined();
    expect(
      application.editor.document?.getShape("n1-label"),
    ).toBeUndefined();
  });

  it("round-trips data-kind and downgrades to g without the plugin", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-box-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "box.svg");

    const withPlugin = createPluginApplication({
      plugins: [shapeBoxPlugin],
    });
    const writer = createExecutor(withPlugin);
    writer.execute("init");
    writer.execute('create box n1 120 100 160 60 "开始"');
    writer.execute("set n1 fill #f5a623");
    writer.execute(`save "${filePath}"`);

    const saved = readFileSync(filePath, "utf8");
    expect(saved).toContain('<g id="n1" data-kind="box">');
    expect(saved).toContain('<rect id="n1-rect"');
    expect(saved).toContain('<text id="n1-label"');

    const reloaded = createPluginApplication({
      plugins: [shapeBoxPlugin],
    });
    const reader = createExecutor(reloaded);
    expect(reader.execute(`read "${filePath}"`)).toBe(
      `read ${filePath} (3 elements)`,
    );
    expect(reloaded.editor.document?.getShape("n1")).toBeInstanceOf(Box);
    expect(reader.execute("show n1-rect")).toContain("fill=#f5a623");

    const withoutPlugin = createPluginApplication();
    const downgraded = createExecutor(withoutPlugin);
    downgraded.execute(`read "${filePath}"`);
    expect(withoutPlugin.editor.document?.getShape("n1"))
      .toBeInstanceOf(Group);
    expect(withoutPlugin.editor.document?.getShape("n1"))
      .not.toBeInstanceOf(Box);
  });

  it("rejects incomplete, wrong-type, and duplicate-id box input atomically", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-box-invalid-"));
    temporaryDirectories.push(directory);
    const application = createPluginApplication({
      plugins: [shapeBoxPlugin],
    });
    const executor = createExecutor(application);
    executor.execute("init");
    executor.execute("create rect keep 0 0 10 10");

    const cases = [
      '<svg width="100" height="100"><g id="n1" data-kind="box"><rect id="n1-rect" x="0" y="0" width="10" height="10"/></g></svg>',
      '<svg width="100" height="100"><g id="n1" data-kind="box"><text id="n1-rect" x="0" y="0">bad</text><text id="n1-label" x="0" y="0">ok</text></g></svg>',
      '<svg width="100" height="100"><g id="n1" data-kind="box"><rect id="n1-rect" x="0" y="0" width="10" height="10"/><text id="n1-label" x="0" y="0">ok</text><rect id="n1-rect" x="0" y="0" width="10" height="10"/></g></svg>',
    ];

    cases.forEach((source, index) => {
      const filePath = join(directory, `bad-${index}.svg`);
      writeFileSync(filePath, source, "utf8");
      expect(executor.execute(`read "${filePath}"`)).toBe(
        `error: cannot read file: ${filePath}`,
      );
      expect(application.editor.document?.getShape("keep"))
        .toBeDefined();
    });

    expect(executor.execute("undo")).toBe(
      "rect#keep creation undone",
    );
  });

  it("rejects conflicting handlers before mutation", () => {
    const conflict = namedAttributePlugin(
      "box-fill-conflict",
      (shape, attribute) =>
        shape instanceof Box && attribute === "fill",
      () => {},
    );
    const application = createPluginApplication({
      plugins: [shapeBoxPlugin, conflict],
    });
    const executor = createExecutor(application);
    executor.execute("init");
    executor.execute('create box n1 0 0 100 50 "Box"');

    expect(executor.execute("set n1 fill red")).toBe(
      "error: conflicting attribute handlers for n1/fill: " +
        "box-attributes, box-fill-conflict",
    );
    expect(executor.execute("show n1-rect")).toContain(
      "fill=#4a90d9",
    );
    expect(executor.execute("undo")).toBe(
      "box#n1 creation undone",
    );
  });

  it("rolls back partial handler changes and preserves prior history", () => {
    const failing = namedAttributePlugin(
      "partial-failure",
      (shape, attribute) =>
        shape instanceof Group && attribute === "explode",
      (context) => {
        for (const child of context.shape.children) {
          if (child instanceof Rect) {
            child.setAttribute("fill", "temporary");
          }
        }
        throw new EditorError("handler failed after mutation");
      },
    );
    const application = createPluginApplication({
      plugins: [failing],
    });
    const executor = createExecutor(application);
    executor.execute("init");
    executor.execute("create g group");
    executor.execute("create rect a 0 0 10 10 in group");
    executor.execute("create rect b 10 0 10 10 in group");

    expect(executor.execute("set group explode now")).toBe(
      "error: handler failed after mutation",
    );
    expect(executor.execute("show a")).not.toContain("fill=");
    expect(executor.execute("show b")).not.toContain("fill=");
    expect(executor.execute("undo")).toBe("rect#b creation undone");
    expect(executor.execute("redo")).toBe("rect#b created in g#group");
  });
});

function namedAttributePlugin(
  name: string,
  handles: AttributeHandler["handles"],
  apply: AttributeHandler["apply"],
): PluginDefinition {
  return {
    name: `fixture-${name}`,
    contributes: {
      attributes: [name],
    },
    activate(context) {
      context.registerAttributeHandler({
        name,
        handles,
        apply,
      });
    },
  };
}

function createExecutor(application: PluginApplication): CommandExecutor {
  return new CommandExecutor(
    application.editor,
    application.formatter,
    application.router,
  );
}
