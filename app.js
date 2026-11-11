/* Auditoria em Loja — app (PWA). Mesmo modelo do app Auditoria de Vendas:
   funciona sem internet, guarda os lançamentos numa fila e envia para a planilha quando há conexão. */
'use strict';

const CFG = window.APP_CONFIG || {};
const APP_VERSION = '1.0.0';
const MIN_SERVER = '1.0.0';

/* ============================ Utilidades ============================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DEC = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat('pt-BR');
const money = v => BRL.format(+v || 0);
const dec = v => DEC.format(+v || 0);
const int = v => NUM.format(Math.round(+v || 0));
const kShort = v => { v = +v || 0; return v >= 1e6 ? (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'mi' : v >= 1e4 ? Math.round(v / 1e3) + 'k' : v >= 1e3 ? (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : String(Math.round(v)); };
const pct = (a, b) => b ? (a / b * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—';
const pad = n => String(n).padStart(2, '0');
const ymdOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => ymdOf(new Date());
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const dBR = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
const dtBR = s => s ? dBR(s.slice(0, 10)) + (s.length > 10 ? ' ' + s.slice(11, 16) : '') : '';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DOW = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const mesNome = m => MESES[+m.slice(5, 7) - 1] + ' de ' + m.slice(0, 4);
const daysIn = m => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
const addMonth = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const diaLongo = s => { const d = new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); return DOW[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]; };
const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, '0')).join('');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const initials = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const verLt = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); } return false; };
const isMaster = () => !!(S.user && S.user.perfil === 'Master');
const parseMoney = s => { const d = String(s || '').replace(/\D/g, ''); return d ? +d / 100 : null; };

const svg = (p, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  back: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>', 2.2),
  sync: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', 2.2),
  cloudOff: svg('<path d="m2 2 20 20"/><path d="M5.8 5.8A6 6 0 0 0 6.5 17H17m3.6-1.2A4.5 4.5 0 0 0 17.5 9h-1A7 7 0 0 0 9.4 4.3"/>', 2.2),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.5),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  receipt: svg('<path d="M6 3h12v18l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L6 21z"/><path d="M9.5 8.5h5M9.5 12.5h5"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
  lost: svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 8.5 7 7M15.5 8.5l-7 7"/>'),
  note: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  left: svg('<path d="m15 18-6-6 6-6"/>', 2.5),
  right: svg('<path d="m9 18 6-6-6-6"/>', 2.5),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 3),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 2.5),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 3),
  down: svg('<path d="M12 4v12M6 11l6 6 6-6M4 21h16"/>', 2.2)
};
const SELO = (c, s = 4) => `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="${c}" stroke-linecap="round" stroke-linejoin="round"><path d="M25 13h50v74l-8.3-6.5-8.4 6.5-8.3-6.5-8.3 6.5-8.4-6.5-8.3 6.5z" stroke-width="${s}"/><g transform="translate(8 6) scale(.84)" stroke-width="${s * 1.15}"><path d="M32 55 Q39 47 46 46.5 Q50 46.3 51.5 43 Q54 37 55 29 Q56 23 58.5 23 Q61 23 61 29 Q61 45 63 54 Q63.7 57.2 64.3 59.1"/><path d="M29 67 Q47 56 71 60"/></g></g></svg>`;

/* ============================ Armazenamento local ============================ */
const KV = (() => {
  let dbp = null;
  const mem = {};
  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        try {
          const r = indexedDB.open('auditoria-loja', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('kv');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      }).catch(() => null);
    }
    return dbp;
  }
  async function get(k) {
    const d = await db();
    if (!d) return mem[k];
    return new Promise(res => {
      try {
        const q = d.transaction('kv').objectStore('kv').get(k);
        q.onsuccess = () => res(q.result);
        q.onerror = () => res(mem[k]);
      } catch (e) { res(mem[k]); }
    });
  }
  async function set(k, v) {
    mem[k] = v;
    const d = await db();
    if (!d) return;
    return new Promise(res => {
      try {
        const tx = d.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(v, k);
        tx.oncomplete = () => res();
        tx.onerror = () => res();
      } catch (e) { res(); }
    });
  }
  return { get, set };
})();

/* ============================ Estado ============================ */
const COLMAP = {
  Id: 'id', HoraRegistro: 'hora', Data: 'data', Auditor: 'auditor', IdLoja: 'idLoja', Loja: 'loja', Categoria: 'cat', Tipo: 'tipo',
  Numero: 'num', FormaPagamento: 'forma', Valor: 'valor', Genero: 'genero', FaixaEtaria: 'faixa', Motivo: 'motivo', Observacao: 'obs'
};
const CATS = ['Venda', 'Visita', 'Venda perdida', 'Anotação'];
const CF = 'CF / NF', SD = 'Sem Documento';
const LISTAS_PADRAO = {
  formas: ['Cartão de crédito', 'Cartão de débito', 'Pix', 'Dinheiro', 'Retirada de mercadoria', 'Troco não devolvido', 'A prazo', 'Troca zerada', 'Online'],
  motivos: ['Preço', 'Cor', 'Tamanho', 'Falta de Produto', 'Atendimento'],
  faixas: ['18/29', '30/39', '40/49', '50/60+'],
  generos: ['Masculino', 'Feminino']
};
const FORMA_CURTA = { 'Cartão de crédito': 'Crédito', 'Cartão de débito': 'Débito', 'Retirada de mercadoria': 'Retirada', 'Troco não devolvido': 'Troco', 'Troca zerada': 'Troca' };
const formaCurta = f => FORMA_CURTA[f] || f || '(sem forma)';
const ehOnline = f => /^online$/i.test(String(f || ''));

const S = {
  apiUrl: '',
  user: null,          // {id, nome, perfil, token}
  data: null,          // resposta do bootstrap
  lmap: new Map(),     // lançamentos conhecidos do servidor (id -> lançamento)
  queue: [],           // o que ainda não foi enviado
  mesFetched: new Set(),
  lastSync: 0,
  syncing: false,
  syncErr: '',
  ver: 0,
  stack: [{ v: 'inicio', p: {} }],
  ui: { calMes: '', calLoja: '', calDia: '', listaDia: '', listaFiltro: 'todos', listaAba: 'lanc', busca: '', pMes: '', pLoja: '', histAba: 'alt' },
  installEvt: null,
  audList: null,
  auditoresLogin: []
};

const rowsToLancs = (cols, rows) => { const keys = cols.map(c => COLMAP[c] || c); return rows.map(r => { const o = {}; keys.forEach((k, i) => { o[k] = r[i]; }); return o; }); };
const lista = k => (S.data && S.data.config && S.data.config[k] && S.data.config[k].length ? S.data.config[k] : LISTAS_PADRAO[k]);

async function persist() {
  await KV.set('state', { apiUrl: S.apiUrl, user: S.user, data: S.data, queue: S.queue, lastSync: S.lastSync });
}

/* ============================ Acesso ao servidor ============================ */
async function api(action, payload = {}, opts = {}) {
  const body = Object.assign({ action }, payload);
  // o aparelho guarda só a chave de acesso recebida no login (a senha não fica no celular)
  if (opts.auth !== false && S.user) body.auth = { id: S.user.id, token: S.user.token };
  if (!S.apiUrl) throw Object.assign(new Error('Endereço do servidor não configurado'), { config: true });
  let r, j;
  try {
    r = await fetch(S.apiUrl, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' });
  } catch (e) {
    throw Object.assign(new Error('Sem conexão com o servidor'), { network: true });
  }
  try { j = await r.json(); } catch (e) {
    throw Object.assign(new Error('Resposta inválida do servidor. Confira se o App da Web foi publicado com acesso "Qualquer pessoa".'), { network: true });
  }
  if (!j.ok) {
    const e = new Error(String(j.error || 'Erro no servidor').replace(/^(AUTH|PERMISSAO|BLOQUEADO):\s*/, ''));
    e.server = true;
    if (/^(AUTH|BLOQUEADO)/.test(j.error)) e.auth = true;
    if (/^BLOQUEADO/.test(j.error)) e.bloq = true;
    throw e;
  }
  return j;
}
const online = () => navigator.onLine !== false;

function applyBootstrap(b) {
  const lancs = rowsToLancs(b.cols, b.lancs);
  // substitui os meses recentes; mantém os antigos que foram carregados sob demanda
  for (const [id, l] of S.lmap) if (l.data >= b.corte) S.lmap.delete(id);
  lancs.forEach(l => S.lmap.set(l.id, l));
  S.data = Object.assign({}, b, { lancs, solicitacoes: b.solicitacoes || [] });
  S.serverOld = verLt(b.version, MIN_SERVER);
  if (b.me && S.user && b.me.perfil !== S.user.perfil) S.user.perfil = b.me.perfil;
  S.ver++;
}
function rebuildFromData() {
  S.lmap = new Map();
  if (S.data && S.data.lancs) S.data.lancs.forEach(l => S.lmap.set(l.id, l));
  S.ver++;
}

/* ---------- Lojas ---------- */
const lojas = () => (S.data && S.data.lojas) || [];
const lojaById = id => lojas().find(l => l.IdLoja === id);
const lojaMesItem = m => ((S.data && S.data.lojaMes) || []).find(x => x.Mes === m) || null;
function lojaDoMes(m) { const x = lojaMesItem(m); return x ? (lojaById(x.IdLoja) || { IdLoja: x.IdLoja, NomeFantasia: x.Loja }) : null; }

/* ---------- Lançamentos = servidor + fila local (ainda não enviada) ---------- */
let mergedCache = { sig: '' };
function merged() {
  const sig = S.ver + ':' + S.queue.map(q => q.qid + (q.error || '')).join(',');
  if (mergedCache.sig === sig) return mergedCache;
  const byId = new Map(S.lmap);
  for (const q of S.queue) {
    if (q.type !== 'lanc') continue;
    const n = q.lanc, base = byId.get(n.Id);
    const loja = base ? null : lojaDoMes(n.HoraRegistro.slice(0, 7));
    byId.set(n.Id, Object.assign({}, base || { auditor: S.user && S.user.nome, idLoja: loja ? loja.IdLoja : '', loja: loja ? loja.NomeFantasia : '' }, {
      id: n.Id, hora: n.HoraRegistro, data: n.HoraRegistro.slice(0, 10), cat: n.Categoria, tipo: n.Tipo || '', num: n.Numero === '' || n.Numero == null ? '' : +n.Numero,
      forma: n.FormaPagamento || '', valor: n.Valor === '' || n.Valor == null ? '' : +n.Valor, genero: n.Genero || '', faixa: n.FaixaEtaria || '', motivo: n.Motivo || '', obs: n.Observacao || '',
      _pending: true, _error: q.error || '', _qid: q.qid
    }));
  }
  const list = Array.from(byId.values()).sort((a, b) => (a.hora < b.hora ? 1 : a.hora > b.hora ? -1 : 0));
  mergedCache = { sig, list, byId };
  return mergedCache;
}
const doDia = (dia, idLoja) => merged().list.filter(l => l.data === dia && (!idLoja || l.idLoja === idLoja));
const doMes = (mes, idLoja) => merged().list.filter(l => l.data.startsWith(mes) && (!idLoja || l.idLoja === idLoja));

function solicAll() {
  const base = (S.data && S.data.solicitacoes) || [];
  const pend = S.queue.filter(q => q.type === 'solic').map(q => Object.assign({ Atual: '', Proposto: '(aguardando envio)' }, q.solic, { Solicitante: S.user && S.user.nome, Status: 'Pendente', DataPedido: q.hora, _pending: true, _error: q.error || '', _qid: q.qid }));
  return base.concat(pend);
}
const solicPendente = id => solicAll().find(x => x.LancamentoId === id && x.Status === 'Pendente');

/* Lojas que aparecem num mês (a do mês + as que têm lançamentos) */
function lojasNoMes(m) {
  const ids = new Set(Object.keys((S.data && S.data.meses && S.data.meses[m]) || {}));
  const lm = lojaMesItem(m); if (lm) ids.add(lm.IdLoja);
  doMes(m).forEach(l => { if (l.idLoja) ids.add(l.idLoja); });
  return Array.from(ids).map(id => lojaById(id) || { IdLoja: id, NomeFantasia: id });
}
function lojaPadrao(m) {
  const lm = lojaMesItem(m);
  if (lm) return lm.IdLoja;
  const c = (S.data && S.data.meses && S.data.meses[m]) || {};
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || '';
}

/* ============================ Fila e sincronização ============================ */
function enqueue(item) {
  item.qid = uid();
  item.uid = S.user ? S.user.id : '';     // cada item só é enviado pela pessoa que o criou
  item.hora = today() + ' ' + nowHM() + ':00';
  S.queue.push(item);
  S.ver++;
  persist();
  sync({ full: false });
}

async function sync({ full = true, quiet = true, forcar = false } = {}) {
  if (!S.user) return;
  if (S.syncing) { S.syncAgain = S.syncAgain || full; return; }
  if (!online()) { S.syncErr = 'Sem internet'; updateChrome(); return; }
  S.syncing = true; updateChrome();
  try {
    for (const item of S.queue.slice()) {
      if ((item.error && !item.retry) || (item.uid && item.uid !== S.user.id)) continue;
      try {
        await pushItem(item);
        S.queue = S.queue.filter(q => q.qid !== item.qid);
        S.ver++;
      } catch (e) {
        if (e.auth) throw e;
        if (e.server) { item.error = e.message; item.retry = false; S.ver++; if (!quiet) toast(e.message); }
        else throw e;
      }
    }
    await persist();
    if (full) {
      const b = await api('bootstrap', forcar || !S.data || !S.data.rev ? { forcar: true } : { rev: S.data.rev });
      if (!b.semMudanca) applyBootstrap(b);
      S.lastSync = Date.now();
    }
    S.syncErr = '';
  } catch (e) {
    S.syncErr = e.message;
    if (e.auth) { toast(e.message || 'Seu acesso expirou. Entre novamente.'); return logout(true); }
    if (!quiet) toast(e.message);
  } finally {
    S.syncing = false;
    await persist();
    refresh();
    if (S.syncAgain !== undefined) { const f = S.syncAgain; S.syncAgain = undefined; sync({ full: f }); }
  }
}

async function pushItem(item) {
  if (item.type === 'lanc') {
    const r = await api('salvarLancamento', { lanc: item.lanc });
    if (r.row) guardarLanc(rowsToLancs(r.cols, [r.row])[0]);
  } else if (item.type === 'solic') {
    const r = await api('solicitar', { solic: item.solic });
    if (r.solicitacao) guardarSolic(r.solicitacao);
  }
}
function guardarLanc(l) {
  const novo = !S.lmap.has(l.id);
  S.lmap.set(l.id, l);
  if (!S.data) return;
  const i = S.data.lancs.findIndex(x => x.id === l.id);
  if (l.data >= S.data.corte) { if (i >= 0) S.data.lancs[i] = l; else S.data.lancs.push(l); }
  if (novo) { const m = l.data.slice(0, 7); const o = S.data.meses[m] || (S.data.meses[m] = {}); o[l.idLoja] = (o[l.idLoja] || 0) + 1; }
  S.ver++;
}
function removerLanc(id) {
  S.lmap.delete(id);
  if (S.data) S.data.lancs = S.data.lancs.filter(x => x.id !== id);
  S.ver++;
}
function guardarSolic(s) {
  if (!S.data) return;
  S.data.solicitacoes = (S.data.solicitacoes || []).filter(x => x.id_solicitacao !== s.id_solicitacao).concat([s]);
  S.ver++;
}

/* Busca no servidor um mês antigo (o app guarda só o mês atual e o anterior) */
async function ensureMes(m) {
  if (!S.data || m + '-01' >= S.data.corte || S.mesFetched.has(m) || !online()) return;
  S.mesFetched.add(m);
  S.loadingMes = m; refresh();
  try {
    const r = await api('lancamentos', { mes: m });
    for (const [id, l] of S.lmap) if (l.data.startsWith(m)) S.lmap.delete(id);
    rowsToLancs(r.cols, r.rows).forEach(l => S.lmap.set(l.id, l));
    S.ver++;
  } catch (e) { S.mesFetched.delete(m); toast('Não foi possível carregar ' + mesNome(m)); }
  S.loadingMes = ''; refresh();
}

/* ============================ Navegação ============================ */
let refreshT = null;
let histOk = true;
function cur() { return S.stack[S.stack.length - 1]; }
function go(v, p = {}) {
  clearTimeout(refreshT);
  S.stack.push({ v, p });
  try { history.pushState({ d: S.stack.length }, ''); } catch (e) { histOk = false; }
  render(); window.scrollTo(0, 0);
}
function back() {
  if (S.stack.length <= 1) return;
  if (histOk) { try { history.back(); return; } catch (e) { /* segue */ } }
  S.stack.pop(); render();
}
window.addEventListener('popstate', () => { if (S.stack.length > 1) { S.stack.pop(); render(); } });
function tab(v) {
  const n = S.stack.length - 1;
  S.stack = [{ v, p: {} }];
  if (n > 0 && histOk) { try { history.go(-n); } catch (e) { /* ignora */ } }
  render(); window.scrollTo(0, 0);
}
let toastT = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
}

function temaAtual() { try { return localStorage.getItem('tema') || 'auto'; } catch (e) { return S.temaMem || 'auto'; } }
function aplicarTema(t) {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
}
function setTema(t) { S.temaMem = t; try { if (t === 'auto') localStorage.removeItem('tema'); else localStorage.setItem('tema', t); } catch (e) { /* só nesta sessão */ } aplicarTema(t); }

async function checkUpdate() {
  if (location.protocol !== 'https:') return;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json();
    if (j.version && verLt(APP_VERSION, j.version)) { S.updateAvail = j.version; refresh(true); }
  } catch (e) { /* sem internet */ }
}
async function doUpdate() {
  toast('Atualizando o app…');
  try {
    if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update().catch(() => {}))); }
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
  } catch (e) { /* segue */ }
  location.reload();
}

/* ============================ Cálculos ============================ */
/* Números de cupom pulados dentro de um conjunto (saltos de mais de 30 são tratados como troca de série) */
function pulados(nums) {
  const n = Array.from(new Set(nums)).sort((a, b) => a - b);
  let p = 0;
  for (let i = 1; i < n.length; i++) { const g = n[i] - n[i - 1] - 1; if (g > 0 && g <= 30) p += g; }
  return p;
}
function resumo(list) {
  const r = { vendas: [], total: 0, n: 0, sdN: 0, sdV: 0, cfN: 0, cfV: 0, visitas: 0, perdidas: 0, anot: 0, pulados: 0, min: null, max: null };
  const porDia = new Map();
  for (const l of list) {
    if (l.cat === 'Venda') {
      r.vendas.push(l); r.n++; r.total += +l.valor || 0;
      if (l.tipo === SD) { r.sdN++; r.sdV += +l.valor || 0; }
      else if (l.tipo === CF) {
        r.cfN++; r.cfV += +l.valor || 0;
        if (l.num) { if (!porDia.has(l.data)) porDia.set(l.data, []); porDia.get(l.data).push(+l.num); r.min = r.min == null ? +l.num : Math.min(r.min, +l.num); r.max = r.max == null ? +l.num : Math.max(r.max, +l.num); }
      }
    } else if (l.cat === 'Visita') r.visitas++;
    else if (l.cat === 'Venda perdida') r.perdidas++;
    else r.anot++;
  }
  for (const nums of porDia.values()) r.pulados += pulados(nums);
  return r;
}
/* Matriz hora × forma de pagamento (só vendas) */
function matriz(vendas) {
  const ordem = lista('formas');
  const formas = Array.from(new Set(vendas.map(v => v.forma || ''))).sort((a, b) => { const i = ordem.indexOf(a), j = ordem.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
  const horas = Array.from(new Set(vendas.map(v => +v.hora.slice(11, 13)))).sort((a, b) => a - b);
  const cel = {}, lin = {}, col = {}, qt = {};
  for (const v of vendas) {
    const h = +v.hora.slice(11, 13), f = v.forma || '', x = +v.valor || 0;
    cel[h + '|' + f] = (cel[h + '|' + f] || 0) + x;
    lin[h] = (lin[h] || 0) + x; col[f] = (col[f] || 0) + x; qt[h] = (qt[h] || 0) + 1;
  }
  return { formas, horas, cel, lin, col, qt };
}
function contar(list, campo) {
  const m = new Map();
  list.forEach(l => { const k = l[campo]; if (k) m.set(k, (m.get(k) || 0) + 1); });
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

/* ============================ Componentes ============================ */
function topbar({ title, sub = '', backBtn = false, actions = '' }) {
  const pend = S.queue.length;
  const off = !online();
  return `<header class="top"><div class="wrap">
    ${S.updateAvail ? `<button class="demo-banner gutter" data-act="doUpdate" style="display:block;width:100%;border:0;background:var(--brand-strong);color:var(--surface);font-weight:700">Nova versão ${esc(S.updateAvail)} disponível. Toque aqui para atualizar.</button>` : ''}
    ${S.serverOld ? '<div class="demo-banner gutter">O código da planilha (Code.gs) está desatualizado. Atualize o Apps Script para a versão ' + MIN_SERVER + '.</div>' : ''}
    <div class="top-row gutter">
      ${backBtn ? `<button class="icon-btn" data-act="back" aria-label="Voltar">${ICON.back}</button>` : `<span class="hdr-logo">${SELO('currentColor', 5)}</span>`}
      <h1>${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>
      ${actions}
      <button class="icon-btn${S.syncing ? ' spin' : ''}" data-act="sync" id="syncBtn" aria-label="Sincronizar" title="${off ? 'Sem internet' : 'Sincronizar'}">${off ? ICON.cloudOff : ICON.sync}${pend ? `<span class="sync-dot">${pend}</span>` : ''}</button>
    </div></div></header>`;
}
function navbar(active) {
  const pendM = isMaster() ? solicAll().filter(s => s.Status === 'Pendente').length : 0;
  const it = [['inicio', 'Lançar', ICON.plus], ['cal', 'Calendário', ICON.cal], ['lista', 'Lançamentos', ICON.list]].concat(isMaster() ? [['painel', 'Painel', ICON.chart]] : []).concat([['conta', 'Conta', ICON.user]]);
  return `<nav class="nav" style="grid-template-columns:repeat(${it.length},1fr)">${it.map(([k, l, i]) => `<button data-tab="${k}" ${active === k ? 'aria-current="page"' : ''}>${i}<span>${l}</span>${k === 'lista' && pendM ? `<b class="nbadge" aria-label="${pendM} pedidos pendentes">${pendM}</b>` : ''}</button>`).join('')}</nav>`;
}
const vazio = (msg, icon = ICON.receipt) => `<div class="empty">${icon}<div>${esc(msg)}</div></div>`;
const carregando = () => '<div class="loading"><div>Carregando…</div></div>';

function lancTitulo(l) {
  if (l.cat === 'Venda') return money(l.valor) + ' · ' + formaCurta(l.forma);
  if (l.cat === 'Venda perdida') return 'Venda perdida' + (l.motivo ? ' · ' + l.motivo : '');
  return l.cat;
}
function lancRow(l, o = {}) {
  const p = [l.hora.slice(11, 16)];
  if (o.dia) p.unshift(dBR(l.data).slice(0, 5));
  if (l.cat === 'Venda') p.push(l.tipo === CF ? 'CF nº ' + (l.num || '—') : '');
  if (l.genero || l.faixa) p.push([l.genero, l.faixa].filter(Boolean).join(' '));
  if (l.auditor) p.push(l.auditor.split(' ')[0]);
  const tags = (l.cat === 'Venda' && l.tipo === SD ? '<span class="pill warn">Sem documento</span> ' : '') +
    (l._error ? '<span class="pill bad">Não aceito</span> ' : l._pending ? '<span class="pill mut">Na fila</span> ' : '') +
    (solicPendente(l.id) ? '<span class="pill warn">Pedido pendente</span> ' : '');
  return `<button class="row" data-lanc="${esc(l.id)}"><div><div class="t">${esc(lancTitulo(l))}</div>
    <div class="s">${tags}${esc(p.filter(Boolean).join(' · '))}${l.obs ? ' — ' + esc(l.obs) : ''}</div></div>
    <div class="v muted">${ICON.right.replace('<svg', '<svg style="width:18px;height:18px"')}</div></button>`;
}
function hbar(nome, valor, frac, extra = '') {
  return `<div class="hbar"><span class="n">${esc(nome)}${extra}</span><span class="val num">${valor}</span><span class="bar"><i style="width:${Math.max(2, Math.round(frac * 100))}%"></i></span></div>`;
}
function kpisHtml(r, { perfil = true } = {}) {
  return `<div class="kpis">
    <div class="kpi"><span class="l">Vendas</span><span class="v num">${money(r.total)}</span><span class="d muted">${int(r.n)} venda${r.n === 1 ? '' : 's'}${r.n ? ' · média ' + money(r.total / r.n) : ''}</span></div>
    <div class="kpi${r.sdN ? ' alerta' : ''}"><span class="l">Sem documento</span><span class="v num">${money(r.sdV)}</span><span class="d${r.sdN ? '' : ' muted'}">${int(r.sdN)} venda${r.sdN === 1 ? '' : 's'} · ${pct(r.sdV, r.total)} do total</span></div>
    ${perfil ? `<div class="kpi"><span class="l">Visitas</span><span class="v num">${int(r.visitas)}</span></div>
    <div class="kpi"><span class="l">Vendas perdidas</span><span class="v num">${int(r.perdidas)}</span></div>` : ''}
  </div>`;
}
function matrizHtml(vendas, { clicavel = false } = {}) {
  if (!vendas.length) return '<div class="card" style="margin:0 16px">' + vazio('Nenhuma venda lançada.') + '</div>';
  const m = matriz(vendas);
  const tot = vendas.reduce((s, v) => s + (+v.valor || 0), 0);
  return `<div class="mx-wrap"><table class="mx">
    <thead><tr><th>Hora</th>${m.formas.map(f => `<th>${esc(formaCurta(f))}</th>`).join('')}<th>Total</th><th>Qtd</th></tr></thead>
    <tbody>${m.horas.map(h => `<tr${clicavel ? ` data-hora="${h}" tabindex="0"` : ''}><td>${pad(h)}h</td>${m.formas.map(f => { const x = m.cel[h + '|' + f]; return x ? `<td>${dec(x)}</td>` : '<td class="z">·</td>'; }).join('')}<td class="tot">${dec(m.lin[h])}</td><td class="q">${m.qt[h]}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td>${m.formas.map(f => `<td>${dec(m.col[f])}</td>`).join('')}<td>${dec(tot)}</td><td>${vendas.length}</td></tr></tfoot>
  </table></div>`;
}
function cuponsNota(r, faixa = true) {
  if (!r.cfN) return '';
  return `<p class="note">Cupons CF / NF: ${int(r.cfN)}${faixa && r.min != null ? `, do nº ${r.min} ao nº ${r.max}` : ''}.${r.pulados ? ` <b style="color:var(--warn)">${int(r.pulados)} número${r.pulados === 1 ? '' : 's'} pulado${r.pulados === 1 ? '' : 's'} na sequência.</b>` : ' Sequência sem saltos.'}</p>`;
}

/* ============================ Telas ============================ */
const VIEWS = {};

VIEWS.setup = () => ({
  html: `<div class="login gutter"><div class="brand-mark"><span class="logo">${SELO('#fff')}</span><h1>Auditoria em Loja</h1><p class="muted" style="margin:0">Cole o endereço do servidor (App da Web do Apps Script), que termina em <b>/exec</b>.</p></div>
    <div class="field"><label for="setUrl">Endereço do servidor</label><input class="input" id="setUrl" inputmode="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(S.apiUrl)}"></div>
    <div id="setErr"></div><button class="btn primary" data-act="setupGo">Continuar</button></div>`
});

VIEWS.login = () => {
  const list = S.auditoresLogin;
  return {
    form: true,
    html: `<div class="login gutter"><div class="brand-mark"><span class="logo">${SELO('#fff')}</span><h1>Auditoria em Loja</h1><img class="shop-logo" src="icons/shopping-logo.png" alt="Teresópolis Shopping"></div>
      <div class="field"><span class="label">Quem é você?</span><div class="who">${list.length ? list.map(a => `<button data-who="${esc(a.nome)}" aria-pressed="${S.ui.loginSel === a.nome}"><span class="avatar">${esc(initials(a.nome))}</span>${esc(a.nome)}</button>`).join('') : '<div class="muted">Carregando a lista de auditores…</div>'}</div></div>
      <div class="field"><label for="senha">Senha</label><input class="input" id="senha" type="password" autocomplete="current-password"></div>
      <div id="loginErr"></div><button class="btn primary" data-act="loginGo" style="min-height:52px;font-size:16px">Entrar</button>
      <p class="muted" style="font-size:12.5px;margin:0">Versão ${APP_VERSION}. Esqueceu a senha? Peça ao master para definir uma nova.</p></div>`
  };
};

/* ---------- Lançar (início) ---------- */
VIEWS.inicio = () => {
  const hoje = today(), mes = hoje.slice(0, 7), loja = lojaDoMes(mes);
  const head = topbar({ title: loja ? loja.NomeFantasia : 'Auditoria em Loja', sub: (loja ? 'Loja de ' + MESES[+mes.slice(5) - 1] + ' · ' : '') + diaLongo(hoje) });
  if (!S.data) return { html: head + '<main class="wrap">' + carregando() + '</main>' + navbar('inicio') };
  const erros = S.queue.filter(q => q.error).length;
  let corpo;
  if (!loja) {
    corpo = `<div class="section gutter"><div class="alert warn">${isMaster() ? 'Escolha a loja que será auditada em ' + mesNome(mes) + ' para liberar os lançamentos.' : 'O master ainda não escolheu a loja auditada em ' + mesNome(mes) + '. Fale com ele para liberar os lançamentos.'}
      ${isMaster() ? `<button data-act="lojaMesForm" data-mes="${mes}">Escolher a loja do mês</button>` : ''}</div></div>`;
  } else {
    const dia = doDia(hoje, loja.IdLoja), r = resumo(dia);
    corpo = `<div class="section gutter"><div class="cats">
        <button class="cat main" data-novo="Venda">${ICON.receipt}<span>Venda</span><small>Cupom, forma de pagamento e valor</small></button>
        <button class="cat" data-novo="Visita">${ICON.eye}<span>Visita</span><small>Entrou e não comprou</small></button>
        <button class="cat" data-novo="Venda perdida">${ICON.lost}<span>Venda perdida</span><small>Queria comprar e não levou</small></button>
        <button class="cat wide" data-novo="Anotação">${ICON.note}<span>Anotação<small>Nota cancelada, reserva, ocorrência no caixa</small></span></button>
      </div></div>
      <div class="section gutter"><h2 class="h2">Hoje<button class="linkbtn" data-act="verDia" data-dia="${hoje}">Resumo por horário</button></h2>${kpisHtml(r)}</div>
      <div class="section"><h2 class="h2 gutter">Últimos lançamentos<button class="linkbtn" data-tab="lista">Ver todos</button></h2>
        ${dia.length ? `<div class="list">${dia.slice(0, 6).map(l => lancRow(l)).join('')}</div>` : '<div class="card" style="margin:0 16px">' + vazio('Nenhum lançamento hoje.') + '</div>'}</div>`;
  }
  return {
    html: head + `<main class="wrap">
      ${erros ? `<div class="section gutter"><div class="alert bad">${erros} item(ns) não foram aceitos pela planilha.<button data-tab="conta">Ver e resolver</button></div></div>` : ''}
      ${corpo}</main>` + navbar('inicio')
  };
};

/* ---------- Formulário de lançamento ---------- */
function opcoes(id, rotulo, grp, itens, sel, { req = true, curto = false, dica = '' } = {}) {
  return `<div class="field" id="${id}"><span class="label">${rotulo}${req ? '<span class="req" style="color:var(--brand)"> *</span>' : ''}${dica ? `<span class="opt-tag" id="${id}Dica">${dica}</span>` : `<span class="opt-tag" id="${id}Dica"></span>`}</span>
    <div class="opts" role="group">${itens.map(x => `<button type="button" data-grp="${grp}" data-val="${esc(x)}" aria-pressed="${sel === x}">${esc(curto ? formaCurta(x) : x)}</button>`).join('')}</div></div>`;
}
const grpVal = g => { const b = $(`[data-grp="${g}"][aria-pressed="true"]`); return b ? b.dataset.val : ''; };
function fieldErr(id, msg) {
  const f = $('#' + id); if (!f) return;
  f.classList.toggle('invalid', !!msg);
  let e = f.querySelector('.err');
  if (msg) { if (!e) { e = document.createElement('div'); e.className = 'err'; f.appendChild(e); } e.textContent = msg; }
  else if (e) e.remove();
}
function ultimoCupom(idLoja, mes, ignorar) {
  const l = merged().list.find(x => x.idLoja === idLoja && x.data.startsWith(mes) && x.cat === 'Venda' && x.tipo === CF && x.num && x.id !== ignorar);
  return l ? +l.num : null;
}
function formSync() {
  const fn = $('#fdNum'); if (fn) fn.hidden = grpVal('tipo') !== CF;
  const on = ehOnline(grpVal('forma')) && $('#fdForma');
  ['fdGenero', 'fdFaixa'].forEach(id => { const d = $('#' + id + 'Dica'); if (d) d.textContent = on ? 'opcional em venda online' : ''; });
}

VIEWS.form = p => {
  const alvo = p.edit || p.pedido;
  const base = alvo ? merged().byId.get(alvo) : null;
  if (alvo && !base) return { html: topbar({ title: 'Lançamento', backBtn: true }) + '<main class="wrap">' + vazio('Lançamento não encontrado.') + '</main>' };
  const cat = base ? base.cat : p.cat;
  const hoje = today();
  const loja = base ? { IdLoja: base.idLoja, NomeFantasia: base.loja } : lojaDoMes(hoje.slice(0, 7));
  const ult = cat === 'Venda' && loja ? ultimoCupom(loja.IdLoja, (base ? base.data : hoje).slice(0, 7), alvo) : null;
  const b = base || {};
  const venda = cat === 'Venda', perfil = cat !== 'Anotação';
  const numVal = base ? (b.num || '') : (ult ? ult + 1 : '');
  const titulo = p.pedido ? 'Pedir alteração' : p.edit ? 'Editar ' + cat.toLowerCase() : 'Nova ' + cat.toLowerCase();
  return {
    form: true,
    html: topbar({ title: titulo, sub: loja ? loja.NomeFantasia : '', backBtn: true }) + `<main class="wrap form-main"><div class="fields gutter">
      ${p.pedido ? '<div class="alert warn">Corrija os campos e explique o motivo. O lançamento só muda depois que o master aprovar.</div>' : ''}
      ${venda ? opcoes('fdTipo', 'Documento', 'tipo', [CF, SD], b.tipo || '') : ''}
      ${venda ? `<div class="field" id="fdNum" ${b.tipo === CF ? '' : 'hidden'}><label for="fNum">Número do cupom ou nota<span class="req"> *</span></label>
        <input class="input num" id="fNum" inputmode="numeric" autocomplete="off" value="${esc(numVal)}">
        <div class="hint">${ult ? (base ? 'Último cupom lançado: nº ' + ult + '.' : 'Sugestão: o último lançado foi o nº ' + ult + '. Confira com o cupom.') : 'Digite o número impresso no cupom.'}</div></div>` : ''}
      ${venda ? opcoes('fdForma', 'Forma de pagamento', 'forma', lista('formas').concat(b.forma && lista('formas').indexOf(b.forma) < 0 ? [b.forma] : []), b.forma || '') : ''}
      ${venda ? `<div class="field" id="fdValor"><label for="fValor">Valor<span class="req"> *</span></label>
        <input class="input money num" id="fValor" inputmode="numeric" autocomplete="off" placeholder="R$ 0,00" value="${b.valor !== '' && b.valor != null ? money(b.valor) : ''}"></div>` : ''}
      ${cat === 'Venda perdida' ? opcoes('fdMotivo', 'Motivo', 'motivo', lista('motivos').concat(b.motivo && lista('motivos').indexOf(b.motivo) < 0 ? [b.motivo] : []), b.motivo || '') : ''}
      ${perfil ? opcoes('fdGenero', 'Gênero', 'genero', lista('generos'), b.genero || '') : ''}
      ${perfil ? opcoes('fdFaixa', 'Faixa etária', 'faixa', lista('faixas'), b.faixa || '') : ''}
      <div class="field" id="fdObs"><label for="fObs">${cat === 'Anotação' ? 'Anotação<span class="req"> *</span>' : 'Observação'}</label>
        <textarea class="input" id="fObs" maxlength="500" placeholder="${cat === 'Anotação' ? 'Ex.: nota nº 45169 foi cancelada' : venda ? 'Ex.: motivo de não ter emitido o cupom' : 'Ex.: o que o cliente procurava'}">${esc(b.obs || '')}</textarea></div>
      <div class="field" id="fdHora"><span class="label">Data e hora</span><div class="two">
        <input class="input" id="fData" type="date" value="${(base ? base.data : hoje)}" max="${hoje}" ${isMaster() && !p.pedido ? '' : 'readonly disabled'}>
        <input class="input" id="fHora" type="time" value="${base ? base.hora.slice(11, 16) : nowHM()}"></div>
        <div class="hint">${base ? '' : 'Se o lançamento está sendo feito depois, ajuste a hora em que a venda aconteceu.'}</div></div>
      ${p.pedido ? `<div class="field" id="fdMot"><label for="fMot">Motivo do pedido<span class="req"> *</span></label><textarea class="input" id="fMot" maxlength="500" placeholder="Ex.: digitei o valor errado"></textarea></div>` : ''}
      <div id="dupBox"></div>
    </div></main>
    <div class="formbar"><button class="btn" data-act="back">Cancelar</button><button class="btn primary" data-act="saveForm">${p.pedido ? 'Enviar pedido' : 'Salvar'}</button></div>`,
    mount() { formSync(); S.dupOk = false; S.horaIni = $('#fHora').value; }
  };
};

function saveForm() {
  const p = cur().p, alvo = p.edit || p.pedido;
  const base = alvo ? merged().byId.get(alvo) : null;
  const cat = base ? base.cat : p.cat;
  const venda = cat === 'Venda';
  let ok = true;
  const erro = (id, msg) => { fieldErr(id, msg); if (msg && ok) { ok = false; const f = $('#' + id); if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  const n = { Id: base ? base.id : uid(), Categoria: cat, Tipo: '', Numero: '', FormaPagamento: '', Valor: '', Genero: '', FaixaEtaria: '', Motivo: '', Observacao: ($('#fObs').value || '').trim() };
  if (venda) {
    n.Tipo = grpVal('tipo'); erro('fdTipo', n.Tipo ? '' : 'Escolha CF / NF ou Sem Documento.');
    if (n.Tipo === CF) {
      const num = ($('#fNum').value || '').trim();
      if (!/^\d{1,12}$/.test(num) || +num <= 0) erro('fdNum', 'Informe o número do cupom.'); else { n.Numero = +num; erro('fdNum', ''); }
    }
    n.FormaPagamento = grpVal('forma'); erro('fdForma', n.FormaPagamento ? '' : 'Escolha a forma de pagamento.');
    const v = parseMoney($('#fValor').value);
    if (v == null) erro('fdValor', 'Informe o valor.');
    else if (v === 0 && !/troca zerada/i.test(n.FormaPagamento)) erro('fdValor', 'Informe o valor da venda.');
    else { n.Valor = v; erro('fdValor', ''); }
  }
  if (cat === 'Venda perdida') { n.Motivo = grpVal('motivo'); erro('fdMotivo', n.Motivo ? '' : 'Escolha o motivo.'); }
  if (cat !== 'Anotação') {
    n.Genero = grpVal('genero'); n.FaixaEtaria = grpVal('faixa');
    const exige = !(venda && ehOnline(n.FormaPagamento));
    erro('fdGenero', exige && !n.Genero ? 'Escolha o gênero.' : '');
    erro('fdFaixa', exige && !n.FaixaEtaria ? 'Escolha a faixa etária.' : '');
  } else erro('fdObs', n.Observacao ? '' : 'Escreva a anotação.');
  const data = $('#fData').value || today(), hm = $('#fHora').value;
  if (!/^\d{2}:\d{2}$/.test(hm)) erro('fdHora', 'Informe a hora.');
  else {
    // hora sem ajuste manual: usa os segundos de agora (ou os originais, na edição)
    const seg = hm === S.horaIni ? (base ? base.hora.slice(17, 19) || '00' : pad(new Date().getSeconds())) : '00';
    n.HoraRegistro = data + ' ' + hm + ':' + seg;
    const agora = today() + ' ' + nowHM() + ':59';
    if (n.HoraRegistro > agora) erro('fdHora', 'A data e a hora não podem ser futuras.');
    else if (base && data.slice(0, 7) !== base.data.slice(0, 7)) erro('fdHora', 'O lançamento não pode mudar de mês.');
    else erro('fdHora', '');
  }
  let motivo = '';
  if (p.pedido) { motivo = ($('#fMot').value || '').trim(); erro('fdMot', motivo ? '' : 'Explique o motivo do pedido.'); }
  if (!ok) return;

  // cupom repetido na mesma loja: avisa antes de gravar
  if (venda && n.Numero && !S.dupOk) {
    const idLoja = base ? base.idLoja : (lojaDoMes(data.slice(0, 7)) || {}).IdLoja;
    const d = merged().list.find(x => x.idLoja === idLoja && x.cat === 'Venda' && +x.num === n.Numero && x.id !== n.Id);
    if (d) {
      $('#dupBox').innerHTML = `<div class="alert warn">O cupom nº ${n.Numero} já foi lançado em ${dtBR(d.hora)} (${money(d.valor)}, ${esc(formaCurta(d.forma))}). Confira o número.
        <button data-act="dupOk">É outro cupom com o mesmo número: salvar assim mesmo</button></div>`;
      return $('#dupBox').scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  if (p.pedido) {
    const iguais = base.hora === n.HoraRegistro && ['tipo|Tipo', 'num|Numero', 'forma|FormaPagamento', 'valor|Valor', 'genero|Genero', 'faixa|FaixaEtaria', 'motivo|Motivo', 'obs|Observacao'].every(k => { const [a, b] = k.split('|'); return String(base[a] == null ? '' : base[a]) === String(n[b]); });
    if (iguais) return toast('Nenhum campo foi alterado.');
    const novos = Object.assign({}, n); delete novos.Id;
    enqueue({ type: 'solic', solic: { id_solicitacao: uid(), LancamentoId: base.id, Tipo: 'Alteração', Novos: novos, Motivo: motivo, Loja: base.loja } });
    toast('Pedido enviado ao master.');
  } else {
    enqueue({ type: 'lanc', lanc: n });
    toast(base ? 'Alteração salva.' : venda ? 'Venda de ' + money(n.Valor) + ' lançada.' : cat + ' lançada.');
  }
  back();
}

/* ---------- Detalhe do lançamento ---------- */
VIEWS.lanc = p => {
  const l = merged().byId.get(p.id);
  if (!l) return { html: topbar({ title: 'Lançamento', backBtn: true }) + '<main class="wrap">' + vazio('Este lançamento não existe mais.') + '</main>' };
  const sp = solicPendente(l.id);
  const linhas = [['Loja', l.loja], ['Data e hora', dtBR(l.hora)], ['Lançado por', l.auditor || '(não informado)']];
  if (l.cat === 'Venda') linhas.push(['Documento', l.tipo + (l.num ? ' nº ' + l.num : '')], ['Forma de pagamento', l.forma || '—']);
  if (l.motivo) linhas.push(['Motivo', l.motivo]);
  if (l.cat !== 'Anotação') linhas.push(['Gênero', l.genero || '—'], ['Faixa etária', l.faixa || '—']);
  linhas.push(['Observação', l.obs || '—']);
  return {
    html: topbar({ title: l.cat, sub: l.loja, backBtn: true }) + `<main class="wrap">
      <div class="big-value gutter">${l.cat === 'Venda' ? `<span class="v num">${money(l.valor)}</span>` : `<span class="v" style="font-size:26px">${esc(lancTitulo(l))}</span>`}
        <span>${l.cat === 'Venda' && l.tipo === SD ? '<span class="pill warn">Sem documento</span>' : ''}</span></div>
      ${l._error ? `<div class="section gutter"><div class="alert bad">A planilha não aceitou: ${esc(l._error)}<span><button data-act="retry" data-qid="${l._qid}">Tentar de novo</button> &nbsp; <button data-act="descartar" data-qid="${l._qid}">Descartar</button></span></div></div>`
        : l._pending ? '<div class="section gutter"><div class="alert warn">Aguardando envio para a planilha.</div></div>' : ''}
      ${sp ? `<div class="section gutter"><div class="alert warn">Há um pedido de ${sp.Tipo.toLowerCase()} aguardando o master${sp.Proposto ? ': ' + esc(sp.Proposto) : ''}.${isMaster() && !sp._pending ? `<button data-solic="${esc(sp.id_solicitacao)}">Abrir o pedido</button>` : ''}</div></div>` : ''}
      <dl class="dl" style="margin-top:14px">${linhas.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
      ${l._pending ? '' : isMaster() ? `<div class="section gutter two"><button class="btn" data-act="editar" data-id="${esc(l.id)}">Editar</button><button class="btn danger" data-act="excluir" data-id="${esc(l.id)}">Excluir</button></div>`
        : sp ? '' : `<div class="section gutter two"><button class="btn" data-act="pedirAlt" data-id="${esc(l.id)}">Pedir alteração</button><button class="btn danger" data-act="excluir" data-id="${esc(l.id)}">Pedir exclusão</button></div>
          <p class="note">Lançamentos não podem ser alterados nem apagados pelo auditor. O pedido vai para o master aprovar.</p>`}
    </main>`
  };
};

VIEWS.excluir = p => {
  const l = merged().byId.get(p.id);
  if (!l) return { html: topbar({ title: 'Excluir', backBtn: true }) + '<main class="wrap">' + vazio('Este lançamento não existe mais.') + '</main>' };
  const m = isMaster();
  return {
    form: true,
    html: topbar({ title: m ? 'Excluir lançamento' : 'Pedir exclusão', backBtn: true }) + `<main class="wrap form-main"><div class="fields gutter">
      <div class="card" style="padding:14px"><b>${esc(lancTitulo(l))}</b><div class="muted">${esc(dtBR(l.hora))} · ${esc(l.loja)}${l.auditor ? ' · ' + esc(l.auditor) : ''}</div></div>
      ${m ? '<div class="alert bad">O lançamento será apagado da planilha. A exclusão fica registrada no histórico, com os dados que ele tinha.</div>'
        : `<div class="field" id="fdMot"><label for="fMot">Motivo do pedido<span class="req"> *</span></label><textarea class="input" id="fMot" maxlength="500" placeholder="Ex.: lancei a mesma venda duas vezes"></textarea></div>`}
      <div id="exErr"></div></div></main>
    <div class="formbar"><button class="btn" data-act="back">Cancelar</button><button class="btn danger solid" data-act="confExcluir" data-id="${esc(l.id)}">${m ? 'Excluir' : 'Enviar pedido'}</button></div>`
  };
};
async function confExcluir(id) {
  const l = merged().byId.get(id); if (!l) return back();
  if (!isMaster()) {
    const motivo = ($('#fMot').value || '').trim();
    if (!motivo) return fieldErr('fdMot', 'Explique o motivo do pedido.');
    enqueue({ type: 'solic', solic: { id_solicitacao: uid(), LancamentoId: id, Tipo: 'Exclusão', Motivo: motivo, Loja: l.loja } });
    toast('Pedido enviado ao master.');
    return back();
  }
  const btn = $('[data-act="confExcluir"]'); btn.disabled = true;
  try {
    await api('excluirLancamento', { id });
    removerLanc(id); await persist();
    toast('Lançamento excluído.');
    S.stack.splice(S.stack.length - 2, 1);   // tira a tela de detalhe do lançamento apagado
    back();
  } catch (e) { $('#exErr').innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; btn.disabled = false; }
}

/* ---------- Calendário ---------- */
function calEstado() {
  const mes = S.ui.calMes || today().slice(0, 7);
  const ljs = lojasNoMes(mes);
  let idLoja = S.ui.calLoja && ljs.some(l => l.IdLoja === S.ui.calLoja) ? S.ui.calLoja : lojaPadrao(mes);
  return { mes, ljs, idLoja };
}
VIEWS.cal = () => {
  const head = topbar({ title: 'Calendário', sub: 'Resumo por dia, horário e forma de pagamento' });
  if (!S.data) return { html: head + '<main class="wrap">' + carregando() + '</main>' + navbar('cal') };
  const { mes, ljs, idLoja } = calEstado();
  ensureMes(mes);
  const hoje = today();
  const lst = doMes(mes, idLoja), rm = resumo(lst);
  const dias = {};
  lst.forEach(l => { const d = dias[l.data] || (dias[l.data] = { v: 0, n: 0, sd: false }); d.n++; if (l.cat === 'Venda') { d.v += +l.valor || 0; if (l.tipo === SD) d.sd = true; } });
  let dia = S.ui.calDia && S.ui.calDia.startsWith(mes) ? S.ui.calDia : (mes === hoje.slice(0, 7) ? hoje : '');
  const first = new Date(+mes.slice(0, 4), +mes.slice(5, 7) - 1, 1).getDay();
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span class="day blank"></span>';
  for (let d = 1; d <= daysIn(mes); d++) {
    const k = mes + '-' + pad(d), x = dias[k];
    cells += `<button class="day${x ? ' has' : ''}${x && x.sd ? ' sd' : ''}${k === hoje ? ' today' : ''}${k === dia ? ' sel' : ''}${k > hoje ? ' fut' : ''}" data-dia="${k}" aria-label="${d} de ${MESES[+mes.slice(5) - 1]}${x ? ', ' + money(x.v) + ', ' + x.n + ' lançamentos' + (x.sd ? ', com venda sem documento' : '') : ''}">${d}${x ? `<small>${x.v ? kShort(x.v) : '&nbsp;'}</small><em>${x.n}</em>` : ''}</button>`;
  }
  const loja = lojaById(idLoja);
  let det = '';
  if (dia) {
    const ld = lst.filter(l => l.data === dia), r = resumo(ld);
    det = `<div class="section gutter"><h2 class="h2">${esc(diaLongo(dia))}${ld.length ? `<button class="linkbtn" data-act="verLista" data-dia="${dia}">Ver os ${ld.length} lançamentos</button>` : ''}</h2>${kpisHtml(r)}</div>
      <div class="section"><h2 class="h2 gutter">Por horário e forma de pagamento</h2>${matrizHtml(r.vendas, { clicavel: true })}
        ${r.vendas.length ? '<p class="note">Toque numa hora para ver os lançamentos dela.</p>' : ''}${cuponsNota(r)}</div>`;
  } else det = '<p class="note" style="padding-bottom:8px">Toque num dia para ver o resumo por horário e forma de pagamento.</p>';
  return {
    html: head + `<main class="wrap">
      ${ljs.length > 1 || isMaster() ? `<div class="chips gutter">${ljs.map(l => `<button class="chip" data-callj="${esc(l.IdLoja)}" aria-pressed="${l.IdLoja === idLoja}">${esc(l.NomeFantasia)}</button>`).join('')}</div>` : ''}
      <div class="section gutter"><div class="card cal">
        <div class="cal-head"><button class="cal-nav" data-act="calMes" data-mes="${addMonth(mes, -1)}" aria-label="Mês anterior">${ICON.left}</button>
          <strong>${mesNome(mes)}</strong><button class="cal-nav" data-act="calMes" data-mes="${addMonth(mes, 1)}" aria-label="Próximo mês" ${mes >= hoje.slice(0, 7) ? 'disabled style="opacity:.3"' : ''}>${ICON.right}</button></div>
        <div class="cal-grid">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(x => `<span class="cal-dow">${x}</span>`).join('')}${cells}</div>
        <div class="legend"><span><i style="background:var(--soft)"></i>Com lançamentos</span><span><i style="background:var(--warn);border-radius:50%"></i>Teve venda sem documento</span></div>
      </div>
      ${S.loadingMes === mes ? '<p class="note">Carregando o mês…</p>' : `<p class="note" style="padding-inline:0">${loja ? esc(loja.NomeFantasia) + ' em ' + mesNome(mes) + ': ' : ''}<b>${money(rm.total)}</b> em ${int(rm.n)} vendas${rm.sdN ? `, sendo <b style="color:var(--warn)">${money(rm.sdV)} sem documento</b>` : ''}.</p>`}
      ${isMaster() && lst.length ? `<button class="btn" style="margin-top:10px;width:100%" data-act="excel" data-mes="${mes}" data-loja="${esc(idLoja)}">${ICON.down}Baixar o mês em Excel</button>` : ''}
      </div>${det}</main>` + navbar('cal')
  };
};

/* ---------- Lançamentos (lista do dia) e pedidos ---------- */
function solicPill(s) {
  return s._error ? '<span class="pill bad">Não aceito</span>' : s._pending ? '<span class="pill mut">Na fila</span>' : s.Status === 'Pendente' ? '<span class="pill warn">Pendente</span>' : s.Status === 'Aprovada' ? '<span class="pill ok">Aprovado</span>' : '<span class="pill bad">Recusado</span>';
}
VIEWS.lista = p => {
  const sub = !!p.dia;                       // aberta a partir do calendário: dia (e hora) fixos
  const head = topbar({ title: sub ? dBR(p.dia) + (p.hora != null ? ' · ' + pad(p.hora) + 'h' : '') : 'Lançamentos', sub: sub ? (lojaById(p.loja) || {}).NomeFantasia || '' : '', backBtn: sub });
  if (!S.data) return { html: head + '<main class="wrap">' + carregando() + '</main>' + (sub ? '' : navbar('lista')) };
  const pend = solicAll().filter(s => s.Status === 'Pendente').length;
  if (!sub && S.ui.listaAba === 'ped') {
    const ss = solicAll().slice().sort((a, b) => (a.DataPedido < b.DataPedido ? 1 : -1));
    return {
      html: head + `<main class="wrap"><div class="section gutter">${abasLista(pend)}</div>
        ${ss.length ? `<div class="list">${ss.map(s => `<button class="row" ${s._pending ? '' : `data-solic="${esc(s.id_solicitacao)}"`}><div><div class="t">${esc(s.Tipo)} · ${esc(s.Loja || '')}</div>
          <div class="s">${solicPill(s)} ${esc(dtBR(s.DataPedido))} · ${esc(s.Solicitante || '')} — ${esc(s.Tipo === 'Exclusão' ? s.Atual : s.Proposto)}</div></div><div class="v muted"></div></button>`).join('')}</div>`
          : vazio(isMaster() ? 'Nenhum pedido de alteração.' : 'Você ainda não fez pedidos de alteração.', ICON.note)}
      </main>` + navbar('lista')
    };
  }
  const dia = sub ? p.dia : (S.ui.listaDia || today());
  const mes = dia.slice(0, 7);
  ensureMes(mes);
  const idLoja = sub ? p.loja : '';
  let ls = doDia(dia, idLoja);
  if (p.hora != null) ls = ls.filter(l => l.cat === 'Venda' && +l.hora.slice(11, 13) === +p.hora);
  const f = sub ? 'todos' : S.ui.listaFiltro;
  const cont = { todos: ls.length, vendas: 0, sd: 0, visitas: 0, perdidas: 0, anot: 0 };
  ls.forEach(l => { if (l.cat === 'Venda') { cont.vendas++; if (l.tipo === SD) cont.sd++; } else if (l.cat === 'Visita') cont.visitas++; else if (l.cat === 'Venda perdida') cont.perdidas++; else cont.anot++; });
  const passa = l => f === 'todos' || (f === 'vendas' && l.cat === 'Venda') || (f === 'sd' && l.cat === 'Venda' && l.tipo === SD) || (f === 'visitas' && l.cat === 'Visita') || (f === 'perdidas' && l.cat === 'Venda perdida') || (f === 'anot' && l.cat === 'Anotação');
  const q = norm(S.ui.busca);
  const vis = ls.filter(l => passa(l) && (!q || sub || norm([l.num, l.obs, l.forma, l.auditor, l.motivo, dec(l.valor)].join(' ')).includes(q)));
  const r = resumo(vis);
  return {
    html: head + `<main class="wrap">
      ${sub ? '' : `<div class="section gutter">${abasLista(pend)}</div>
      <div class="gutter" style="display:flex;gap:8px;align-items:center;padding-top:10px"><label class="date-chip">${ICON.cal.replace('<svg', '<svg style="width:16px;height:16px"')}${dia === today() ? 'Hoje' : esc(diaLongo(dia))}<input type="date" id="listaDia" value="${dia}" max="${today()}" aria-label="Escolher o dia"></label>
        <input class="input" id="busca" placeholder="Buscar nº do cupom, valor…" value="${esc(S.ui.busca)}" style="min-height:40px;padding:8px 12px;font-size:15px;flex:1;min-width:0"></div>
      <div class="chips gutter">${[['todos', 'Todos'], ['vendas', 'Vendas'], ['sd', 'Sem documento'], ['visitas', 'Visitas'], ['perdidas', 'Perdidas'], ['anot', 'Anotações']].map(([k, t]) => `<button class="chip" data-lfiltro="${k}" aria-pressed="${f === k}">${t}<b>${cont[k]}</b></button>`).join('')}</div>`}
      <div class="group-h"><span>${vis.length} lançamento${vis.length === 1 ? '' : 's'}</span><span class="num">${r.n ? money(r.total) : ''}</span></div>
      ${S.loadingMes === mes ? carregando() : vis.length ? `<div class="list">${vis.map(l => lancRow(l)).join('')}</div>` : vazio('Nenhum lançamento' + (f !== 'todos' || q ? ' com esse filtro.' : ' neste dia.'))}
    </main>` + (sub ? '' : navbar('lista'))
  };
};
const abasLista = pend => `<div class="seg"><button data-laba="lanc" aria-pressed="${S.ui.listaAba !== 'ped'}">Lançamentos</button><button data-laba="ped" aria-pressed="${S.ui.listaAba === 'ped'}">Pedidos${pend ? ' (' + pend + ')' : ''}</button></div>`;

VIEWS.solic = p => {
  const s = solicAll().find(x => x.id_solicitacao === p.id);
  if (!s) return { html: topbar({ title: 'Pedido', backBtn: true }) + '<main class="wrap">' + vazio('Pedido não encontrado.') + '</main>' };
  const l = merged().byId.get(s.LancamentoId);
  const pode = isMaster() && s.Status === 'Pendente';
  return {
    form: pode,
    html: topbar({ title: 'Pedido de ' + s.Tipo.toLowerCase(), sub: s.Loja, backBtn: true }) + `<main class="wrap${pode ? ' form-main' : ''}">
      <div class="section gutter">${solicPill(s)}</div>
      <dl class="dl"><dt>Pedido por</dt><dd>${esc(s.Solicitante)} em ${esc(dtBR(s.DataPedido))}</dd>
        <dt>Lançamento</dt><dd>${esc(s.Atual)}</dd>
        ${s.Tipo === 'Alteração' ? `<dt>Mudança pedida</dt><dd>${esc(s.Proposto).replace(/; /g, '<br>')}</dd>` : '<dt>Pedido</dt><dd>Apagar o lançamento</dd>'}
        <dt>Motivo</dt><dd>${esc(s.Motivo)}</dd>
        ${s.Status !== 'Pendente' ? `<dt>Resolvido por</dt><dd>${esc(s.ResolvidoPor)} em ${esc(dtBR(s.DataResolucao))}</dd><dt>Resposta</dt><dd>${esc(s.Resposta || '—')}</dd>` : ''}</dl>
      ${l ? `<div class="section gutter"><button class="btn" data-lanc="${esc(l.id)}" style="width:100%">Abrir o lançamento</button></div>` : ''}
      ${pode ? `<div class="fields gutter"><div class="field"><label for="sResp">Resposta ao auditor (opcional)</label><textarea class="input" id="sResp" maxlength="300"></textarea></div><div id="sErr"></div></div>` : ''}
    </main>${pode ? `<div class="formbar"><button class="btn danger" data-act="resolver" data-id="${esc(s.id_solicitacao)}" data-ok="0">Recusar</button><button class="btn primary" data-act="resolver" data-id="${esc(s.id_solicitacao)}" data-ok="1">Aprovar</button></div>` : ''}`
  };
};
async function resolver(id, aprovar) {
  const bts = $$('[data-act="resolver"]'); bts.forEach(b => { b.disabled = true; });
  try {
    const r = await api('resolverSolicitacao', { id, aprovar, resposta: ($('#sResp').value || '').trim() });
    if (r.excluido) removerLanc(r.excluido);
    if (r.row) guardarLanc(rowsToLancs(r.cols, [r.row])[0]);
    if (r.solicitacao) guardarSolic(r.solicitacao);
    await persist();
    toast(aprovar ? 'Pedido aprovado.' : 'Pedido recusado.');
    back();
  } catch (e) { $('#sErr').innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; bts.forEach(b => { b.disabled = false; }); }
}

/* ---------- Painel (master) ---------- */
function painelEstado() {
  const mes = S.ui.pMes || today().slice(0, 7);
  const ljs = lojasNoMes(mes);
  const idLoja = S.ui.pLoja && ljs.some(l => l.IdLoja === S.ui.pLoja) ? S.ui.pLoja : lojaPadrao(mes);
  return { mes, ljs, idLoja };
}
VIEWS.painel = () => {
  const head = topbar({ title: 'Painel', sub: 'Resultado da auditoria no mês' });
  if (!S.data) return { html: head + '<main class="wrap">' + carregando() + '</main>' + navbar('painel') };
  const { mes, ljs, idLoja } = painelEstado();
  ensureMes(mes);
  const hoje = today();
  const lst = doMes(mes, idLoja), r = resumo(lst), loja = lojaById(idLoja);
  const lm = lojaMesItem(mes);
  const decl = lm && lm.IdLoja === idLoja && lm.Declarado !== '' ? +lm.Declarado : null;
  const pend = solicAll().filter(s => s.Status === 'Pendente').length;
  const m = matriz(r.vendas);
  const maxF = Math.max(1, ...m.formas.map(f => m.col[f])), maxH = Math.max(1, ...m.horas.map(h => m.lin[h]));
  const comPerfil = lst.filter(l => l.cat !== 'Anotação');
  const gen = contar(comPerfil, 'genero'), fx = contar(comPerfil, 'faixa'), mot = contar(lst.filter(l => l.cat === 'Venda perdida'), 'motivo');
  const aud = contar(lst.map(l => Object.assign({}, l, { auditor: l.auditor || '(não informado)' })), 'auditor');
  const totG = gen.reduce((s, x) => s + x[1], 0), totF = fx.reduce((s, x) => s + x[1], 0);
  const semPerfil = r.vendas.filter(v => !ehOnline(v.forma) && (!v.genero || !v.faixa)).length;
  const bloco = (tit, corpo) => corpo ? `<div class="section"><h2 class="h2 gutter">${tit}</h2><div class="list">${corpo}</div></div>` : '';
  return {
    html: head + `<main class="wrap">
      <div class="section gutter"><div class="month-nav"><button class="cal-nav" data-act="pMes" data-mes="${addMonth(mes, -1)}" aria-label="Mês anterior">${ICON.left}</button><strong>${mesNome(mes)}</strong>
        <button class="cal-nav" data-act="pMes" data-mes="${addMonth(mes, 1)}" aria-label="Próximo mês" ${mes >= hoje.slice(0, 7) ? 'disabled style="opacity:.3"' : ''}>${ICON.right}</button></div></div>
      ${ljs.length ? `<div class="chips gutter" style="padding-top:4px">${ljs.map(l => `<button class="chip" data-plj="${esc(l.IdLoja)}" aria-pressed="${l.IdLoja === idLoja}">${esc(l.NomeFantasia)}</button>`).join('')}</div>` : ''}
      ${pend ? `<div class="section gutter"><div class="alert warn">${pend} pedido(s) de alteração aguardando você.<button data-act="verPedidos">Ver pedidos</button></div></div>` : ''}
      ${!lm && mes >= hoje.slice(0, 7) ? `<div class="section gutter"><div class="alert warn">Nenhuma loja escolhida para ${mesNome(mes)}.<button data-act="lojaMesForm" data-mes="${mes}">Escolher a loja do mês</button></div></div>` : ''}
      ${S.loadingMes === mes ? carregando() : !lst.length ? vazio(loja ? 'Nenhum lançamento de ' + loja.NomeFantasia + ' em ' + mesNome(mes) + '.' : 'Nenhum lançamento em ' + mesNome(mes) + '.') : `
      <div class="section gutter">${kpisHtml(r)}
        <div class="kpis" style="margin-top:8px"><div class="kpi wide"><span class="l">Auditado × declarado pelo lojista</span>
          ${decl == null ? `<span class="d muted">Faturamento declarado ainda não informado.</span><button class="linkbtn" style="justify-self:start" data-act="lojaMesForm" data-mes="${mes}">Informar o valor declarado</button>`
            : `<span class="v sm num">${money(r.total)} × ${money(decl)}</span><span class="d ${r.total > decl ? 'down' : 'up'}">${r.total > decl ? 'Auditoria viu ' + money(r.total - decl) + ' a mais que o declarado (' + pct(r.total - decl, decl) + ')' : r.total < decl ? 'Declarado ' + money(decl - r.total) + ' acima do auditado' : 'Valores iguais'}</span>`}</div></div>
        ${cuponsNota(r, false).replace('class="note"', 'class="note" style="padding-inline:0"')}
        ${semPerfil ? `<p class="note" style="padding-inline:0">${int(semPerfil)} venda(s) presenciais sem gênero ou faixa etária (lançamentos antigos).</p>` : ''}
        <div class="two" style="margin-top:12px"><button class="btn" data-act="excel" data-mes="${mes}" data-loja="${esc(idLoja)}">${ICON.down}Baixar em Excel</button><button class="btn" data-act="irCal" data-mes="${mes}" data-loja="${esc(idLoja)}">${ICON.cal}Ver calendário</button></div></div>
      ${bloco('Por forma de pagamento', m.formas.map(f => hbar(f || '(sem forma)', money(m.col[f]), m.col[f] / maxF, ` <span class="muted" style="font-weight:500">${pct(m.col[f], r.total)}</span>`)).join(''))}
      ${bloco('Por horário', m.horas.map(h => hbar(pad(h) + 'h', money(m.lin[h]), m.lin[h] / maxH, ` <span class="muted" style="font-weight:500">${m.qt[h]} vendas</span>`)).join(''))}
      <div class="section"><h2 class="h2 gutter">Horário × forma de pagamento</h2>${matrizHtml(r.vendas)}</div>
      ${bloco('Clientes por gênero', gen.map(([k, n]) => hbar(k, pct(n, totG), n / totG, ` <span class="muted" style="font-weight:500">${int(n)}</span>`)).join(''))}
      ${bloco('Clientes por faixa etária', fx.map(([k, n]) => hbar(k, pct(n, totF), n / totF, ` <span class="muted" style="font-weight:500">${int(n)}</span>`)).join(''))}
      ${bloco('Vendas perdidas por motivo', mot.map(([k, n]) => hbar(k, int(n), n / mot[0][1])).join(''))}
      ${bloco('Lançamentos por auditor', aud.map(([k, n]) => hbar(k, int(n), n / aud[0][1])).join(''))}`}
    </main>` + navbar('painel')
  };
};

/* ---------- Excel ---------- */
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Não foi possível carregar o gerador de Excel')); document.head.appendChild(s); }); }
async function baixarExcel(mes, idLoja) {
  try {
    toast('Preparando o Excel…');
    if (!window.XLSX) await loadScript('xlsx.full.min.js');
    const X = window.XLSX, loja = lojaById(idLoja) || { NomeFantasia: 'Loja' };
    const lst = doMes(mes, idLoja).slice().reverse(), r = resumo(lst);
    const wb = X.utils.book_new();
    const a1 = [['Data', 'Hora', 'Auditor', 'Loja', 'Lançamento', 'Documento', 'Número', 'Forma de pagamento', 'Valor', 'Gênero', 'Faixa etária', 'Motivo', 'Observação']]
      .concat(lst.map(l => [dBR(l.data), l.hora.slice(11, 19), l.auditor, l.loja, l.cat, l.tipo, l.num === '' ? null : l.num, l.forma, l.valor === '' ? null : +l.valor, l.genero, l.faixa, l.motivo, l.obs]));
    const w1 = X.utils.aoa_to_sheet(a1); w1['!cols'] = [10, 9, 16, 20, 14, 15, 9, 20, 11, 11, 11, 16, 50].map(wch => ({ wch }));
    X.utils.book_append_sheet(wb, w1, 'Lançamentos');
    const m = matriz(r.vendas);
    const a2 = [['Hora'].concat(m.formas.map(f => f || '(sem forma)'), ['Total', 'Qtd de vendas'])]
      .concat(m.horas.map(h => [pad(h) + 'h'].concat(m.formas.map(f => m.cel[h + '|' + f] || 0), [m.lin[h], m.qt[h]])))
      .concat([['Total'].concat(m.formas.map(f => m.col[f]), [r.total, r.n])]);
    const r2 = v => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
    const w2 = X.utils.aoa_to_sheet(a2.map(l => l.map(r2))); w2['!cols'] = a2[0].map(() => ({ wch: 16 }));
    X.utils.book_append_sheet(wb, w2, 'Hora x pagamento');
    const dias = Array.from(new Set(lst.map(l => l.data))).sort();
    const a3 = [['Data', 'Dia', 'Vendas (R$)', 'Qtd de vendas', 'CF / NF (R$)', 'Sem documento (R$)', 'Qtd sem documento', 'Visitas', 'Vendas perdidas', 'Cupons pulados']]
      .concat(dias.map(d => { const x = resumo(lst.filter(l => l.data === d)); return [dBR(d), DOW[new Date(d + 'T12:00:00').getDay()], x.total, x.n, x.cfV, x.sdV, x.sdN, x.visitas, x.perdidas, x.pulados]; }))
      .concat([['Total', '', r.total, r.n, r.cfV, r.sdV, r.sdN, r.visitas, r.perdidas, r.pulados]]);
    const w3 = X.utils.aoa_to_sheet(a3.map(l => l.map(r2))); w3['!cols'] = a3[0].map(() => ({ wch: 17 }));
    X.utils.book_append_sheet(wb, w3, 'Por dia');
    X.writeFile(wb, 'Auditoria ' + loja.NomeFantasia.replace(/[\\/:*?"<>|]/g, '') + ' ' + mes + '.xlsx');
  } catch (e) { toast(e.message); }
}

/* ---------- Conta ---------- */
VIEWS.conta = () => {
  const u = S.user || {};
  const tema = temaAtual();
  const fila = S.queue;
  const itemFila = q => {
    const t = q.type === 'lanc' ? (q.lanc.Categoria === 'Venda' ? 'Venda de ' + money(q.lanc.Valor) : q.lanc.Categoria) + ' · ' + dtBR(q.lanc.HoraRegistro) : 'Pedido de ' + q.solic.Tipo.toLowerCase();
    return `<div class="row"><div><div class="t">${esc(t)}</div><div class="s">${q.error ? '<span class="pill bad">Não aceito</span> ' + esc(q.error) : 'Aguardando envio'}</div></div>
      <div class="v" style="display:grid;gap:6px">${q.error ? `<button class="quick" data-act="retry" data-qid="${q.qid}">Tentar de novo</button>` : ''}<button class="quick" style="color:var(--bad)" data-act="descartar" data-qid="${q.qid}">Descartar</button></div></div>`;
  };
  const menu = (act, t, s) => `<button class="menu" data-act="${act}"><span>${t}<small>${s}</small></span>${ICON.right}</button>`;
  const lm = lojaDoMes(today().slice(0, 7));
  return {
    html: topbar({ title: 'Conta' }) + `<main class="wrap">
      <div class="section gutter"><div class="card" style="padding:14px;display:flex;gap:12px;align-items:center"><span class="avatar" style="border-radius:50%">${esc(initials(u.nome))}</span>
        <div><b style="font-size:17px">${esc(u.nome)}</b><div class="muted">${u.perfil === 'Master' ? 'Master' : 'Auditor'}</div></div></div></div>
      ${fila.length ? `<div class="section"><h2 class="h2 gutter">Ainda não enviados (${fila.length})</h2><div class="list">${fila.map(itemFila).join('')}</div>
        <p class="note">${online() ? 'O envio é automático. ' : 'Sem internet: o envio acontece quando a conexão voltar. '}Só descarte se o lançamento não for real.</p></div>` : ''}
      ${isMaster() ? `<div class="section"><h2 class="h2 gutter">Administração</h2><div class="list">
        ${menu('lojaMes', 'Loja do mês', lm ? 'Em ' + MESES[new Date().getMonth()] + ': ' + esc(lm.NomeFantasia) : 'Nenhuma loja escolhida para este mês')}
        ${menu('lojas', 'Lojas', lojas().length + ' cadastradas')}
        ${menu('auditores', 'Auditores e senhas', 'Cadastrar, trocar senha, desconectar aparelhos')}
        ${menu('listas', 'Listas do formulário', 'Formas de pagamento, motivos, faixas etárias')}
        ${menu('historico', 'Histórico', 'Alterações e acessos')}</div></div>` : ''}
      <div class="section gutter"><h2 class="h2">Aparência</h2><div class="seg">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, t]) => `<button data-tema="${k}" aria-pressed="${tema === k}">${t}</button>`).join('')}</div></div>
      <div class="section gutter" style="display:grid;gap:8px">
        <button class="btn" data-act="sync">${ICON.sync}Sincronizar agora</button>
        ${S.installEvt ? '<button class="btn" data-act="install">Instalar o app neste aparelho</button>' : ''}
        <button class="btn danger" data-act="logout">Sair</button>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">Versão ${APP_VERSION}${S.data ? ' · servidor ' + esc(S.data.version) : ''}${S.lastSync ? ' · sincronizado ' + new Date(S.lastSync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}${S.syncErr ? ' · ' + esc(S.syncErr) : ''}</p>
      </div></main>` + navbar('conta')
  };
};

/* ---------- Loja do mês (master) ---------- */
VIEWS.lojaMes = () => {
  const hoje = today().slice(0, 7);
  const ms = []; for (let i = 1; i >= -14; i--) ms.push(addMonth(hoje, i));
  return {
    html: topbar({ title: 'Loja do mês', sub: 'Uma loja auditada por mês', backBtn: true }) + `<main class="wrap"><p class="note">O auditor lança sempre na loja escolhida para o mês. Toque num mês para escolher a loja e informar o faturamento declarado pelo lojista.</p>
      <div class="list" style="margin-top:12px">${ms.map(m => { const x = lojaMesItem(m); return `<button class="row" data-act="lojaMesForm" data-mes="${m}"><div><div class="t cap">${mesNome(m)}${m === hoje ? ' <span class="pill">mês atual</span>' : ''}</div>
        <div class="s">${x ? esc((lojaById(x.IdLoja) || {}).NomeFantasia || x.Loja) + (x.Declarado !== '' ? ' · declarado ' + money(x.Declarado) : '') : (m >= hoje ? '<span class="pill warn">Escolher</span>' : 'Sem auditoria')}</div></div><div class="v muted">${ICON.right.replace('<svg', '<svg style="width:18px;height:18px"')}</div></button>`; }).join('')}</div></main>`
  };
};
VIEWS.lojaMesForm = p => {
  const x = lojaMesItem(p.mes) || {};
  const ativas = lojas().filter(l => l['Situação'] !== 'Inativo' || l.IdLoja === x.IdLoja).sort((a, b) => a.NomeFantasia.localeCompare(b.NomeFantasia));
  return {
    form: true,
    html: topbar({ title: 'Loja de ' + mesNome(p.mes), backBtn: true }) + `<main class="wrap form-main"><div class="fields gutter">
      <div class="field" id="fdLoja"><label for="mLoja">Loja auditada<span class="req"> *</span></label><select id="mLoja"><option value="">Escolha a loja…</option>${ativas.map(l => `<option value="${esc(l.IdLoja)}" ${l.IdLoja === x.IdLoja ? 'selected' : ''}>${esc(l.NomeFantasia)}</option>`).join('')}</select>
        <div class="hint">Não encontrou? Cadastre em Conta &gt; Lojas.</div></div>
      <div class="field"><label for="mDecl">Faturamento declarado pelo lojista no mês</label><input class="input money num" id="mDecl" inputmode="numeric" placeholder="R$ 0,00" value="${x.Declarado !== '' && x.Declarado != null ? money(x.Declarado) : ''}">
        <div class="hint">Opcional. Com ele o Painel compara o que a auditoria viu com o que a loja declarou.</div></div>
      <div id="mErr"></div></div></main>
    <div class="formbar"><button class="btn" data-act="back">Cancelar</button><button class="btn primary" data-act="saveLojaMes" data-mes="${p.mes}">Salvar</button></div>`
  };
};
async function adminSave(btnSel, errSel, fn, okMsg) {
  if (!online()) { $(errSel).innerHTML = '<div class="alert bad">Precisa de internet.</div>'; return; }
  const btn = $(btnSel); btn.disabled = true;
  try { await fn(); await persist(); toast(okMsg); back(); }
  catch (e) { $(errSel).innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; btn.disabled = false; if (e.auth) logout(true); }
}

/* ---------- Lojas (master) ---------- */
VIEWS.lojas = () => ({
  html: topbar({ title: 'Lojas', backBtn: true, actions: `<button class="icon-btn" data-act="novaLoja" aria-label="Nova loja">${ICON.plus}</button>` }) + `<main class="wrap"><div class="list" style="margin-top:14px">
    ${lojas().slice().sort((a, b) => a.NomeFantasia.localeCompare(b.NomeFantasia)).map(l => `<button class="row" data-act="editLoja" data-id="${esc(l.IdLoja)}"><div><div class="t">${esc(l.NomeFantasia)}${l['Situação'] === 'Inativo' ? ' <span class="pill mut">Inativa</span>' : ''}</div><div class="s">${l.Contrato ? 'Contrato ' + esc(l.Contrato) : 'Sem contrato informado'}</div></div><div class="v muted"></div></button>`).join('')}</div></main>`
});
VIEWS.lojaForm = p => {
  const l = p.id ? lojaById(p.id) || {} : {};
  return {
    form: true,
    html: topbar({ title: p.id ? 'Editar loja' : 'Nova loja', backBtn: true }) + `<main class="wrap form-main"><div class="fields gutter">
      <div class="field" id="fdNome"><label for="lNome">Nome fantasia<span class="req"> *</span></label><input class="input" id="lNome" maxlength="80" value="${esc(l.NomeFantasia || '')}"></div>
      <div class="field"><label for="lContrato">Número do contrato</label><input class="input" id="lContrato" maxlength="30" value="${esc(l.Contrato || '')}"></div>
      <div class="field"><span class="label">Situação</span><div class="seg">${['Ativo', 'Inativo'].map(s => `<button type="button" data-segval="${s}" data-sit aria-pressed="${(l['Situação'] || 'Ativo') === s}">${s}</button>`).join('')}</div></div>
      <div id="lErr"></div></div></main>
    <div class="formbar"><button class="btn" data-act="back">Cancelar</button><button class="btn primary" data-act="saveLoja" data-id="${esc(p.id || '')}">Salvar</button></div>`
  };
};

/* ---------- Auditores (master) ---------- */
async function carregarAuditores() {
  try { const r = await api('listarAuditores'); S.audList = r.auditores; S.audErr = ''; }
  catch (e) { S.audErr = e.message; }
  if (cur().v === 'auditores') render();
}
VIEWS.auditores = () => {
  if (!S.audList && !S.audErr) carregarAuditores();
  return {
    html: topbar({ title: 'Auditores e senhas', backBtn: true, actions: `<button class="icon-btn" data-act="novoAud" aria-label="Cadastrar auditor">${ICON.plus}</button>` }) + `<main class="wrap">
      ${S.audErr ? `<div class="section gutter"><div class="alert bad">${esc(S.audErr)}</div></div>` : !S.audList ? carregando() : `<div class="list" style="margin-top:14px">${S.audList.map(a => `<button class="row" data-aud="${esc(a.id)}"><div><div class="t">${esc(a.nome)} ${a.perfil === 'Master' ? '<span class="pill">Master</span>' : ''}${a.situacao === 'Inativo' ? ' <span class="pill mut">Inativo</span>' : ''}${a.senhaCurta ? ' <span class="pill warn">Senha curta</span>' : ''}</div>
        <div class="s">${a.aparelhos ? a.aparelhos + ' aparelho(s) conectado(s)' : 'Nenhum aparelho conectado'}</div></div><div class="v muted"></div></button>`).join('')}</div>
        <p class="note">As senhas ficam embaralhadas na planilha: ninguém consegue ler, nem o master. Se alguém esquecer, defina uma nova.</p>`}</main>`
  };
};
VIEWS.audForm = p => {
  const a = p.id ? (S.audList || []).find(x => x.id === p.id) || {} : {};
  return {
    form: true,
    html: topbar({ title: p.id ? a.nome || 'Auditor' : 'Cadastrar auditor', backBtn: true }) + `<main class="wrap form-main"><div class="fields gutter">
      <div class="field" id="fdANome"><label for="aNome">Nome<span class="req"> *</span></label><input class="input" id="aNome" maxlength="60" value="${esc(a.nome || '')}"></div>
      <div class="field"><span class="label">Perfil</span><div class="seg" id="aPerfil">${['Auditor', 'Master'].map(s => `<button type="button" data-segval="${s}" aria-pressed="${(a.perfil || 'Auditor') === s}">${s}</button>`).join('')}</div>
        <div class="hint">Auditor lança e pede alterações. Master aprova pedidos, escolhe a loja do mês e vê o Painel.</div></div>
      <div class="field" id="fdASenha"><label for="aSenha">${p.id ? 'Nova senha' : 'Senha'}${p.id ? '' : '<span class="req"> *</span>'}</label><input class="input" id="aSenha" type="text" autocomplete="off" autocapitalize="off" placeholder="${p.id ? 'Deixe em branco para não trocar' : 'Pelo menos 6 caracteres'}">
        <div class="hint">${p.id ? 'Trocar a senha desconecta os aparelhos dessa pessoa.' : 'Informe a senha à pessoa pessoalmente, não por grupo.'}</div></div>
      <div class="field"><span class="label">Situação</span><div class="seg" id="aSit">${['Ativo', 'Inativo'].map(s => `<button type="button" data-segval="${s}" aria-pressed="${(a.situacao || 'Ativo') === s}">${s}</button>`).join('')}</div></div>
      ${p.id ? `<div class="card" style="padding:14px;display:grid;gap:10px"><div><b>Aparelhos conectados</b><div class="muted">${a.aparelhos ? a.aparelhos + ' aparelho(s)' : 'Nenhum'}</div></div>
        <button class="btn danger" data-act="desconectar" data-id="${esc(p.id)}"><span>Desconectar todos</span></button><div class="hint muted" style="font-size:12.5px">Use quando um celular for perdido ou a pessoa sair da equipe.</div></div>` : ''}
      <div id="audErr"></div></div></main>
    <div class="formbar"><button class="btn" data-act="back">Cancelar</button><button class="btn primary" data-act="saveAud" data-id="${esc(p.id || '')}">Salvar</button></div>`
  };
};
async function desconectarAparelhos(id) {
  if (!online()) { $('#audErr').innerHTML = '<div class="alert bad">Precisa de internet.</div>'; return; }
  const btn = $('[data-act="desconectar"]');
  if (!S.confirmDesc) { S.confirmDesc = true; btn.firstElementChild.textContent = 'Toque de novo para confirmar'; setTimeout(() => { S.confirmDesc = false; }, 5000); return; }
  S.confirmDesc = false; btn.disabled = true;
  try {
    const r = await api('desconectarAparelhos', { id });
    const a = (S.audList || []).find(x => x.id === id); if (a) a.aparelhos = id === S.user.id ? 1 : 0;
    toast(r.desconectados ? r.desconectados + ' aparelho(s) desconectado(s).' : 'Nenhum aparelho estava conectado.');
    btn.firstElementChild.textContent = 'Desconectados';
  } catch (e) { $('#audErr').innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; btn.disabled = false; }
}

/* ---------- Listas do formulário (master) ---------- */
const LISTAS_INFO = [['formas', 'Formas de pagamento', 'A forma "Online" dispensa gênero e faixa etária. "Troca zerada" aceita valor zero.'], ['motivos', 'Motivos de venda perdida', ''], ['faixas', 'Faixas etárias', ''], ['generos', 'Gêneros', '']];
VIEWS.listas = () => ({
  form: true,
  html: topbar({ title: 'Listas do formulário', backBtn: true }) + `<main class="wrap form-main"><div class="fields gutter">
    <div class="alert warn">Um item por linha, na ordem em que deve aparecer. Tirar um item não muda os lançamentos antigos.</div>
    ${LISTAS_INFO.map(([k, t, h]) => `<div class="field"><label for="ls_${k}">${t}</label><textarea class="input" id="ls_${k}" style="min-height:${Math.max(96, lista(k).length * 26 + 30)}px">${esc(lista(k).join('\n'))}</textarea>${h ? `<div class="hint">${h}</div>` : ''}</div>`).join('')}
    <div id="lsErr"></div></div></main>
  <div class="formbar"><button class="btn" data-act="back">Cancelar</button><button class="btn primary" data-act="saveListas">Salvar</button></div>`
});

/* ---------- Histórico (master) ---------- */
VIEWS.historico = () => {
  const aba = S.ui.histAba;
  const alt = (S.data && S.data.alteracoes) || [], ac = (S.data && S.data.acessos) || [];
  // junta as linhas (uma por campo) da mesma alteração
  const grupos = [];
  alt.forEach(a => { const g = grupos[grupos.length - 1]; if (g && g.Data === a.Data && g.Registro === a.Registro && g.Usuario === a.Usuario) g.campos.push(a); else grupos.push(Object.assign({}, a, { campos: [a] })); });
  return {
    html: topbar({ title: 'Histórico', backBtn: true }) + `<main class="wrap"><div class="section gutter"><div class="seg"><button data-haba="alt" aria-pressed="${aba === 'alt'}">Alterações</button><button data-haba="ac" aria-pressed="${aba === 'ac'}">Acessos</button></div></div>
      ${aba === 'alt' ? (grupos.length ? `<div class="list">${grupos.map(g => `<div class="row"><div><div class="t" style="white-space:normal">${esc(g.Descricao)}</div>
        <div class="s" style="-webkit-line-clamp:8">${esc(dtBR(g.Data))} · ${esc(g.Usuario)}${g.Origem && g.Origem !== 'Edição direta' ? ' · ' + esc(g.Origem) : ''}<br>${g.campos.filter(c => c.Campo).map(c => `${esc(c.Campo)}: ${esc(c.Antes || '(vazio)')} → ${esc(c.Depois || '(vazio)')}`).join('<br>')}</div></div><div></div></div>`).join('')}</div>` : vazio('Nenhuma alteração registrada.', ICON.clock))
        : (ac.length ? `<div class="list">${ac.map(a => `<div class="row"><div><div class="t">${esc(a.auditor)}</div><div class="s">${esc(dtBR(a.data))}</div></div><div class="v"><span class="pill ${/Bloqueio/.test(a.tipo) ? 'bad' : a.tipo === 'Login' ? 'ok' : 'mut'}">${esc(a.tipo)}</span></div></div>`).join('')}</div>` : vazio('Nenhum acesso registrado.', ICON.clock))}
      <p class="note">O histórico completo fica nas abas Alteracoes e Historico_sessao da planilha.</p></main>`
  };
};

/* ============================ Login ============================ */
async function loadAuditores() {
  try {
    const r = await api('auditores', {}, { auth: false });
    if (JSON.stringify(r.auditores) === JSON.stringify(S.auditoresLogin)) return;
    S.auditoresLogin = r.auditores;
    await KV.set('auditores', r.auditores);
  } catch (e) {
    const c = await KV.get('auditores');
    if (c) S.auditoresLogin = c;
    else { const b = $('#loginErr'); if (b) b.innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; return; }
  }
  if (cur().v === 'login') { const senha = $('#senha') ? $('#senha').value : ''; render(); if (senha && $('#senha')) $('#senha').value = senha; }
}
function nomeAparelho() {
  const ua = navigator.userAgent || '';
  const so = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Outro';
  const nav = /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'navegador';
  return so + ' · ' + nav + (window.matchMedia && matchMedia('(display-mode: standalone)').matches ? ' · app instalado' : '');
}
const inicioPerfil = () => (isMaster() ? 'painel' : 'inicio');
async function doLogin() {
  const nome = S.ui.loginSel, senha = ($('#senha').value || '').trim();
  const err = $('#loginErr');
  if (!nome) { err.innerHTML = '<div class="alert bad">Escolha seu nome.</div>'; return; }
  if (!senha) { err.innerHTML = '<div class="alert bad">Digite a senha.</div>'; return; }
  const btn = $('[data-act="loginGo"]'); btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const r = await api('login', { auth: { nome, senha }, aparelho: nomeAparelho() }, { auth: false });
    S.user = { id: r.user.id, nome: r.user.nome, perfil: r.user.perfil || 'Auditor', token: r.user.token };
    await persist();
    S.stack = [{ v: inicioPerfil(), p: {} }];
    render();
    toast('Olá, ' + S.user.nome.split(' ')[0] + '!');
    await sync({ full: true, quiet: false, forcar: true });
  } catch (e) {
    err.innerHTML = `<div class="alert bad">${esc(e.auth && !e.bloq && /incorretos/.test(e.message) ? 'Senha incorreta.' + (e.message.match(/\(.*\)/) ? ' ' + e.message.match(/\(.*\)/)[0] : '') : e.message)}</div>`;
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}
async function logout(silent) {
  if (!silent && S.queue.length) {
    if (!S.confirmLogout) { S.confirmLogout = true; toast('Há ' + S.queue.length + ' item(ns) não enviados. Toque em Sair de novo para sair mesmo assim.'); setTimeout(() => { S.confirmLogout = false; }, 5000); return; }
  }
  if (!silent) { try { await api('logout'); } catch (e) { /* sem internet: segue */ } }
  // os dados guardados no aparelho saem junto com a pessoa; a fila não enviada fica para o próximo login
  S.user = null; S.confirmLogout = false; S.data = null; S.lmap = new Map(); S.mesFetched = new Set(); S.audList = null; S.ver++;
  await persist();
  S.stack = [{ v: 'login', p: {} }];
  render(); loadAuditores();
}

/* ============================ Render ============================ */
let current = null;
function render() {
  const c = cur();
  const fn = VIEWS[c.v] || VIEWS.inicio;
  current = fn(c.p) || {};
  const foco = document.activeElement && document.activeElement.id === 'busca';
  const pos = foco ? document.activeElement.selectionStart : 0;
  $('#app').innerHTML = current.html;
  if (foco && $('#busca')) { const el = $('#busca'); el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* */ } }
  if (current.mount) current.mount();
}
/* Redesenha só se não houver formulário aberto (para não perder o que está sendo digitado) */
function refresh(soft) {
  if (current && current.form) { updateChrome(); return; }
  clearTimeout(refreshT);
  refreshT = setTimeout(() => {
    if (current && current.form) return updateChrome();
    const y = window.scrollY; render(); window.scrollTo(0, y);
  }, soft ? 250 : 0);
}
function updateChrome() {
  const b = $('#syncBtn'); if (!b) return;
  b.classList.toggle('spin', S.syncing);
  b.innerHTML = (!online() ? ICON.cloudOff : ICON.sync) + (S.queue.length ? `<span class="sync-dot">${S.queue.length}</span>` : '');
}

/* ============================ Eventos ============================ */
const segVal = sel => { const b = $(sel + ' [aria-pressed="true"]'); return b ? b.dataset.segval : ''; };
const ACOES = {
  back: () => back(),
  sync: () => sync({ full: true, quiet: false, forcar: true }),
  doUpdate: () => doUpdate(),
  saveForm: () => saveForm(),
  dupOk: () => { S.dupOk = true; saveForm(); },
  verDia: d => { S.ui.calMes = d.dia.slice(0, 7); S.ui.calDia = d.dia; S.ui.calLoja = ''; tab('cal'); },
  verLista: d => go('lista', { dia: d.dia, loja: calEstado().idLoja }),
  calMes: d => { S.ui.calMes = d.mes; S.ui.calDia = ''; refresh(); },
  pMes: d => { S.ui.pMes = d.mes; refresh(); },
  irCal: d => { S.ui.calMes = d.mes; S.ui.calLoja = d.loja; S.ui.calDia = ''; tab('cal'); },
  excel: d => baixarExcel(d.mes, d.loja),
  verPedidos: () => { S.ui.listaAba = 'ped'; tab('lista'); },
  editar: d => go('form', { edit: d.id }),
  pedirAlt: d => go('form', { pedido: d.id }),
  excluir: d => go('excluir', { id: d.id }),
  confExcluir: d => confExcluir(d.id),
  resolver: d => resolver(d.id, d.ok === '1'),
  retry: d => { const q = S.queue.find(x => x.qid === d.qid); if (q) { q.retry = true; q.error = ''; } sync({ full: false, quiet: false }); },
  descartar: d => {
    if (S.confirmDescartar !== d.qid) { S.confirmDescartar = d.qid; toast('Toque em Descartar de novo para apagar este item sem enviar.'); setTimeout(() => { S.confirmDescartar = ''; }, 5000); return; }
    S.queue = S.queue.filter(q => q.qid !== d.qid); S.ver++; persist(); toast('Item descartado.');
    if (cur().v === 'lanc') back(); else render();
  },
  logout: () => logout(false),
  install: () => { if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; } },
  setupGo: () => {
    const u = $('#setUrl').value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(u)) { $('#setErr').innerHTML = '<div class="alert bad">O endereço deve começar com https://script.google.com/</div>'; return; }
    S.apiUrl = u; persist().then(() => { S.stack = [{ v: 'login', p: {} }]; render(); loadAuditores(); });
  },
  loginGo: () => doLogin(),
  lojaMes: () => go('lojaMes'),
  lojaMesForm: d => go('lojaMesForm', { mes: d.mes }),
  saveLojaMes: d => {
    const idLoja = $('#mLoja').value;
    if (!idLoja) return fieldErr('fdLoja', 'Escolha a loja.');
    const decl = parseMoney($('#mDecl').value);
    adminSave('[data-act="saveLojaMes"]', '#mErr', async () => { const r = await api('salvarLojaMes', { item: { Mes: d.mes, IdLoja: idLoja, Declarado: decl == null ? '' : decl } }); S.data.lojaMes = r.lojaMes; S.ver++; }, 'Loja do mês salva.');
  },
  lojas: () => go('lojas'),
  novaLoja: () => go('lojaForm', {}),
  editLoja: d => go('lojaForm', { id: d.id }),
  saveLoja: d => {
    const nome = $('#lNome').value.trim();
    if (!nome) return fieldErr('fdNome', 'Informe o nome fantasia.');
    const loja = { IdLoja: d.id || '', NomeFantasia: nome, Contrato: $('#lContrato').value.trim(), 'Situação': ($('[data-sit][aria-pressed="true"]') || { dataset: {} }).dataset.segval || 'Ativo' };
    adminSave('[data-act="saveLoja"]', '#lErr', async () => { const r = await api('salvarLoja', { loja }); const i = S.data.lojas.findIndex(l => l.IdLoja === r.loja.IdLoja); if (i >= 0) S.data.lojas[i] = r.loja; else S.data.lojas.push(r.loja); S.ver++; }, 'Loja salva.');
  },
  auditores: () => { S.audList = null; S.audErr = ''; go('auditores'); },
  novoAud: () => go('audForm', {}),
  saveAud: d => {
    const nome = $('#aNome').value.trim(), senha = $('#aSenha').value.trim();
    if (!nome) return fieldErr('fdANome', 'Informe o nome.');
    if (!d.id && !senha) return fieldErr('fdASenha', 'Defina uma senha.');
    if (senha && senha.length < 6) return fieldErr('fdASenha', 'A senha precisa ter pelo menos 6 caracteres.');
    adminSave('[data-act="saveAud"]', '#audErr', async () => {
      const r = await api('salvarAuditor', { auditor: { id: d.id || '', nome, senha, perfil: segVal('#aPerfil'), situacao: segVal('#aSit') } });
      const i = (S.audList || []).findIndex(a => a.id === r.auditor.id);
      if (i >= 0) S.audList[i] = r.auditor; else (S.audList = S.audList || []).push(r.auditor);
    }, 'Auditor salvo.');
  },
  desconectar: d => desconectarAparelhos(d.id),
  listas: () => go('listas'),
  saveListas: () => {
    const valores = {};
    LISTAS_INFO.forEach(([k]) => { valores[k] = $('#ls_' + k).value.split('\n').map(x => x.trim()).filter(Boolean); });
    adminSave('[data-act="saveListas"]', '#lsErr', async () => { const r = await api('salvarListas', { valores }); S.data.config = r.config; S.ver++; }, 'Listas salvas.');
  },
  historico: () => { go('historico'); sync({ full: true, forcar: true }); }
};

document.addEventListener('click', e => {
  const hr = e.target.closest('tr[data-hora]');
  if (hr) { const st = calEstado(); return go('lista', { dia: S.ui.calDia || today(), hora: +hr.dataset.hora, loja: st.idLoja }); }
  const t = e.target.closest('[data-act],[data-tab],[data-novo],[data-lanc],[data-grp],[data-dia],[data-callj],[data-plj],[data-lfiltro],[data-laba],[data-haba],[data-solic],[data-aud],[data-who],[data-tema],[data-segval]');
  if (!t || t.disabled) return;
  const d = t.dataset;
  if (d.act) { const f = ACOES[d.act]; return f && f(d); }
  if (d.tab) return tab(d.tab);
  if (d.novo) return go('form', { cat: d.novo });
  if (d.lanc) return go('lanc', { id: d.lanc });
  if (d.grp) {
    const era = t.getAttribute('aria-pressed') === 'true';
    $$(`[data-grp="${d.grp}"]`).forEach(b => b.setAttribute('aria-pressed', 'false'));
    t.setAttribute('aria-pressed', String(!era || d.grp === 'tipo' || d.grp === 'forma'));
    const fd = t.closest('.field'); if (fd) fieldErr(fd.id, '');
    if (d.grp === 'tipo' && d.val === CF && !era) setTimeout(() => { const n = $('#fNum'); if (n && !n.value) n.focus(); }, 0);
    S.dupOk = false; const db = $('#dupBox'); if (db) db.innerHTML = '';
    return formSync();
  }
  if (d.dia) { S.ui.calDia = S.ui.calDia === d.dia ? '' : d.dia; return refresh(); }
  if (d.callj) { S.ui.calLoja = d.callj; return refresh(); }
  if (d.plj) { S.ui.pLoja = d.plj; return refresh(); }
  if (d.lfiltro) { S.ui.listaFiltro = d.lfiltro; return render(); }
  if (d.laba) { S.ui.listaAba = d.laba; return render(); }
  if (d.haba) { S.ui.histAba = d.haba; return render(); }
  if (d.solic) return go('solic', { id: d.solic });
  if (d.aud) return go('audForm', { id: d.aud });
  if (d.who) { S.ui.loginSel = d.who; $$('[data-who]').forEach(b => b.setAttribute('aria-pressed', b.dataset.who === d.who)); $('#senha').focus(); return; }
  if (d.tema) { setTema(d.tema); $$('[data-tema]').forEach(b => b.setAttribute('aria-pressed', b === t)); return; }
  if (d.segval) { $$('[data-segval]', t.parentNode).forEach(b => b.setAttribute('aria-pressed', b === t)); return; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'senha') doLogin();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr[data-hora]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', e => {
  const el = e.target, id = el.id;
  const fd = el.closest && el.closest('.field.invalid'); if (fd) fieldErr(fd.id, '');
  if (id === 'fValor' || id === 'mDecl') { const v = parseMoney(el.value); el.value = v == null ? '' : money(v); }   // digita os centavos, como em maquininha
  if (id === 'fNum') { const c = el.value.replace(/\D/g, '').slice(0, 12); if (c !== el.value) el.value = c; S.dupOk = false; const db = $('#dupBox'); if (db) db.innerHTML = ''; }
  if (id === 'busca') { S.ui.busca = el.value; clearTimeout(S.buscaT); S.buscaT = setTimeout(render, 180); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'listaDia') { S.ui.listaDia = e.target.value && e.target.value !== today() ? e.target.value : ''; render(); }
});

window.addEventListener('online', () => { updateChrome(); sync({ full: true }); });
window.addEventListener('offline', updateChrome);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  checkUpdate();
  if (S.user && Date.now() - S.lastSync > 3 * 60e3) sync({ full: true });
});
setInterval(() => { if (S.user && S.queue.length) sync({ full: false }); }, 60e3);
setInterval(() => { if (S.user && document.visibilityState === 'visible' && Date.now() - S.lastSync > 5 * 60e3) sync({ full: true }); }, 60e3);

/* ============================ Início ============================ */
(async function start() {
  aplicarTema(temaAtual());
  setTimeout(() => { const sp = document.getElementById('splash'); if (sp) { sp.classList.add('out'); setTimeout(() => sp.remove(), 450); } }, 350);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { navigator.serviceWorker.register('sw.js'); } catch (e) { /* sem modo offline */ }
  }
  let st = null;
  try { st = await KV.get('state'); } catch (e) { /* vazio */ }
  checkUpdate();
  if (st) { S.apiUrl = st.apiUrl || ''; S.user = st.user || null; S.data = st.data || null; S.queue = st.queue || []; S.lastSync = st.lastSync || 0; }
  const urlAntes = S.apiUrl;
  if (CFG.apiUrl) S.apiUrl = CFG.apiUrl;
  if (urlAntes && S.apiUrl && urlAntes !== S.apiUrl) {
    // o app passou a usar outra planilha: pede login de novo e não reenvia a fila sozinho
    S.user = null; S.data = null; S.lastSync = 0;
    S.queue.forEach(q => { q.error = 'Feito antes da troca de planilha. Envie só se for um lançamento real; senão, descarte.'; q.retry = false; });
    await KV.set('auditores', null); await persist();
  }
  rebuildFromData();
  if (!S.apiUrl) { S.stack = [{ v: 'setup', p: {} }]; return render(); }
  if (!S.user) { S.stack = [{ v: 'login', p: {} }]; render(); return loadAuditores(); }
  S.stack = [{ v: inicioPerfil(), p: {} }];
  render();
  sync({ full: true });
})();
