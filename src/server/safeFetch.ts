import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isPublicIp } from '../utils/publicAddress.ts';
// Fixed public hosts only. Redirects are rejected so an external page cannot
// turn the metadata endpoint into a proxy for a private or local service.
const PUBLIC_SOURCE_HOSTS = new Set([
  'emprego.mmo.co.mz', 'sovagas.co.mz', 'remotive.com', 'jobicy.com',
  'www.vm.co.mz', 'www.millenniumbim.co.mz', 'www.standardbank.co.mz',
  'www.edm.co.mz', 'www.south32.net', 'careers.south32.net',
  'www.sasol.com', 'www.cornelder.co.mz', 'www.bci.co.mz',
]);

export function validateFetchTarget(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.port && url.port !== '443') || !PUBLIC_SOURCE_HOSTS.has(url.hostname)) {
    throw new Error('A extracção automática só aceita os domínios HTTPS autorizados. Usa o formulário manual para outras fontes.');
  }
  return url;
}

// Resolve once, validate every answer, and pin that address to the TLS request.
// The original hostname remains the certificate/SNI identity.
export function createSourceFetcher(resolve = lookup, request = https.request) {
  return async function fetchSourceText(rawUrl:string, timeoutMs=5000, accept='application/json') {
    const url = validateFetchTarget(rawUrl);
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let req: ReturnType<typeof https.request> | undefined;
    const operation = (async () => {
      const addresses = await resolve(url.hostname,{all:true});
      if(cancelled) throw new Error('Consulta cancelada.');
      if(!addresses.length || addresses.some(a => !isPublicIp(a.address))) throw new Error('Endereço da fonte bloqueado.');
      const pinned = addresses[0];
      return await new Promise<{ok:boolean;status:number;text:()=>Promise<string>;json:()=>Promise<unknown>}>((resolveBody,reject) => {
        req = request(url,{
          headers:{Accept:accept,'User-Agent':'VagasMZ/0.1 (public-source-reader)'},
          lookup:(_host,options,callback) => {
            if(options.all) callback(null,[pinned]);
            else (callback as Function)(null,pinned.address,pinned.family);
          },
        },response => {
          const status = response.statusCode || 502;
          if(status >= 300 && status < 400) {response.resume(); reject(new Error('Redireccionamento bloqueado.')); return;}
          const maxBytes = 2*1024*1024;
          if(Number(response.headers['content-length']) > maxBytes) {response.destroy(); reject(new Error('Resposta demasiado grande.')); return;}
          let size = 0; const chunks:Buffer[] = [];
          response.on('data',(chunk:Buffer) => {
            size += chunk.length;
            if(size > maxBytes) {response.destroy(); reject(new Error('Resposta demasiado grande.'));}
            else chunks.push(chunk);
          });
          response.on('error',reject);
          response.on('end',() => {
            const body = Buffer.concat(chunks).toString('utf8');
            resolveBody({ok:status >= 200 && status < 300,status,text:async()=>body,json:async()=>JSON.parse(body)});
          });
        });
        req.on('error',reject); req.end();
      });
    })();
    try {
      return await Promise.race([operation,new Promise<never>((_,reject) => {
        timer = setTimeout(() => {cancelled = true;req?.destroy();reject(new Error('A fonte excedeu o tempo limite.'));},timeoutMs);
      })]);
    } finally {clearTimeout(timer!);}
  };
}
export const fetchSourceText = createSourceFetcher();
