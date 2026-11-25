import { createBasePluginHost } from "../../src/bootstrap/ApplicationAssembler.js";
import { SvgReader } from "../../src/infrastructure/SvgReader.js";
import { type ShapeProviderCatalog } from "../../src/kernel/CommandContracts.js";
import { ShapeProviderRegistry } from "../../src/kernel/Registries.js";

const builtinHost = createBasePluginHost();
const providers = new ShapeProviderRegistry();
for (const provider of builtinHost.snapshot().shapes) {
  providers.register(provider);
}

export const TEST_SHAPES: ShapeProviderCatalog = providers;

export function createTestSvgReader(): SvgReader {
  return new SvgReader(TEST_SHAPES);
}
