# Triotunnel

Triotunnel exposes your localhost securely to the world for easy testing and sharing! No need to mess with DNS or deploy just to have others test out your changes.

Great for working with browser testing tools like Browserling or external API callback services like Twilio which require a public URL for callbacks.

---

### ☕ Support My Work

If you find my projects helpful, consider supporting me:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge\&logo=buy-me-a-coffee\&logoColor=black)](https://buymeacoffee.com/balaji8385)

---

## Quickstart

```bash
npx lt2 --port 8000
```

---

## Installation

### Globally

```bash
npm install -g localtunnel2
```

### As a dependency in your project

```bash
yarn add localtunnel2
```

---

## CLI Usage

When installed globally, just use the `lt2` command to start the tunnel.

```bash
lt2 --port 8000 --remote-host https://triotunnel.com
```

That’s it! It will connect to the tunnel server, set up the tunnel, and tell you what URL to use for testing.
The URL will remain active for the duration of your session, so feel free to share it.

You can restart your local server as much as you want — `lt2` automatically reconnects once it’s back online.

---

## 🧩 Configuration File Support (`lt2.config.ts` / `lt2.config.js`)

From version **v2.0+**, Triotunnel supports loading configuration from a file.
This means you can run `lt2` without passing CLI arguments.

### 🔍 Supported Config File Names

The CLI automatically detects these in your working directory:

* `lt2.config.ts`
* `lt2.config.js`
* `lt2.config.mjs`
* `lt2.config.cjs`

You can also specify a path manually:

```bash
lt2 --config ./myconfig/lt2.config.ts
```

### ✅ Example `lt2.config.ts`

```ts
import { defineConfig } from "lt2/config";

export default defineConfig({
  // Default upstream host
  remote_host: "https://rp.beta.bluewillowsystems.com",

  // Local server port
  port: 4000,

  // Tunnel traffic to a local HTTPS server
  local_https: true,

  // Certificate paths
  local_cert: "/Users/balajilakshminarayanan/Documents/triotunnel-client/testserver/cert.pem",
  local_key: "/Users/balajilakshminarayanan/Documents/triotunnel-client/testserver/key.pem",

  // Optional: for self-signed certificates
  // local_ca: "/Users/.../cert.pem",

  // Ignore SSL validation errors for local HTTPS
  allow_invalid_cert: true,

  // Optional subdomain and local hostname
  subdomain: "dev-tunnel",
  local_host: "localhost"
});
```

> 🔹 CLI flags **override** config values if provided.
> 🔹 Config files can be written in **TypeScript**, **CommonJS**, or **ESM** formats.

---

## 🌍 Environment Variables (Optional)

You can also define settings via environment variables (useful for CI/CD):

| Variable              | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `DEFAULT_SERVER_HOST` | Default upstream host (e.g. `https://triotunnel.com`)               |
| `LOCAL_HTTPS`         | Enable HTTPS tunneling (`true`/`false`)                             |
| `LOCAL_CERT`          | Path to local HTTPS certificate file                                |
| `LOCAL_KEY`           | Path to local HTTPS key file                                        |
| `LOCAL_CA`            | Path to CA file for self-signed certificates                        |
| `ALLOW_INVALID_CERT`  | Disable SSL certificate validation for local HTTPS (`true`/`false`) |

Example `.env`:

```bash
DEFAULT_SERVER_HOST=https://rp.beta.bluewillowsystems.com
LOCAL_HTTPS=true
LOCAL_CERT=/path/to/cert.pem
LOCAL_KEY=/path/to/key.pem
ALLOW_INVALID_CERT=true
```

---

## CLI Arguments (Optional)

You can still use traditional CLI flags.
Below are some common arguments — see `lt2 --help` for the full list.

| Option                 | Type    | Description                                   |
| ---------------------- | ------- | --------------------------------------------- |
| `--port, -p`           | number  | Local port to expose through Triotunnel       |
| `--remote-host, -h`    | string  | URL for the upstream proxy server             |
| `--subdomain, -s`      | string  | Request a specific subdomain                  |
| `--local-host, -l`     | string  | Proxy to this hostname instead of `localhost` |
| `--local-https`        | boolean | Tunnel traffic to a local HTTPS server        |
| `--local-cert`         | string  | Path to local HTTPS certificate               |
| `--local-key`          | string  | Path to local HTTPS key                       |
| `--local-ca`           | string  | Path to local CA for self-signed certificates |
| `--allow-invalid-cert` | boolean | Disable certificate checks                    |
| `--config, -c`         | string  | Path to a config file (`lt2.config.ts`, etc.) |

Refer to [tls.createSecureContext](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) for certificate details.

---

## Tunnel Events

The `tunnel` instance returned to your callback emits the following events:

| Event     | Args | Description                                                      |
| --------- | ---- | ---------------------------------------------------------------- |
| `request` | info | Fires when a request is processed (contains `method` and `path`) |
| `error`   | err  | Fires when an error occurs                                       |
| `close`   | —    | Fires when the tunnel closes                                     |

---

## Tunnel Methods

| Method    | Args | Description       |
| --------- | ---- | ----------------- |
| `close()` | —    | Closes the tunnel |

---

## Server

See [@triotunnel/server](https://github.com/balaji8385/localtunnel-server) for details on the server that powers Triotunnel.

---

## License

MIT

---

## Thanks To

Influenced by [localtunnel](https://www.npmjs.com/package/localtunnel)
Created by [defunctzombie](https://www.npmjs.com/~defunctzombie)

---

Would you like me to also add a **“Configuration Priority Order”** section (to explain CLI > config file > env > defaults)? That’s a common addition for CLI tools.
