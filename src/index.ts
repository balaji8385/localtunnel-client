#!/usr/bin/env node
/* eslint-disable no-console */

import openurl from 'openurl';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { localtunnel } from './localtunnel';
import { version } from '../package.json';
import logger from './utils/logger';
import { Lt2Config } from './config';

interface Args {
  port?: number;
  remoteHost?: string;
  subdomain?: string;
  localHost?: string;
  localHttps?: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert?: boolean;
  open?: boolean;
  'print-requests'?: boolean;
  config?: string;
}


/* ---------------------------------------
 * Config loading utilities
 * -------------------------------------*/

function findConfigPath(cwd: string, explicit?: string | null) {
  if (explicit) {
    const p = resolve(cwd, explicit);
    if (!existsSync(p)) {
      throw new Error(`Config file not found at: ${p}`);
    }
    return p;
  }
  const candidates = [
    'lt2.config.ts',
    'lt2.config.js',
    'lt2.config.mjs',
    'lt2.config.cjs',
  ];
  for (const name of candidates) {
    const p = resolve(cwd, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function readPackageJsonLt2(cwd: string): any | null {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg?.lt2 ?? null;
  } catch {
    return null;
  }
}

function loadConfig(cwd: string, configPathFromCli?: string): { cfg: any; source: string | null } {
  const explicit = configPathFromCli ?? process.env.LT2_CONFIG ?? undefined;
  const file = findConfigPath(cwd, explicit);

  if (file) {
    // lazy-require jiti to support TS/ESM/CJS without heavy deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jiti = require('jiti')(__filename, {
      interopDefault: true,
      esmResolve: true,
      extensions: ['.ts', '.js', '.mjs', '.cjs'],
    });
    const mod = jiti(file);
    const raw = mod?.default ?? mod;
    const value = typeof raw === 'function' ? raw() : raw;
    return { cfg: value ?? {}, source: file };
  }

  const fromPkg = readPackageJsonLt2(cwd);
  if (fromPkg) {
    return { cfg: fromPkg, source: 'package.json#lt2' };
  }

  return { cfg: {}, source: null };
}

/* ---------------------------------------
 * Normalization helpers
 * -------------------------------------*/

// Accept both camelCase and snake_case in config
function normalizeConfigKeys(input: any): Partial<Lt2Config> {
  if (!input || typeof input !== 'object') return {};
  const out: Partial<Lt2Config> = {};

  // required in the end (we’ll validate later)
  if (typeof input.port === 'number') out.port = input.port;

  const remoteHost = input.remoteHost ?? input.remote_host;
  if (typeof remoteHost === 'string') out.remote_host = remoteHost;

  // optional
  if (typeof input.subdomain === 'string') out.subdomain = input.subdomain;

  // allow both localHost and local_host
  const localHost = input.localHost ?? input.local_host;
  if (typeof localHost === 'string') out.local_host = localHost;

  const localHttps = input.localHttps ?? input.local_https;
  if (typeof localHttps === 'boolean') out.local_https = localHttps;

  const localCert = input.localCert ?? input.local_cert;
  if (typeof localCert === 'string') out.local_cert = localCert;

  const localKey = input.localKey ?? input.local_key;
  if (typeof localKey === 'string') out.local_key = localKey;

  const localCa = input.localCa ?? input.local_ca;
  if (typeof localCa === 'string') out.local_ca = localCa;

  const allowInvalidCert = input.allowInvalidCert ?? input.allow_invalid_cert;
  if (typeof allowInvalidCert === 'boolean') out.allow_invalid_cert = allowInvalidCert;

  return out;
}

// Map argv (camelCase from yargs) to Lt2Config shape
function argvToOptions(a: Args): Partial<Lt2Config> {
  const o: Partial<Lt2Config> = {};
  if (typeof a.port === 'number') o.port = a.port;
  if (typeof a.remoteHost === 'string') o.remote_host = a.remoteHost;
  if (typeof a.localHost === 'string') o.local_host = a.localHost;
  if (typeof a.subdomain === 'string') o.subdomain = a.subdomain;
  if (typeof a.localHost === 'string') o.local_host = a.localHost;
  if (typeof a.localHttps === 'boolean') o.local_https = a.localHttps;
  if (typeof a.localCert === 'string') o.local_cert = a.localCert;
  if (typeof a.localKey === 'string') o.local_key = a.localKey;
  if (typeof a.localCa === 'string') o.local_ca = a.localCa;
  if (typeof a.allowInvalidCert === 'boolean') o.allow_invalid_cert = a.allowInvalidCert;
  return o;
}

function validateRequired(opts: Partial<Lt2Config>) {
  const errors: string[] = [];
  if (typeof opts.port !== 'number' || !Number.isFinite(opts.port)) {
    errors.push('`port` must be a number');
  }
  if (errors.length) {
    yargs(hideBin(process.argv)).showHelp();
    console.error('\nInvalid configuration:\n- ' + errors.join('\n- '));
    process.exit(1);
  }
}

/* ---------------------------------------
 * CLI (yargs) — no demandOption, we’ll validate after merge
 * -------------------------------------*/

const argv = (yargs(hideBin(process.argv)) as any)
  .usage('Usage: lt2 <options>')
  .env(true)
  .option('p', {
    alias: 'port',
    describe: 'Internal HTTP server port',
    type: 'number',
  })
  .option('r', {
    alias: 'remote-host',
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
  })
  .option('local-cert', {
    describe: 'Path to certificate PEM file for local HTTPS server',
    type: 'string',
  })
  .option('local-key', {
    describe: 'Path to certificate key file for local HTTPS server',
    type: 'string',
  })
  .option('local-ca', {
    describe:
      'Path to certificate authority file for self-signed certificates',
    type: 'string',
  })
  .option('allow-invalid-cert', {
    describe:
      'Disable certificate checks for your local HTTPS server (ignore cert/key/ca options)',
    type: 'boolean',
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
  .option('c', {
    alias: 'config',
    describe: 'Path to lt2 config file (ts/js/mjs/cjs)',
    type: 'string',
  })
  .help('help', 'Show this help and exit')
  .version(version)
  .parseSync() as Args;

/* ---------------------------------------
 * Merge precedence:
 *   config (auto/env/explicit/pkg)  -> base
 *   CLI flags (argv)                -> override
 * -------------------------------------*/

const { cfg: loadedCfg, source: cfgSource } = loadConfig(process.cwd(), argv.config);
const baseFromConfig = normalizeConfigKeys(loadedCfg);
const overridesFromArgv = argvToOptions(argv);
const finalOptions: Partial<Lt2Config> = {
  ...baseFromConfig,
  ...overridesFromArgv,
};

// Validate required after merge (allows config-only usage)
validateRequired(finalOptions);

(async () => {
  try {
    const tunnel = await localtunnel(finalOptions as Lt2Config);

    tunnel.on('error', (err: Error) => {
      throw err;
    });

    console.log("============================================================================================================");
    console.log('Your tunnel URL is: ', '\x1b[33m', tunnel.url, '\x1b[0m');
    console.log("============================================================================================================");

    if ((tunnel as any).cachedUrl) {
      console.log('Your cached URL is: ', '\x1b[33m', (tunnel as any).cachedUrl, '\x1b[0m');
    }

    if (argv.open) {
      openurl.open(tunnel.url);
    }

    if (argv['print-requests']) {
      tunnel.on('request', (info: { method: string; path: string }) => {
        logger.debug(`${info.method} ${info.path}`);
      });
    }

    // Optional: let users see where config came from when troubleshooting
    if (cfgSource) {
      logger.debug(`[lt2] Loaded config from: ${cfgSource}`);
    } else {
      logger.debug('[lt2] Using defaults / CLI only (no config file found)');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
