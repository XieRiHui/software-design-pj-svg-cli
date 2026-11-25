import {
  type SvgIoPort,
  type SvgReadResult,
} from "../kernel/CommandContracts.js";
import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { SvgReader } from "./SvgReader.js";
import { SvgWriter } from "./SvgWriter.js";

export class SvgIoAdapter implements SvgIoPort {
  public constructor(
    private readonly reader: SvgReader,
    private readonly writer = new SvgWriter(),
  ) {}

  public read(filePath: string): SvgReadResult {
    return this.reader.read(filePath);
  }

  public write(document: CanvasDocument, filePath: string): void {
    this.writer.write(document, filePath);
  }
}
