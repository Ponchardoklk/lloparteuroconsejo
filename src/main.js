import { createScene } from './scene.js';
import { ACTIVITY, CONTRACTS, DEMO_TODAY, PROPERTIES, STATUS, TYPES, ZONES } from './data.js';
import { nextReview } from './ledger.js';
import { createLibrary } from './library.js';

const $ = (s) => document.querySelector(s);
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-ES');
const fmtDate = (iso) => (iso && iso.includes('-') ? new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : iso || '—');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const state = { selected: null, status: 'todos', query: '', night: false, zone: 'bcn' };
const inZone = (p) => state.zone === 'all' || p.zone === state.zone;
const zoneProps = () => PROPERTIES.filter(inZone);
const byId = new Map(PROPERTIES.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------------------
// Escena 3D
const scene = createScene($('#scene'), PROPERTIES, {
  onSelect: (id) => select(id),
  onHover: (id, x, y) => showTooltip(id, x, y),
});

const library = createLibrary($('#app'), { contractsFor: (id) => CONTRACTS[id] || [] });

// ---------------------------------------------------------------------------------------
// KPIs
function renderKpis() {
  const list = zoneProps();
  const total = list.length;
  const rented = list.filter((p) => p.status === 'alquilado').length;
  const income = list.filter((p) => p.status === 'alquilado').reduce((s, p) => s + p.rent, 0);
  const openInc = list.reduce((s, p) => s + p.incidents.filter((i) => i.state !== 'programada').length, 0);
  const high = list.reduce((s, p) => s + p.incidents.filter((i) => i.priority === 'alta').length, 0);
  const late = list.filter((p) => p.payments.at(-1) === 'late').length;
  const where = state.zone === 'all' ? 'Inmuebles gestionados' : `Inmuebles · ${ZONES[state.zone].label}`;
  const cards = [
    { icon: 'home', label: where, value: total, sub: `${num.format(list.reduce((s, p) => s + p.m2, 0))} m² en cartera` },
    { icon: 'key', label: 'Ocupación', value: `${Math.round((rented / total) * 100)}%`, sub: `${rented} alquilados · ${total - rented} libres/obra`, bar: rented / total },
    { icon: 'euro', label: 'Renta mensual', value: eur.format(income), sub: late ? `${late} recibo pendiente` : 'Todo cobrado', tone: late ? 'warn' : 'ok' },
    { icon: 'tool', label: 'Incidencias abiertas', value: openInc, sub: high ? `${high} de prioridad alta` : 'Sin urgencias', tone: high ? 'bad' : 'ok' },
  ];
  $('#kpis').innerHTML = cards
    .map(
      (c) => `<article class="kpi card">
        <span class="kpi-icon">${ICONS[c.icon]}</span>
        <div><small>${c.label}</small><strong>${c.value}</strong>
        <span class="kpi-sub ${c.tone || ''}">${c.sub}</span>
        ${c.bar != null ? `<span class="bar"><i style="width:${c.bar * 100}%"></i></span>` : ''}</div>
      </article>`,
    )
    .join('');
}

// ---------------------------------------------------------------------------------------
// Filtros, listado y leyenda
function matches(p) {
  if (!state.query && !inZone(p)) return false;
  if (state.status !== 'todos' && p.status !== state.status) return false;
  if (!state.query) return true;
  const hay = [p.name, p.address, p.city, p.id, p.owner, p.tenant?.name, TYPES[p.type]].join(' ').toLowerCase();
  return hay.includes(state.query);
}

function renderFilters() {
  const list = zoneProps();
  const opts = [['todos', 'Todos', list.length], ...Object.entries(STATUS).map(([k, v]) => [k, v.label, list.filter((p) => p.status === k).length])];
  $('#filters').innerHTML = opts
    .map(([k, label, n]) => `<button class="chip ${state.status === k ? 'on' : ''}" data-status="${k}" style="${k !== 'todos' ? `--c:${STATUS[k].color}` : ''}">${k !== 'todos' ? '<i></i>' : ''}${label}<span>${n}</span></button>`)
    .join('');
  $('#legend').innerHTML = Object.values(STATUS).map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('');
}

function renderList() {
  const list = PROPERTIES.filter(matches);
  $('#plist').innerHTML = list.length
    ? list
        .map(
          (p) => `<button class="pitem ${state.selected === p.id ? 'on' : ''}" data-id="${p.id}" style="--c:${STATUS[p.status].color}">
            <span class="pdot"></span>
            <span class="pmeta"><b>${esc(p.name)}</b><small>${TYPES[p.type]} · ${esc(p.city)}</small></span>
            <span class="pstat">${STATUS[p.status].label}</span>
          </button>`,
        )
        .join('')
    : '<p class="empty">Ningún inmueble coincide con la búsqueda.</p>';
  scene.setVisible(matches);
}

$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-status]');
  if (!b) return;
  state.status = b.dataset.status;
  renderFilters();
  renderList();
});
$('#plist').addEventListener('click', (e) => {
  const b = e.target.closest('[data-id]');
  if (b) select(b.dataset.id);
});
$('#search').addEventListener('input', (e) => {
  state.query = e.target.value.trim().toLowerCase();
  renderList();
  const list = PROPERTIES.filter(matches);
  if (state.query && list.length === 1) select(list[0].id);
});

function renderZones() {
  const opts = [...Object.entries(ZONES).map(([k, z]) => [k, z.label, PROPERTIES.filter((p) => p.zone === k).length]), ['all', 'Ambas', PROPERTIES.length]];
  $('#zones').innerHTML = opts
    .map(([k, label, n]) => `<button class="zone ${state.zone === k ? 'on' : ''}" data-zone="${k}" aria-pressed="${state.zone === k}">${label}<span>${n}</span></button>`)
    .join('');
}

function setZone(key, { keepSelection = false } = {}) {
  state.zone = key;
  scene.setZone(key);
  if (!keepSelection) select(null);
  renderZones();
  renderKpis();
  renderFilters();
  renderList();
}

$('#zones').addEventListener('click', (e) => {
  const b = e.target.closest('[data-zone]');
  if (b && b.dataset.zone !== state.zone) setZone(b.dataset.zone);
});

function renderActivity() {
  $('#activity').innerHTML = ACTIVITY.map((a) => `<li class="t-${a.tone}"><span class="a-ico">${a.icon}</span><span><b>${esc(a.text)}</b><small>${a.time}</small></span></li>`).join('');
}

// ---------------------------------------------------------------------------------------
// Panel de detalle
function initials(name) {
  return name.split(' ').map((w) => w[0]).filter((c) => /[A-ZÀ-Ú]/.test(c)).slice(0, 2).join('');
}

function monthsUntil(iso) {
  const ms = new Date(iso + 'T12:00:00').getTime() - new Date(DEMO_TODAY + 'T12:00:00').getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
}

function contactRows(k) {
  return `<ul class="contact">
    ${k.contact ? `<li><span class="c-ico">👤</span><span>${esc(k.contact)}</span></li>` : ''}
    <li><span class="c-ico">📞</span><a href="tel:${k.phone.replace(/\s/g, '')}">${esc(k.phone)}</a><button class="copy" data-copy="${esc(k.phone)}" aria-label="Copiar teléfono">Copiar</button></li>
    <li><span class="c-ico">✉️</span><a href="mailto:${esc(k.email)}">${esc(k.email)}</a><button class="copy" data-copy="${esc(k.email)}" aria-label="Copiar correo">Copiar</button></li>
  </ul>`;
}

function termTiles(k) {
  const left = monthsUntil(k.end);
  const review = nextReview(k);
  return `<div class="terms">
    <div><small>Renta mensual</small><b>${eur.format(k.rent)}</b><span>Pago del 1 al 5 de cada mes</span></div>
    <div class="${left <= 9 ? 'attention' : ''}"><small>Vencimiento</small><b>${fmtDate(k.end)}</b><span>${left <= 0 ? 'Vencido' : left <= 9 ? `⚠ Quedan ${left} ${left === 1 ? 'mes' : 'meses'}` : `Quedan ${left} meses`}</span></div>
    <div><small>Próxima revisión</small><b>${review ? fmtDate(review) : '—'}</b><span>${review ? 'Actualización anual de renta' : 'Sin revisión pendiente'}</span></div>
    <div><small>Fianza</small><b>${eur.format(k.deposit)}</b><span>${k.depositMonths} ${k.depositMonths === 1 ? 'mensualidad' : 'mensualidades'} · INCASÒL${k.guarantee ? ` · + ${eur.format(k.guarantee)} garantía` : ''}</span></div>
  </div>`;
}

function panelHtml(p) {
  const st = STATUS[p.status];
  const ks = CONTRACTS[p.id] || [];
  let tenantSec = '';
  if (ks.length === 1) {
    const k = ks[0];
    tenantSec = `<section class="sec">
      <h4>${p.status === 'reservado' ? 'Inquilino (reserva)' : 'Inquilino'}</h4>
      <div class="tenant"><span class="avatar sm">${initials(k.tenant) || ICONS.key}</span>
        <span><b>${esc(k.tenant)}</b><small>Desde ${fmtDate(k.start)}${k.note ? ` · ${esc(k.note)}` : ''}</small></span></div>
      ${contactRows(k)}
    </section>
    <section class="sec"><h4>Contrato</h4>${termTiles(k)}</section>`;
  } else if (ks.length > 1) {
    const total = ks.reduce((s, k) => s + k.rent, 0);
    const deposits = ks.reduce((s, k) => s + k.deposit, 0);
    const nextEnd = ks.map((k) => k.end).sort()[0];
    const nextRev = ks.map((k) => nextReview(k)).filter(Boolean).sort()[0];
    tenantSec = `<section class="sec">
      <h4>Contrato · ${ks.length} inquilinos</h4>
      <div class="terms">
        <div><small>Renta mensual total</small><b>${eur.format(total)}</b><span>${ks.length} contratos activos</span></div>
        <div class="${monthsUntil(nextEnd) <= 9 ? 'attention' : ''}"><small>Próximo vencimiento</small><b>${fmtDate(nextEnd)}</b><span>${esc(ks.find((k) => k.end === nextEnd).unit)}</span></div>
        <div><small>Próxima revisión</small><b>${nextRev ? fmtDate(nextRev) : '—'}</b><span>${nextRev ? esc(ks.find((k) => nextReview(k) === nextRev).unit) : ''}</span></div>
        <div><small>Fianzas depositadas</small><b>${eur.format(deposits)}</b><span>INCASÒL</span></div>
      </div>
    </section>
    <section class="sec"><h4>Inquilinos</h4><div class="units">${ks
      .map((k) => `<details class="unit"><summary><span class="u-unit">${esc(k.unit)}</span><span class="u-name">${esc(k.tenant)}</span><span class="u-rent">${eur.format(k.rent)}</span></summary>
        ${contactRows(k)}${termTiles(k)}</details>`)
      .join('')}</div></section>`;
  } else {
    const msg = p.reform
      ? `En reforma hasta el ${fmtDate(p.reform.end)}. Renta prevista: ${eur.format(p.rent)}/mes.`
      : `Disponible para alquilar. Renta publicada: ${eur.format(p.rent)}/mes.`;
    tenantSec = `<section class="sec"><h4>Inquilino</h4><div class="no-tenant">Sin inquilino. ${msg}</div></section>`;
  }

  const sum = library.summary(p);
  const year = DEMO_TODAY.slice(0, 4);
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.address}, ${p.city}`)}`;

  return `
    <div class="panel-head">
      <span class="ptype" style="--c:${st.color}">${ICONS[p.type] || ICONS.home}</span>
      <div class="ptitle">
        <small>${TYPES[p.type]} · ${p.id}</small>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.address)}, ${esc(p.city)}</p>
      </div>
      <button class="icon-btn close" id="closePanel" aria-label="Cerrar ficha">✕</button>
    </div>
    <div class="panel-badges">
      <span class="badge" style="--c:${st.color};--s:${st.soft}"><i></i>${st.label}</span>
      <span class="owner">Propiedad: <b>${esc(p.owner)}</b></span>
    </div>
    <div class="panel-body">
      ${tenantSec}
      <section class="lib-cta">
        <div class="lib-cta-head"><span class="lib-cta-ico">🗂️</span><div><b>Biblioteca y contabilidad</b><small>${library.docCount(p)} documentos · facturas, recibos y contratos</small></div></div>
        <div class="lib-cta-nums">
          <div><small>Ingresos ${year}</small><b class="pos">${eur.format(sum.income)}</b></div>
          <div><small>Gastos ${year}</small><b>${eur.format(sum.expenses)}</b></div>
          <div><small>Resultado</small><b class="${sum.net >= 0 ? 'pos' : 'neg'}">${sum.net >= 0 ? '+' : '−'}${eur.format(Math.abs(sum.net))}</b></div>
        </div>
        <div class="lib-cta-actions">
          <button class="btn" data-library="docs">Abrir biblioteca</button>
          <button class="btn btn-soft" data-library="cont">Ver contabilidad</button>
        </div>
      </section>
      <a class="maplink" href="${maps}" target="_blank" rel="noopener">Ver ubicación en Google Maps ↗</a>
    </div>`;
}

// Desplaza el centro de la vista para que el inmueble no quede tapado por la ficha
// (a la derecha en escritorio, abajo en móvil).
function updatePanelOffset() {
  const panel = $('#panel');
  if (!state.selected) return scene.setPanelOffset(0, 0);
  if (window.innerWidth > 820) scene.setPanelOffset((panel.offsetWidth + 24) / 2, 0);
  else scene.setPanelOffset(0, panel.offsetHeight / 2 - 40);
}

function select(id) {
  state.selected = id || null;
  const panel = $('#panel');
  if (!id) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    scene.resetView();
  } else {
    const p = byId.get(id);
    if (state.zone !== 'all' && p.zone !== state.zone) setZone(p.zone, { keepSelection: true });
    panel.innerHTML = panelHtml(p);
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    scene.select(id);
    $('#closePanel').addEventListener('click', () => select(null));
    panel.querySelectorAll('[data-library]').forEach((b) => b.addEventListener('click', () => library.open(p, b.dataset.library)));
    panel.querySelectorAll('[data-copy]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copy);
          b.textContent = 'Copiado';
        } catch {
          const r = document.createRange();
          r.selectNodeContents(b.previousElementSibling);
          getSelection().removeAllRanges();
          getSelection().addRange(r);
        }
        setTimeout(() => (b.textContent = 'Copiar'), 1500);
      }),
    );
    $('#hint').classList.add('hide');
  }
  document.body.classList.toggle('has-panel', !!id);
  updatePanelOffset();
  renderList();
  const active = document.querySelector('.pitem.on');
  active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') select(null);
});

// ---------------------------------------------------------------------------------------
// Tooltip
function showTooltip(id, x, y) {
  const tip = $('#tooltip');
  if (!id) {
    tip.classList.remove('show');
    return;
  }
  const p = byId.get(id);
  const st = STATUS[p.status];
  tip.innerHTML = `<b>${esc(p.name)}</b><span><i style="background:${st.color}"></i>${st.label} · ${eur.format(p.rent)}/mes</span>`;
  tip.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
  tip.classList.add('show');
}

// ---------------------------------------------------------------------------------------
// Controles
document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => scene.zoomBy(b.dataset.zoom === 'in' ? 1.25 : 0.8)));
$('#resetView').addEventListener('click', () => select(null));
$('#nightToggle').addEventListener('click', () => {
  state.night = !state.night;
  document.body.classList.toggle('night', state.night);
  scene.setNight(state.night);
});
window.addEventListener('resize', updatePanelOffset);

function tickClock() {
  $('#clock').textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
setInterval(tickClock, 15000);
tickClock();

// ---------------------------------------------------------------------------------------
// Iconos (SVG en línea)
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONS = {
  home: svg('<path d="M3 11l9-8 9 8M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'),
  euro: svg('<path d="M17 6a7 7 0 100 12M4 10h10M4 14h10"/>'),
  tool: svg('<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  chalet: svg('<path d="M3 11l9-8 9 8M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  adosado: svg('<path d="M2 12l5-5 5 5 5-5 5 5M4 11v9h16v-9"/><path d="M9 20v-4M15 20v-4"/>'),
  edificio: svg('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>'),
  atico: svg('<rect x="7" y="7" width="10" height="14"/><path d="M5 7h14M9 3h6v4"/>'),
  piso: svg('<rect x="5" y="3" width="14" height="18"/><path d="M5 9h14M5 15h14M11 18h2"/>'),
  local: svg('<path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18"/><path d="M9 20v-6h6v6"/>'),
  oficina: svg('<rect x="4" y="3" width="16" height="18"/><path d="M4 8h16M4 13h16M10 3v18"/>'),
  nave: svg('<path d="M2 20V10a10 6 0 0120 0v10z"/><path d="M7 20v-6h10v6"/>'),
};

renderZones();
renderKpis();
renderFilters();
renderList();
renderActivity();
