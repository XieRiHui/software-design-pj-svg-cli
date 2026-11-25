import { Editor } from "../application/Editor.js";
import { EditorError } from "../shared/EditorError.js";
import { CommandLexer } from "./CommandLexer.js";
import { CommandParser } from "./CommandParser.js";
import { CommandRouter } from "./CommandRouter.js";
import { OutputFormatter } from "./OutputFormatter.js";
import { createPluginApplication } from "../bootstrap/ApplicationAssembler.js";

export class CommandExecutor {
  private readonly lexer = new CommandLexer();
  private readonly parser = new CommandParser();
  private readonly router: CommandRouter;

  public constructor(
    editor = new Editor(),
    private readonly formatter = new OutputFormatter(),
    router?: CommandRouter,
  ) {
    this.router = router ?? createPluginApplication({
      editor,
      formatter,
    }).router;
  }

  public execute(line: string): string | null {
    try {
      const tokens = this.lexer.tokenize(line);
      const command = this.parser.parse(tokens);
      if (command === null) {
        return null;
      }

      return this.router.execute(command);
    } catch (error) {
      if (error instanceof EditorError) {
        return this.formatter.error(error.message);
      }

      throw error;
    }
  }
}
