import { createScene } from './scene.js';
import { ACTIVITY, PROPERTIES, STATUS, TYPES, ZONES } from './data.js';

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
const MONTHS = (() => {
  const out = [];
  const d = new Date(2026, 10, 1); // noviembre 2026: último mes de los datos de ejemplo
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(m.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''));
  }
  return out;
})();

function contractProgress(t) {
  if (!t?.since || !t?.until || !t.until.includes('-')) return null;
  const a = new Date(t.since).getTime();
  const b = new Date(t.until).getTime();
  const now = Date.now();
  const pct = Math.min(1, Math.max(0, (now - a) / (b - a)));
  const monthsLeft = Math.round((b - now) / (1000 * 60 * 60 * 24 * 30.4));
  return { pct, monthsLeft, future: now < a };
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).filter((c) => /[A-ZÀ-Ú]/.test(c)).slice(0, 2).join('');
}

function panelHtml(p) {
  const st = STATUS[p.status];
  const cp = contractProgress(p.tenant);
  const metrics = [
    [p.status === 'alquilado' ? 'Renta mensual' : 'Renta prevista', eur.format(p.rent)],
    ['Superficie', `${num.format(p.m2)} m²${p.plot ? ` <small>· parcela ${num.format(p.plot)} m²</small>` : ''}`],
    p.units ? ['Unidades', p.units] : ['Habitaciones', p.rooms || '—'],
    ['Baños', p.baths],
    ['Año', p.year],
    ['Cert. energético', `<span class="energy e-${String(p.energy)[0].toLowerCase()}">${esc(p.energy)}</span>`],
  ];
  const incidents = p.incidents.length
    ? p.incidents
        .map((i) => `<li><span class="prio p-${i.priority}">${i.priority}</span><span><b>${esc(i.title)}</b><small>${fmtDate(i.date)} · ${i.state}</small></span></li>`)
        .join('')
    : '<li class="none">✓ Sin incidencias abiertas</li>';

  let occupancy = '';
  if (p.reform) {
    const r = p.reform;
    occupancy = `<section class="sec">
      <h4>Reforma en curso</h4>
      <div class="progress"><i style="width:${r.progress * 100}%;background:${st.color}"></i></div>
      <div class="row-between"><span>${Math.round(r.progress * 100)}% completado</span><span>Fin previsto ${fmtDate(r.end)}</span></div>
      <dl class="kv">
        <dt>Empresa</dt><dd>${esc(r.company)}</dd>
        <dt>Presupuesto</dt><dd>${eur.format(r.budget)}</dd>
        <dt>Ejecutado</dt><dd>${eur.format(r.spent)} <small>(${Math.round((r.spent / r.budget) * 100)}%)</small></dd>
      </dl></section>`;
  } else if (p.tenant) {
    occupancy = `<section class="sec">
      <h4>${p.status === 'reservado' ? 'Reserva' : 'Inquilino'}</h4>
      <div class="tenant"><span class="avatar sm">${initials(p.tenant.name) || ICONS.key}</span>
        <span><b>${esc(p.tenant.name)}</b><small>${p.tenant.phone ? esc(p.tenant.phone) : 'Contrato gestionado por Llopart'}</small></span></div>
      ${cp ? `<div class="progress"><i style="width:${cp.pct * 100}%"></i></div>
      <div class="row-between"><span>${fmtDate(p.tenant.since)}</span><span>${cp.future ? 'Entrada próxima' : cp.monthsLeft <= 9 ? `<b class="warn">Vence en ${cp.monthsLeft} meses</b>` : `${cp.monthsLeft} meses restantes`}</span><span>${fmtDate(p.tenant.until)}</span></div>` : `<p class="muted">Desde ${fmtDate(p.tenant.since)}</p>`}
    </section>`;
  } else {
    occupancy = `<section class="sec">
      <h4>Comercialización</h4>
      <dl class="kv"><dt>Visitas este mes</dt><dd>${p.visits ?? 0}</dd><dt>Renta publicada</dt><dd>${eur.format(p.rent)}/mes</dd></dl>
    </section>`;
  }

  const payments = p.payments.length
    ? `<section class="sec"><h4>Cobros últimos 6 meses</h4><div class="pays">${p.payments
        .map((s, i) => `<span class="pay ${s}" title="${MONTHS[i]}: ${s === 'ok' ? 'cobrado' : 'con retraso'}"><i>${s === 'ok' ? '✓' : '!'}</i>${MONTHS[i]}</span>`)
        .join('')}</div></section>`
    : '';

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
      <div class="metrics">${metrics.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
      ${occupancy}
      ${payments}
      <section class="sec"><h4>Incidencias <span class="count">${p.incidents.length}</span></h4><ul class="incidents">${incidents}</ul></section>
      <section class="sec"><h4>Características</h4><div class="tags">${p.features.map((f) => `<span>${esc(f)}</span>`).join('')}</div></section>
      <div class="next"><span>📌</span><div><small>Próximo hito</small><b>${esc(p.next)}</b></div></div>
      <a class="btn" href="${maps}" target="_blank" rel="noopener">Ver ubicación en el mapa ↗</a>
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
