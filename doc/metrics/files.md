# CLI File Inventory

Target: `p2`. Category: `kernel`, `assembly`, or `plugin`.

| Status | File | Lines | Cyclomatic complexity | Category | Responsibility |
|---|---:|---:|---:|---|---|
| M | `src/application/commands/AddToCommand.ts` | 32 | 5 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/BackCommand.ts` | 21 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/CreateCommand.ts` | 46 | 6 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/DeleteCommand.ts` | 26 | 4 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/FrontCommand.ts` | 21 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/GroupCommand.ts` | 25 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/MoveCommand.ts` | 26 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/ScaleCommand.ts` | 24 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/SetCommand.ts` | 74 | 6 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/commands/UngroupCommand.ts` | 20 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/EditCommand.ts` | 1 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/Editor.ts` | 124 | 3 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/EditResult.ts` | 13 | 1 | kernel | Editing operations, snapshots, and undo/redo |
| M | `src/application/History.ts` | 59 | 4 | kernel | Editing operations, snapshots, and undo/redo |
| A | `src/bootstrap/ApplicationAssembler.ts` | 154 | 38 | assembly | Plugin activation, validation, and composition root |
| A | `src/bootstrap/codeAssembly.ts` | 30 | 1 | assembly | Plugin activation, validation, and composition root |
| A | `src/bootstrap/configuredAssembly.ts` | 36 | 7 | assembly | Plugin activation, validation, and composition root |
| A | `src/bootstrap/PluginConfigLoader.ts` | 200 | 36 | assembly | Plugin activation, validation, and composition root |
| A | `src/bootstrap/PluginHost.ts` | 273 | 27 | assembly | Plugin activation, validation, and composition root |
| M | `src/cli/Cli.ts` | 59 | 16 | assembly | Command parsing, dispatch, output, and process entry |
| M | `src/cli/CommandExecutor.ts` | 42 | 7 | assembly | Command parsing, dispatch, output, and process entry |
| M | `src/cli/CommandLexer.ts` | 76 | 14 | assembly | Command parsing, dispatch, output, and process entry |
| M | `src/cli/CommandParser.ts` | 20 | 2 | assembly | Command parsing, dispatch, output, and process entry |
| M | `src/cli/CommandRouter.ts` | 22 | 2 | assembly | Command parsing, dispatch, output, and process entry |
| M | `src/cli/main.ts` | 59 | 9 | assembly | Command parsing, dispatch, output, and process entry |
| M | `src/cli/OutputFormatter.ts` | 387 | 50 | assembly | Command parsing, dispatch, output, and process entry |
| M | `src/domain/CanvasDocument.ts` | 436 | 76 | kernel | Shape model and document invariants |
| M | `src/domain/Circle.ts` | 127 | 10 | kernel | Shape model and document invariants |
| M | `src/domain/CompositeShape.ts` | 91 | 13 | kernel | Shape model and document invariants |
| M | `src/domain/Ellipse.ts` | 144 | 12 | kernel | Shape model and document invariants |
| M | `src/domain/Group.ts` | 51 | 5 | kernel | Shape model and document invariants |
| M | `src/domain/Line.ts` | 143 | 12 | kernel | Shape model and document invariants |
| M | `src/domain/Rect.ts` | 144 | 12 | kernel | Shape model and document invariants |
| M | `src/domain/Shape.ts` | 258 | 26 | kernel | Shape model and document invariants |
| M | `src/domain/Text.ts` | 122 | 10 | kernel | Shape model and document invariants |
| A | `src/infrastructure/NodeDirectoryReader.ts` | 36 | 4 | assembly | SVG and filesystem adapters |
| A | `src/infrastructure/SvgIoAdapter.ts` | 22 | 1 | assembly | SVG and filesystem adapters |
| M | `src/infrastructure/SvgReader.ts` | 216 | 33 | assembly | SVG and filesystem adapters |
| M | `src/infrastructure/SvgWriter.ts` | 85 | 6 | assembly | SVG and filesystem adapters |
| A | `src/kernel/CommandContracts.ts` | 141 | 6 | kernel | Extension contracts and public catalogs |
| A | `src/kernel/EditContracts.ts` | 104 | 10 | kernel | Extension contracts and public catalogs |
| A | `src/kernel/index.ts` | 4 | 1 | kernel | Extension contracts and public catalogs |
| A | `src/kernel/PluginContracts.ts` | 95 | 8 | kernel | Extension contracts and public catalogs |
| A | `src/kernel/Registries.ts` | 115 | 6 | kernel | Extension contracts and public catalogs |
| A | `src/plugins/builtin-commands/BuiltinCommandService.ts` | 440 | 30 | plugin | Built-in Command plugin |
| A | `src/plugins/builtin-commands/index.ts` | 112 | 2 | plugin | Built-in Command plugin |
| A | `src/plugins/builtin-shapes/index.ts` | 230 | 11 | plugin | Built-in ShapeProvider plugin |
| A | `src/plugins/command-dir/index.ts` | 91 | 7 | plugin | Optional plugin implementation |
| A | `src/plugins/command-stats/index.ts` | 80 | 9 | plugin | Optional plugin implementation |
| A | `src/plugins/shape-arrow/Arrow.ts` | 178 | 14 | plugin | Optional plugin implementation |
| A | `src/plugins/shape-arrow/index.ts` | 90 | 9 | plugin | Optional plugin implementation |
| A | `src/plugins/shape-box/Box.ts` | 184 | 13 | plugin | Optional plugin implementation |
| A | `src/plugins/shape-box/index.ts` | 117 | 16 | plugin | Optional plugin implementation |
| A | `src/plugins/tree-box-label/index.ts` | 25 | 2 | plugin | Optional plugin implementation |
| A | `src/plugins/tree-star/index.ts` | 88 | 11 | plugin | Optional plugin implementation |
| M | `src/shared/EditorError.ts` | 6 | 1 | kernel | Shared error type |

Status `M` means the path also exists in the baseline; `A` means it is new.
