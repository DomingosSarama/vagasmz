import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';

export interface PrivateAccessOptions {
  enabled: boolean;
  password?: string;
  publicOrigin?: string;
  now?: () => number;
  idleMs?: number;
  lifetimeMs?: number;
  attempts?: number;
}

// No application content or API response may be served before this gate.
// Credentials live only in the server environment; sessions are opaque and expire on restart.
export async function installPrivateAccess(app: Express, options: PrivateAccessOptions) {
  const enabled = options.enabled;
  const clock = options.now || Date.now;
  const idleMs = options.idleMs ?? 30 * 60_000;
  const lifetimeMs = options.lifetimeMs ?? 8 * 60 * 60_000;
  const secure = Boolean(options.publicOrigin);
  const sessionCookie = secure ? '__Host-vagasmz-session' : 'vagasmz-session';
  const csrfCookie = secure ? '__Host-vagasmz-login' : 'vagasmz-login';
  const signingKey = randomBytes(32);
  const salt = randomBytes(16);
  const suppliedPassword = options.password;
  const configured = typeof suppliedPassword === 'string' && suppliedPassword.length >= 16 && suppliedPassword.length <= 128;
  const derive = (password: string) => new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, {N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024}, (error, key) => error ? reject(error) : resolve(key));
  });
  const passwordKey = configured ? await derive(suppliedPassword) : undefined;
  const sessions = new Map<string, {created: number; seen: number}>();
  const attempts = new Map<string, {start: number; count: number}>();
  let globalAttempts = {start: clock(), count: 0};
  let pendingVerifications = 0;
  const digest = (token: string) => createHash('sha256').update(token).digest('hex');
  const equal = (a: string, b: string) => {
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  };
  const cookie = (req: Request, name: string) => {
    const values = (req.headers.cookie || '').split(';').map(part => part.trim()).filter(part => part.startsWith(name + '='));
    return values.length === 1 ? values[0].slice(name.length + 1) : '';
  };
  const setCookie = (res: Response, name: string, value: string, maxAge: number) => {
    res.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
  };
  const prune = () => {
    const now = clock();
    for (const [key, entry] of sessions) if (now - entry.seen >= idleMs || now - entry.created >= lifetimeMs) sessions.delete(key);
    for (const [key, entry] of attempts) if (now - entry.start >= 15 * 60_000) attempts.delete(key);
  };
  const session = (req: Request) => {
    prune();
    const token = cookie(req, sessionCookie);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
    const key = digest(token), entry = sessions.get(key);
    if (entry && req.path !== '/api/access/session') entry.seen = clock();
    return entry ? key : undefined;
  };
  const sameOrigin = (req: Request) => req.headers.origin === (options.publicOrigin || `${req.protocol}://${req.headers.host}`) && req.headers['sec-fetch-site'] !== 'cross-site';
  const sign = (value: string) => createHmac('sha256', signingKey).update(value).digest('base64url');
  const validCsrf = (req: Request) => {
    const value = cookie(req, csrfCookie);
    if (typeof req.body?.csrf !== 'string' || !equal(value, req.body.csrf)) return false;
    const parts = value.split('.');
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]{43}$/.test(parts[0]) || !/^\d{13}$/.test(parts[1])) return false;
    const expiry = Number(parts[1]);
    return expiry > clock() && expiry <= clock() + 10 * 60_000 && equal(parts[2], sign(parts[0] + '.' + parts[1]));
  };
  const loginPage = (res: Response, status = 200, error = '') => {
    const value = randomBytes(32).toString('base64url') + '.' + (clock() + 10 * 60_000);
    const csrf = value + '.' + sign(value);
    setCookie(res, csrfCookie, csrf, 600);
    res.setHeader('Clear-Site-Data', '"cache"');
    res.status(status).type('html').send(`<!doctype html><html lang="pt-MZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>VagasMZ — Acesso privado</title><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#050705;color:#f8faf5;font-family:system-ui,sans-serif}.card{width:min(100%,440px);padding:36px;border:1px solid #2b352b;border-radius:24px;background:linear-gradient(145deg,#121912,#080b08);box-shadow:0 24px 100px #0008}.brand{font-size:25px;font-weight:800;margin:0 0 42px}.brand span{color:#aff43b}.lock{display:grid;place-items:center;width:52px;height:52px;border:1px solid #3e582b;border-radius:16px;background:#aaff1912;color:#aff43b;font-size:26px}h1{font-size:29px;letter-spacing:-1px;margin:20px 0 12px}p{color:#aeb8ac;line-height:1.6;margin:0 0 24px}label{display:block;font-size:14px;margin-bottom:10px}input{width:100%;border:1px solid #465443;border-radius:12px;padding:16px;background:#070b07;color:white;font:inherit}input:focus{outline:2px solid #aff43b;outline-offset:2px}button{margin-top:18px;width:100%;padding:16px;border:0;border-radius:12px;background:#aff43b;color:#172005;font:inherit;font-weight:750;cursor:pointer}.error{padding:12px;border:1px solid #885747;border-radius:10px;background:#331e17;color:#ffcdc2;font-size:14px}.foot{font-size:12px;color:#82907e;margin:24px 0 0}</style><script src="/access-cleanup.js" defer></script></head><body><main class="card"><div class="brand">Vagas<span>MZ</span></div><div class="lock" aria-hidden="true">&#128274;</div><h1>O teu espaço privado.</h1><p>Inicia sessão para aceder às tuas oportunidades e acompanhar a tua carreira.</p>${error ? `<p class="error" role="alert">${error}</p>` : ''}${configured ? `<form action="/login" method="post"><input type="hidden" name="csrf" value="${csrf}"><label for="password">Palavra-passe</label><input id="password" name="password" type="password" required maxlength="128" autocomplete="current-password" autofocus><button type="submit">Entrar no VagasMZ &rarr;</button></form>` : '<p class="error" role="status">O acesso privado está em preparação. Volta a tentar mais tarde.</p>'}<p class="foot">Acesso reservado ao proprietário.</p></main></body></html>`);
  };

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.vary('Cookie');
    next();
  });
  // These contain only cache-removal code, never application data.
  app.get('/access-cleanup.js', (_req, res) => res.type('js').send(CLEANUP_SCRIPT));
  app.get('/sw.js', (_req, res) => {res.setHeader('Service-Worker-Allowed', '/'); res.type('js').send(RETIRE_WORKER);});
  app.get('/robots.txt', (_req, res) => res.type('text').send('User-agent: *\nDisallow: /\n'));
  app.get('/login', (req, res) => {
    if (!enabled || (configured && session(req))) {res.redirect(303, '/'); return;}
    loginPage(res, configured ? 200 : 503);
  });
  app.post('/login', (req, res, next) => {
    if (!enabled) {res.redirect(303, '/'); return;}
    if (!configured) {loginPage(res, 503); return;}
    if (!sameOrigin(req)) {res.status(403).send('Pedido não autorizado.'); return;}
    prune();
    const now = clock(), ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (now - globalAttempts.start >= 15 * 60_000) globalAttempts = {start: now, count: 0};
    let entry = attempts.get(ip);
    if (!entry) {
      if (attempts.size >= 1000) {res.setHeader('Retry-After', '900'); loginPage(res, 429, 'Aguarda alguns minutos antes de tentar novamente.'); return;}
      entry = {start: now, count: 0}; attempts.set(ip, entry);
    }
    if (entry.count >= (options.attempts ?? 5) || globalAttempts.count >= 50) {res.setHeader('Retry-After', '900'); loginPage(res, 429, 'Aguarda alguns minutos antes de tentar novamente.'); return;}
    entry.count++; globalAttempts.count++;
    if (!req.is('application/x-www-form-urlencoded')) {res.status(415).send('Pedido inválido.'); return;}
    next();
  }, express.urlencoded({extended: false, limit: '4kb', parameterLimit: 4}), (req, res, next) => {
    void (async () => {
      if (!validCsrf(req)) {res.status(403).send('Pedido não autorizado. Volta à página de entrada.'); return;}
      const password = req.body?.password;
      if (typeof password !== 'string' || password.length > 128 || pendingVerifications >= 2) {loginPage(res, 401, 'Não foi possível iniciar sessão. Verifica a palavra-passe.'); return;}
      pendingVerifications++;
      let matches = false;
      try {matches = timingSafeEqual(await derive(password), passwordKey!);} finally {pendingVerifications--;}
      if (!matches) {loginPage(res, 401, 'Não foi possível iniciar sessão. Verifica a palavra-passe.'); return;}
      attempts.delete(req.ip || req.socket.remoteAddress || 'unknown');
      const previous = session(req); if (previous) sessions.delete(previous);
      while (sessions.size >= 32) sessions.delete(sessions.keys().next().value!);
      const token = randomBytes(32).toString('base64url');
      sessions.set(digest(token), {created: clock(), seen: clock()});
      setCookie(res, csrfCookie, '', 0);
      setCookie(res, sessionCookie, token, Math.floor(lifetimeMs / 1000));
      res.redirect(303, '/');
    })().catch(next);
  });
  app.post('/logout', (req, res) => {
    if (!sameOrigin(req)) {res.status(403).send('Pedido não autorizado.'); return;}
    const key = session(req); if (key) sessions.delete(key);
    setCookie(res, sessionCookie, '', 0);
    setCookie(res, csrfCookie, '', 0);
    res.setHeader('Clear-Site-Data', '"cache"');
    res.redirect(303, '/login');
  });
  app.get('/logout', (_req, res) => res.status(405).send('Pedido inválido.'));
  app.use((req, res, next) => {
    if (!enabled || (configured && session(req))) {next(); return;}
    if (req.path.startsWith('/api/')) {res.status(401).json({error: 'Precisas de iniciar sessão.', code: 'AUTH_REQUIRED'}); return;}
    if (req.method === 'GET' && req.accepts('html') && (req.path === '/' || !pathHasExtension(req.path))) {res.redirect(303, '/login'); return;}
    res.status(401).send('Acesso reservado.');
  });
  app.get('/api/access/session', (_req, res) => res.json({authenticated: true, privateAccess: enabled}));
}

function pathHasExtension(path: string) {return /\.[^/]+$/.test(path);}

export const CLEANUP_SCRIPT = `(() => {
  if ('caches' in window) caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vagasmz-cache-')).map(key => caches.delete(key)))).catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister()))).catch(() => {});
})();`;

export const RETIRE_WORKER = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('vagasmz-cache-')).map(key => caches.delete(key)));
  await self.clients.claim();
  await self.registration.unregister();
  const clients = await self.clients.matchAll({type:'window'});
  await Promise.all(clients.map(client => client.navigate('/login').catch(() => {})));
})()));`;
