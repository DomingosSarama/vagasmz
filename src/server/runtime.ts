import { isPublicHost } from '../utils/publicAddress.ts';

export interface RuntimeConfig {
  port: number;
  host: '127.0.0.1' | '0.0.0.0';
  publicOrigin?: string;
  trustProxyHops: 0 | 1;
}

export function readRuntimeConfig(env: Record<string, string | undefined> = process.env): RuntimeConfig {
  const portText = env.PORT || '3000';
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
    throw new Error('PORT inválida.');
  }
  const isRender = env.RENDER === 'true';
  const publicUrl = env.PUBLIC_URL || (isRender ? env.RENDER_EXTERNAL_URL : undefined);
  let publicOrigin: string | undefined;
  if (publicUrl) {
    const url = new URL(publicUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        url.pathname !== '/' || url.search || url.hash || !isPublicHost(url.hostname)) {
      throw new Error('PUBLIC_URL deve ser uma origem HTTPS pública, sem credenciais ou caminhos.');
    }
    publicOrigin = url.origin;
  }
  if (isRender && !publicOrigin) throw new Error('Falta o endereço público do serviço Render.');
  if (env.TRUST_PROXY_HOPS && !['0', '1'].includes(env.TRUST_PROXY_HOPS)) {
    throw new Error('TRUST_PROXY_HOPS deve ser 0 ou 1.');
  }
  const trustProxyHops = env.TRUST_PROXY_HOPS === '1' || (isRender && env.TRUST_PROXY_HOPS !== '0') ? 1 : 0;
  if (trustProxyHops && !publicOrigin) throw new Error('O proxy requer uma origem pública explícita.');
  return {port: Number(portText), host: publicOrigin ? '0.0.0.0' : '127.0.0.1', publicOrigin, trustProxyHops};
}
