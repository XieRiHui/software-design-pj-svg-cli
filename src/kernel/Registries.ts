import {
  type AttributeHandlerCatalog,
  type Command,
  type CommandCatalog,
  type ShapeProviderCatalog,
} from "./CommandContracts.js";
import {
  type AttributeHandler,
  type ShapeProvider,
  type TreeDecorator,
} from "./PluginContracts.js";
import { type Shape } from "../domain/Shape.js";

export class ShapeProviderRegistry implements ShapeProviderCatalog {
  private readonly providers: ShapeProvider[] = [];

  public register(provider: ShapeProvider): void {
    if (
      this.providers.some(
        (candidate) =>
          candidate.name === provider.name ||
          candidate.typeName === provider.typeName,
      )
    ) {
      throw new Error(`duplicate registration: shapes/${provider.name}`);
    }

    this.providers.push(provider);
  }

  public getForCreate(typeName: string): ShapeProvider | undefined {
    return this.providers.find(
      (provider) => provider.typeName === typeName,
    );
  }

  public getForRestore(
    elementName: string,
    attributes: ReadonlyMap<string, string>,
  ): ShapeProvider | undefined {
    return [...this.providers]
      .filter((provider) => provider.canRestore(elementName, attributes))
      .sort((left, right) => right.restorePriority - left.restorePriority)[0];
  }

  public all(): readonly ShapeProvider[] {
    return [...this.providers];
  }
}

export class CommandRegistry implements CommandCatalog {
  private readonly commands = new Map<string, Command>();

  public register(command: Command): void {
    if (this.commands.has(command.name)) {
      throw new Error(`duplicate registration: commands/${command.name}`);
    }

    this.commands.set(command.name, command);
  }

  public get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  public all(): readonly Command[] {
    return [...this.commands.values()];
  }
}

export class TreeDecoratorRegistry {
  private readonly decorators: TreeDecorator[] = [];

  public register(decorator: TreeDecorator): void {
    if (this.decorators.some((item) => item.name === decorator.name)) {
      throw new Error(
        `duplicate registration: decorators/${decorator.name}`,
      );
    }

    this.decorators.push(decorator);
  }

  public all(): readonly TreeDecorator[] {
    return [...this.decorators];
  }
}

export class AttributeHandlerRegistry
implements AttributeHandlerCatalog {
  private readonly handlers: AttributeHandler[] = [];

  public register(handler: AttributeHandler): void {
    if (this.handlers.some((item) => item.name === handler.name)) {
      throw new Error(
        `duplicate registration: attributes/${handler.name}`,
      );
    }

    this.handlers.push(handler);
  }

  public findApplicable(
    shape: Shape,
    attribute: string,
  ): readonly AttributeHandler[] {
    return this.handlers.filter((handler) =>
      handler.handles(shape, attribute)
    );
  }

  public all(): readonly AttributeHandler[] {
    return [...this.handlers];
  }
}
