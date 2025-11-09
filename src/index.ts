#!/usr/bin/env node
/* eslint-disable no-console */

import openurl from 'openurl';
import yargs from 'yargs';
import {localtunnel} from './localtunnel';
import { version } from '../package.json';
import logger from './utils/logger';
interface Args {
  port: number;
  host: string;
  subdomain?: string;
  localHost?: string;
  localHttps?: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert?: boolean;
  open?: boolean;
  'print-requests'?: boolean;
}

const argv = yargs
  .usage('Usage: lt --port [num] <options>')
  .env(true)
  .option('p', {
    alias: 'port',
    describe: 'Internal HTTP server port',
    type: 'number',
  })
  .option('h', {
    alias: 'host',
    describe: 'Upstream server providing forwarding',
    type: 'string',
  })
  .option('s', {
    alias: 'subdomain',
    describe: 'Request this subdomain',
    type: 'string',
  })
  .option('l', {
    alias: 'local-host',
    describe:
      'Tunnel traffic to this host instead of localhost, override Host header to this host',
    type: 'string',
  })
  .option('local-https', {
    describe: 'Tunnel traffic to a local HTTPS server',
    type: 'boolean',
    default: process.env.LOCAL_HTTPS === 'true',
  })
  .option('local-cert', {
    describe: 'Path to certificate PEM file for local HTTPS server',
    type: 'string',
    default: process.env.LOCAL_CERT,
  })
  .option('local-key', {
    describe: 'Path to certificate key file for local HTTPS server',
    type: 'string',
    default: process.env.LOCAL_KEY,
  })
  .option('local-ca', {
    describe:
      'Path to certificate authority file for self-signed certificates',
    type: 'string',
    default: process.env.LOCAL_CA,
  })
  .option('allow-invalid-cert', {
    describe:
      'Disable certificate checks for your local HTTPS server (ignore cert/key/ca options)',
    type: 'boolean',
    default: process.env.ALLOW_INVALID_CERT === 'true',
  })
  .option('o', {
    alias: 'open',
    describe: 'Opens the tunnel URL in your browser',
    type: 'boolean',
  })
  .option('print-requests', {
    describe: 'Print basic request info',
    type: 'boolean',
  })
  .demandOption('port')
  .demandOption('host')
  .help('help', 'Show this help and exit')
  .version(version)
  .argv as Args;

if (typeof argv.port !== 'number') {
  yargs.showHelp();
  console.error('\nInvalid argument: `port` must be a number');
  process.exit(1);
}


interface LocalTunnelOptions {
  port: number;
  host: string;
  subdomain?: string;
  local_host?: string;
  local_https?: boolean;
  local_cert?: string;
  local_key?: string;
  local_ca?: string;
  allow_invalid_cert?: boolean;
}

(async () => {
  try {
    const tunnel = await localtunnel({
      port: argv.port,
      host: argv.host,
      subdomain: argv.subdomain,
      local_host: argv.localHost,
      local_https: argv.localHttps,
      local_cert: argv.localCert,
      local_key: argv.localKey,
      local_ca: argv.localCa,
      allow_invalid_cert: argv.allowInvalidCert,
    } as LocalTunnelOptions);

    tunnel.on('error', (err: Error) => {
      throw err;
    });
    console.log("============================================================================================================");
    console.log('Your tunnel URL is: ', '\x1b[33m', tunnel.url, '\x1b[0m');
    console.log("============================================================================================================");

    if (tunnel.cachedUrl) {
      console.log('Your cached URL is: ', '\x1b[33m', tunnel.cachedUrl, '\x1b[0m');
    }

    if (argv.open) {
      openurl.open(tunnel.url);
    }

    if (argv['print-requests']) {
      tunnel.on('request', (info: { method: string; path: string }) => {
        logger.debug(`${info.method} ${info.path}`);
      });
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
