import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Retire the old offline shell without deleting personal data from IndexedDB.
if ('caches' in window) {
  void caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vagasmz-cache-')).map(key => caches.delete(key)))).catch(() => {});
}
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister()))).catch(() => {});
}

const root = createRoot(document.getElementById('root')!);
let privateAccess = true;
let checking = false;
let mounted = false;

function ConnectionNotice() {
  return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:24,background:'#070b07',color:'#f8faf5',fontFamily:'system-ui'}}><section style={{maxWidth:420}}><h1>O teu espaço privado.</h1><p>Precisamos de uma ligação à Internet para confirmar a tua sessão.</p><button type="button" onClick={() => window.location.reload()} style={{padding:'14px 22px',borderRadius:12,border:0,background:'#aff43b',color:'#172005',cursor:'pointer'}}>Voltar a tentar</button></section></main>;
}
function hideApplication() { mounted = false; root.render(<ConnectionNotice />); }

async function verifySession() {
  if (checking) return;
  checking = true;
  try {
    const response = await fetch('/api/access/session', {cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(8000)});
    if (response.status === 401) {hideApplication(); window.location.replace('/login'); return;}
    if (!response.ok) throw new Error('Session unavailable');
    const state = await response.json() as {authenticated?:boolean;privateAccess?:boolean};
    if (state.authenticated !== true) throw new Error('Session unavailable');
    privateAccess = state.privateAccess !== false;
    if (!mounted) {root.render(<AppErrorBoundary><App /></AppErrorBoundary>); mounted = true;}
  } catch {
    if (privateAccess) hideApplication();
  } finally {checking = false;}
}

window.addEventListener('offline', () => {if (privateAccess) hideApplication();});
window.addEventListener('online', () => {if (privateAccess) void verifySession();});
window.addEventListener('pageshow', event => {if (event.persisted) window.location.reload();});
document.addEventListener('visibilitychange', () => {if (document.visibilityState === 'visible') void verifySession();});
window.setInterval(() => {if (privateAccess && document.visibilityState === 'visible') void verifySession();}, 30_000);
void verifySession();
