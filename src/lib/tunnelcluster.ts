import { EventEmitter } from 'events';
import log from '../utils/logger';
import fs from 'fs';
import net, { Socket } from 'net';
import tls from 'tls';
import HeaderHostTransformer from './headerhosttransformer';

const debug = log.info;

export interface TunnelClusterOptions {
  remote_ip?: string;
  remote_host?: string;
  remote_port: number;
  local_host?: string;
  local_port: number;
  local_https?: boolean;
  allow_invalid_cert?: boolean;
  local_cert?: string;
  local_key?: string;
  local_ca?: string;
  // add additional options if needed
}

export default class TunnelCluster extends EventEmitter {
  opts: TunnelClusterOptions;

  constructor(opts: TunnelClusterOptions = {} as TunnelClusterOptions) {
    super();
    this.opts = opts;
  }

  open(): void {
    const opt = this.opts;

    // Prefer IP if returned by the server
    const remoteHostOrIp = opt.remote_ip || opt.remote_host;
    const remotePort = opt.remote_port;
    const localHost = opt.local_host || 'localhost';
    const localPort = opt.local_port;
    const localProtocol = opt.local_https ? 'https' : 'http';
    const allowInvalidCert = opt.allow_invalid_cert;

    // debug(
    //   `establishing tunnel ${localProtocol}://${localHost}:${localPort} <> ${remoteHostOrIp}:${remotePort}`
    // );

    // Connection to localtunnel server
    // TODO: Ensure secure tunnelling - remoted .net and replaced with .tls
    // TLS Connection to remote server / Any certificate can be used by the remote server
    const remote =tls.connect({
      host: remoteHostOrIp,
      port: remotePort,
      rejectUnauthorized: false, // Ignore invalid certificates if allowed
    })

    remote.setKeepAlive(true);

    remote.on('error', (err: NodeJS.ErrnoException) => {
      log.error(`Remote connection error: ${err.message}`);

      // Emit connection refused errors immediately, because they
      // indicate that the tunnel can't be established.
      if (err.code === 'ECONNREFUSED') {
        this.emit(
          'error',
          new Error(
            `connection refused: ${remoteHostOrIp}:${remotePort} (check your firewall settings)`
          )
        );
      }

      remote.end();
      process.exit(1);
    });

    const connLocal = (): void => {
      if (remote.destroyed) {
        debug('remote destroyed');
        this.emit('dead');
        return;
      }
      // debug(`connecting locally to ${localProtocol}://${localHost}:${localPort}`);
      remote.pause();

      if (allowInvalidCert) {
        // debug('allowing invalid certificates');
      }

      const getLocalCertOpts = (): tls.ConnectionOptions => {
        return {
            cert: fs.readFileSync(opt.local_cert!, "utf-8"),
            key: fs.readFileSync(opt.local_key!, "utf-8"),
            ca: opt.local_ca ? [fs.readFileSync(opt.local_ca, "utf-8")] : undefined,
            rejectUnauthorized: allowInvalidCert ? false : true,
          };
      };
      // Connection to local HTTP(S) server
      const local: Socket = opt.local_https
        ? tls.connect({ host: localHost, port: localPort, ...getLocalCertOpts() })
        : net.connect({ host: localHost, port: localPort });

      const remoteClose = (): void => {
        // debug('remote close');
        this.emit('dead');
        local.end();
      };

      remote.once('close', remoteClose);

      local.once('error', (err: NodeJS.ErrnoException) => {
        log.error(`Error connecting to local server: ${err.code}`);
        local.end();

        remote.removeListener('close', remoteClose);

        if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET') {
          return remote.end();
        }

        // Retrying connection to local server
        log.info(`retrying local connection to ${localProtocol}://${localHost}:${localPort} in 1s`);
        setTimeout(connLocal, 1000);
      });

      local.once('connect', () => {
        // debug('connected locally');
        remote.resume();

        let stream: NodeJS.ReadWriteStream = remote;

        // If user requested a specific local host then transform the Host header.
        if (opt.local_host) {
          // debug('transform Host header to %s', opt.local_host);
          stream = remote.pipe(new HeaderHostTransformer({ host: opt.local_host }));
        }

        // Important: Piping the local tunne to remote
        stream.pipe(local).pipe(remote);

        local.once('close', (hadError: boolean) => {
          // debug('local connection closed [%s]', hadError);
        });
      });
    };

    remote.on('data', (data: Buffer) => {
      const match = data.toString().match(/^(\w+) (\S+)/);
      if (match) {
        this.emit('request', {
          method: match[1],
          path: match[2],
        });
      }
    });

    // Tunnel is considered open when remote connects.
    remote.once('connect', () => {
      // log.info("Remote connection connected")
      this.emit('open', remote);
      connLocal();
    });
  }
}
