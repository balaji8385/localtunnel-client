import { EventEmitter } from 'events';
import axios from 'axios';
import log from '../utils/logger';
import TunnelCluster from './tunnelcluster';
import https from 'https'; 
import { Lt2Config } from '../config';

export interface TunnelInfo {
  name: string;
  url: string;
  cached_url?: string;
  max_conn: number;
  remote_host: string;
  remote_ip: string;
  remote_port: number;
  local_port: number;
  local_host?: string;
  local_https?: boolean;
  local_cert?: string;
  local_key?: string;
  local_ca?: string;
  allow_invalid_cert?: boolean;
}

export type TunnelCallback = (err: Error | null, client?: Tunnel) => void;

export default class Tunnel extends EventEmitter {
  opts: Lt2Config;
  closed: boolean;
  clientId?: string;
  url?: string;
  cachedUrl?: string;
  tunnelCluster: TunnelCluster

  constructor(opts: Lt2Config = {}) {
    super();
    this.opts = opts;
    this.closed = false;
    if (!this.opts.remote_host) {
      this.opts.remote_host = process.env.DEFAULT_SERVER_HOST;
    }
  }

  
  private _getInfo(body: any): TunnelInfo {
    /* eslint-disable camelcase */
    const { id, ip, port, url, cached_url, max_conn_count } = body;
    const { remote_host, port: local_port, local_host } = this.opts;
    const { local_https, local_cert, local_key, local_ca, allow_invalid_cert } = this.opts;
    return {
      name: id,
      url,
      cached_url,
      max_conn: max_conn_count || 1,
      remote_host: new URL(remote_host).hostname || '',
      remote_ip: ip,
      remote_port: port,
      local_port,
      local_host,
      local_https,
      local_cert,
      local_key,
      local_ca,
      allow_invalid_cert,
    };
    /* eslint-enable camelcase */
  }

  private _init(cb: (err: Error | null, info?: TunnelInfo) => void): void {
    const opt = this.opts;
    const getInfo = this._getInfo.bind(this);

    const params = {
      responseType: 'json' as const,
      httpsAgent: opt.remote_host?.includes("https") ?new https.Agent({
        rejectUnauthorized: false, //TODO: Add option later
      }) : undefined,
    };
    const baseUri = `${opt.remote_host}`;
    // No subdomain at first; maybe use requested domain
    const assignedDomain = opt.subdomain;
    // Where to request
    const uri = baseUri + '?new';
    log.info(`Obtaining tunnel information from ${baseUri}`);
    (function getUrl() {
      axios
        .get(uri + (assignedDomain ? `&subdomain=${assignedDomain}` : ""), params)
        .then((res) => {
          const body = res.data;
          // log.info('got tunnel information', res.data);
          if (res.status !== 200) {
            const err = new Error(
              (body && body.message) || 'localtunnel server returned an error, please try again'
            );
            return cb(err);
          }
          cb(null, getInfo(body));
        })
        .catch((err) => {
          log.info(`tunnel server offline: ${err.message}, retry 1s`);
          setTimeout(getUrl, 1000);
        });
    })();
  }

  private _establish(info: TunnelInfo): void {
    // Increase max event listeners so that localtunnel consumers don't get
    // warning messages as soon as they set up even one listener.
    this.setMaxListeners(info.max_conn || 1);

    this.tunnelCluster = new TunnelCluster(info);

    // Only emit the URL the first time.
    this.tunnelCluster.once('open', () => {
      // log.info(`Emiting URL for First time ${info.url}`)
      this.emit('url', info.url);
    });

    // Re-emit socket errors.
    this.tunnelCluster.on('error', (err: Error) => {
      log.info(`Tunnel socket connection error: ${err.message}`);
      this.emit('error', err);
    });

    let tunnelCount = 0;

    // Track open count.
    this.tunnelCluster.on('open', (tunnel: any) => {
      // log.info("Tunnel cluseter Open Received")
      tunnelCount++;
      // log.info(`tunnel open [total: ${tunnelCount}]`);

      const closeHandler = () => {
        tunnel.destroy();
      };

      if (this.closed) {
        return closeHandler();
      }

      this.once('close', closeHandler);
      tunnel.once('close', () => {
        this.removeListener('close', closeHandler);
      });
    });

    // When a tunnel dies, open a new one.
    this.tunnelCluster.on('dead', () => {
      tunnelCount--;
      // log.info(`tunnel dead [total: ${tunnelCount}]`);
      if (this.closed) {
        return;
      }
      this.tunnelCluster.open();
    });

    this.tunnelCluster.on('request', (req: any) => {
      this.emit('request', req);
    });

    // Establish as many tunnels as allowed.
    for (let count = 0; count < info.max_conn; ++count) {
      this.tunnelCluster.open();
    }
  }

  open(cb: TunnelCallback): void {
    this._init((err, info) => {
      if (err) {
        return cb(err);
      }
      if (!info) {
        return cb(new Error('No tunnel info'));
      }

      this.clientId = info.name;
      this.url = info.url;

      // `cached_url` is only returned by proxy servers that support resource caching.
      if (info.cached_url) {
        this.cachedUrl = info.cached_url;
      }

      this._establish(info);
      cb(null, this);
    });
  }

  close(): void {
    this.closed = true;
    this.emit('close');
  }
}
