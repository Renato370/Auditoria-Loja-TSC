/* Service worker: guarda o app no aparelho para abrir sem internet. */
const CACHE = 'auditoria-loja-v1.1.0';
const SHELL = ['./', 'index.html', 'app.js', 'config.js', 'app.webmanifest', 'icons/loja-192.png', 'icons/loja-512.png', 'icons/shopping-logo.png', 'icons/loja-apple-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => {
    c.add('xlsx.full.min.js').catch(() => {});             // gerador de Excel: guardado à parte, não trava a instalação
    return c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // chamadas à planilha (POST) vão direto
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (url.pathname.endsWith('version.json')) return;      // sempre da rede
  const externo = ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
  if (url.origin === location.origin || externo) {
    // rede primeiro (para pegar atualizações); sem internet, usa a cópia guardada
    const net = url.origin === location.origin ? fetch(req, { cache: 'no-cache' }) : fetch(req);
    e.respondWith(net.then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  }
});
