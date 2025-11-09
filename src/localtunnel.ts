import logger from './utils/logger';
import Tunnel from './lib/tunnel';

interface TunnelOptions {
  port?: number;
  // Add additional properties as needed.
  [key: string]: any;
}

type Callback = (err: any, client?: Tunnel) => void;

// Overload signatures:
export function localtunnel(options: TunnelOptions, callback: Callback): Tunnel;
export function localtunnel(options: TunnelOptions): Promise<Tunnel>;
export function localtunnel(port: number, options: TunnelOptions, callback: Callback): Tunnel;
export function localtunnel(port: number, options: TunnelOptions): Promise<Tunnel>;

// Implementation:
export function localtunnel(
  arg1: TunnelOptions | number,
  arg2?: TunnelOptions | Callback,
  arg3?: Callback
): Tunnel | Promise<Tunnel> {
  logger.info("Establishing secure tunnel...");
  logger.info("HTTP connections are secured with TLS Certificates of Remote Host Server by default.")
  let options: TunnelOptions;
  let callback: Callback | undefined;

  if (typeof arg1 === 'object') {
    // Called with (options, [callback])
    options = arg1;
    callback = typeof arg2 === 'function' ? arg2 as Callback : undefined;
  } else {
    // Called with (port, options, [callback])
    options = { ...(arg2 as TunnelOptions), port: arg1 };
    callback = arg3;
  }

  const client = new Tunnel(options);
  if (callback) {
    client.open((err: any) => {
      if (err) {
        callback(err);
      } else {
        callback(null, client);
      }
    });
    return client;
  }
  return new Promise<Tunnel>((resolve, reject) => {
    client.open((err: any) => (err ? reject(err) : resolve(client)));
  });
}
