export interface Lt2Config {
  port?: number;
  subdomain?: string;
  local_host?: string;
  local_https?: boolean;
  local_cert?: string;
  local_key?: string;
  local_ca?: string;
  allow_invalid_cert?: boolean;
  remote_ip?: string;
  remote_port?: number;
  remote_host?: string;

}

export function defineConfig(cfg: Lt2Config): Lt2Config;
