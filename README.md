# Triotunnel

triotunnel exposes your localhost securely to the world for easy testing and sharing! No need to mess with DNS or deploy just to have others test out your changes.

Great for working with browser testing tools like browserling or external api callback services like twilio which require a public url for callbacks.

### ☕ Support My Work
If you find my projects helpful, consider supporting me:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/balaji8385)

## Quickstart

```
npx lt2 --port 8000
```

## Installation

### Globally

```
npm install -g localtunnel2
```

### As a dependency in your project

```
yarn add localtunnel2
```

## CLI usage

When localtunnel2 is installed globally, just use the `lt2` command to start the tunnel.

```
lt2 --port 8000 --host https://triotunnel.com
```

Thats it! It will connect to the tunnel server, setup the tunnel, and tell you what url to use for your testing. This url will remain active for the duration of your session; so feel free to share it with others for happy fun time!

You can restart your local server all you want, `lt2` is smart enough to detect this and reconnect once it is back.

### Arguments

Below are some common arguments. See `lt2 --help` for additional arguments

- `--subdomain` request a named subdomain on the triotunnel server (default is random characters)
- `--local-host` proxy to a hostname other than localhost


#### options

- `port` (number) [required] The local port number to expose through triotunnel.
- `subdomain` (string) Request a specific subdomain on the proxy server. **Note** You may not actually receive this name depending on availability.
- `host` (string) URL for the upstream proxy server. Defaults to `https://triotunnel.com`.
- `local_host` (string) Proxy to this hostname instead of `localhost`. This will also cause the `Host` header to be re-written to this value in proxied requests.
- `local_https` (boolean) Enable tunneling to local HTTPS server.
- `local_cert` (string) Path to certificate PEM file for local HTTPS server.
- `local_key` (string) Path to certificate key file for local HTTPS server.
- `local_ca` (string) Path to certificate authority file for self-signed certificates.
- `allow_invalid_cert` (boolean) Disable certificate checks for your local HTTPS server (ignore cert/key/ca options).

Refer to [tls.createSecureContext](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) for details on the certificate options.

### Tunnel

The `tunnel` instance returned to your callback emits the following events

| event   | args | description                                                                          |
| ------- | ---- | ------------------------------------------------------------------------------------ |
| request | info | fires when a request is processed by the tunnel, contains _method_ and _path_ fields |
| error   | err  | fires when an error happens on the tunnel                                            |
| close   |      | fires when the tunnel has closed                                                     |

The `tunnel` instance has the following methods

| method | args | description      |
| ------ | ---- | ---------------- |
| close  |      | close the tunnel |

## server

See [@triotunnel/server](https//github.com/balaji8385/localtunnel-server) for details on the server that powers localtunnel.

## License

MIT

## Thanks to
Influenced from project https://www.npmjs.com/package/localtunnel
[defunctzombie](https://www.npmjs.com/~defunctzombie)