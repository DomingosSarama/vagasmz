import type { Express, Request, Response, NextFunction } from 'express';
import type { RuntimeConfig } from './runtime.ts';
export function installSecurity(app:Express,production:boolean,limit=60,runtime?:RuntimeConfig) {
  app.disable('x-powered-by');
  app.set('trust proxy', runtime?.trustProxyHops || false);
  let lastSweep = 0;
  const requests = new Map<string,{start:number,count:number}>();
  app.use((req:Request,res:Response,next:NextFunction) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','SAMEORIGIN');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(production) res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
    const port = req.socket.localPort;
    const localHosts = [`127.0.0.1:${port}`,`localhost:${port}`];
    const publicOrigin = runtime?.publicOrigin;
    const hosts = [...localHosts, ...(publicOrigin ? [new URL(publicOrigin).host] : [])];
    if(!hosts.includes(req.headers.host || '')) {res.status(403).json({error:'Pedido não autorizado.'});return;}
    if (publicOrigin && !localHosts.includes(req.headers.host || '') && req.path !== '/healthz') {
      if (!req.secure) {
        if (req.method === 'GET' || req.method === 'HEAD') res.redirect(308, publicOrigin + req.originalUrl);
        else res.status(403).json({error:'Usa a ligação HTTPS do VagasMZ.'});
        return;
      }
      res.setHeader('Strict-Transport-Security','max-age=31536000');
    }
    if (req.path === '/healthz') res.setHeader('Cache-Control','no-store');
    if(req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control','no-store');
      const origin = req.headers.origin;
      if((origin && ![...localHosts.map(h => `http://${h}`), ...(publicOrigin ? [publicOrigin] : [])].includes(origin)) || req.headers['sec-fetch-site'] === 'cross-site') {res.status(403).json({error:'Origem do pedido não autorizada.'});return;}
      const key = `${req.ip || req.socket.remoteAddress}:${req.path.includes('extract-url') ? 'extract' : 'api'}`;
      const now = Date.now();
      if (now - lastSweep >= 60000) {
        for (const [k,v] of requests) if (now - v.start >= 60000) requests.delete(k);
        lastSweep = now;
      }
      let state = requests.get(key);
      if (!state && requests.size >= 10000) {res.setHeader('Retry-After','60');res.status(429).json({error:'Serviço ocupado. Tenta novamente dentro de um minuto.'});return;}
      if(!state || now-state.start > 60000) {state={start:now,count:0};requests.set(key,state);}
      state.count++;
      if(state.count > (req.path.includes('extract-url') ? Math.min(10,limit) : limit)) {res.setHeader('Retry-After','60');res.status(429).json({error:'Demasiados pedidos. Aguarda um minuto.'});return;}
      if(req.method === 'POST' && Number(req.headers['content-length'] || 0) > 0 && !req.is('application/json')) {res.status(415).json({error:'Envia os dados no formato JSON.'});return;}
    }
    next();
  });
}
export function safeErrorHandler(error:unknown,_req:Request,res:Response,_next:NextFunction) {
  const status = (error as {status?:number})?.status;
  const code = status === 413 ? 413 : status === 400 ? 400 : 500;
  res.setHeader('Cache-Control','no-store');
  res.status(code).json({error:code === 413 ? 'Os dados excedem o tamanho permitido.' : code === 400 ? 'Dados inválidos. Verifica o ficheiro ou formulário.' : 'Não foi possível concluir o pedido. Tenta novamente.'});
}
