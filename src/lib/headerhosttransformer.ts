import { Transform, TransformCallback, TransformOptions } from 'stream';

interface HeaderHostTransformerOptions extends TransformOptions {
  host?: string;
}

class HeaderHostTransformer extends Transform {
  host: string;
  replaced: boolean;

  constructor(opts: HeaderHostTransformerOptions = {}) {
    super(opts);
    this.host = opts.host || 'localhost';
    this.replaced = false;
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    // Convert the chunk to a string if it isn't already.
    const data = Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
    // If we have already replaced the first Host header, simply pass data through.
    if (this.replaced) {
      callback(null, data);
      return;
    }
    // Replace the first occurrence of the Host header.
    const transformed = data.replace(/(\r\n[Hh]ost: )\S+/, (match, p1) => {
      this.replaced = true;
      return p1 + this.host;
    });
    callback(null, transformed);
  }
}

export default HeaderHostTransformer;
