import logger from './utils/logger';
import Tunnel from './lib/tunnel';
import { Lt2Config } from './config';

type Callback = (err: any, client?: Tunnel) => void;

// Overload signatures:
export function localtunnel(options: Lt2Config, callback: Callback): Tunnel;
export function localtunnel(options: Lt2Config): Promise<Tunnel>;
export function localtunnel(port: number, options: Lt2Config, callback: Callback): Tunnel;
export function localtunnel(port: number, options: Lt2Config): Promise<Tunnel>;

// Implementation:
export function localtunnel(
  arg1: Lt2Config | number,
  arg2?: Lt2Config | Callback,
  arg3?: Callback
): Tunnel | Promise<Tunnel> {
  logger.info("Establishing secure tunnel...");
  logger.info("HTTP connections are secured with TLS Certificates of Remote Host Server by default.")
  let options: Lt2Config;
  let callback: Callback | undefined;

  if (typeof arg1 === 'object') {
    // Called with (options, [callback])
    options = arg1;
    callback = typeof arg2 === 'function' ? arg2 as Callback : undefined;
  } else {
    // Called with (port, options, [callback])
    options = { ...(arg2 as Lt2Config), port: arg1 };
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
