// Biblioteca de documentos y contabilidad de cada inmueble.
// Se abre a pantalla completa desde la ficha del inmueble.
import { DEMO_TODAY } from './data.js';
import { CATEGORY_LABEL, FOLDER, FOLDERS, buildLedger, monthName, summarize } from './ledger.js';
import { deleteEntry, listEntries, saveEntry } from './store.js';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + eur2.format(Math.abs(n));
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function fileKind(name, type = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(ext)) return 'img';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'xls';
  if (['doc', 'docx', 'odt'].includes(ext)) return 'doc';
  if (ext === 'pdf') return 'pdf';
  return 'file';
}
const KIND_LABEL = { pdf: 'PDF', img: 'IMG', xls: 'XLS', doc: 'DOC', file: 'ARCH' };

export function createLibrary(root, { contractsFor }) {
  const el = document.createElement('div');
  el.className = 'lib';
  el.hidden = true;
  root.appendChild(el);

  const st = {
    p: null,
    tab: 'docs',
    folder: 'all',
    query: '',
    sort: 'recent',
    year: Number(DEMO_TODAY.slice(0, 4)),
    flow: 'all', // all | in | out
    docId: null,
    highlight: null,
    entries: [],
    docs: [],
    queue: [],
    objectUrls: [],
  };

  // ---------------------------------------------------------------------------------
  async function load() {
    const base = buildLedger(st.p);
    const user = await listEntries(st.p.id);
    st.objectUrls.forEach((u) => URL.revokeObjectURL(u));
    st.objectUrls = [];
    const userEntries = user.map((u) => {
      const e = { ...u, user: true };
      if (u.doc) {
        e.doc = { ...u.doc, id: `doc-${u.id}`, entryId: u.amount ? u.id : null, user: true };
        if (u.doc.blob) {
          e.doc.url = URL.createObjectURL(u.doc.blob);
          st.objectUrls.push(e.doc.url);
        }
      }
      return e;
    });
    st.entries = [...base.entries, ...userEntries.filter((e) => e.amount)].sort((a, b) => b.date.localeCompare(a.date));
    st.docs = [...base.docs, ...userEntries.filter((e) => e.doc).map((e) => e.doc)].sort((a, b) => b.date.localeCompare(a.date));
  }

  const entryById = (id) => st.entries.find((e) => e.id === id);
  const docById = (id) => st.docs.find((d) => d.id === id);

  // ---------------------------------------------------------------------------------
  function frame() {
    const p = st.p;
    const years = [...new Set(st.entries.map((e) => Number(e.date.slice(0, 4))))].sort((a, b) => b - a);
    if (!years.includes(st.year)) years.unshift(st.year);
    return `
      <div class="lib-backdrop" data-close></div>
      <section class="lib-win" role="dialog" aria-modal="true" aria-labelledby="libTitle">
        <header class="lib-head">
          <button class="lib-back" data-close aria-label="Volver al mapa">← Mapa</button>
          <div class="lib-title">
            <small>Biblioteca · ${p.id}</small>
            <h2 id="libTitle">${esc(p.name)}</h2>
            <p>${esc(p.address)}, ${esc(p.city)}</p>
          </div>
          <div class="lib-tabs" role="tablist">
            <button role="tab" data-tab="docs" aria-selected="${st.tab === 'docs'}">Documentos <span>${st.docs.length}</span></button>
            <button role="tab" data-tab="cont" aria-selected="${st.tab === 'cont'}">Contabilidad</button>
          </div>
          <label class="lib-year" ${st.tab === 'docs' ? 'hidden' : ''}>Año
            <select id="libYear">${years.map((y) => `<option value="${y}" ${y === st.year ? 'selected' : ''}>${y}</option>`).join('')}</select>
          </label>
        </header>
        <div class="lib-body">${st.tab === 'docs' ? docsHtml() : contHtml()}</div>
        <div class="lib-sheet" id="libSheet" hidden></div>
        <input type="file" id="libFile" multiple hidden />
      </section>`;
  }

  // --- Documentos --------------------------------------------------------------------
  function visibleDocs() {
    const q = st.query.toLowerCase();
    let list = st.docs.filter((d) => (st.folder === 'all' || d.folder === st.folder) && (!q || `${d.name} ${FOLDER[d.folder]?.label}`.toLowerCase().includes(q)));
    const amount = (d) => (d.entryId ? Math.abs(entryById(d.entryId)?.amount || 0) : 0);
    if (st.sort === 'old') list = [...list].reverse();
    if (st.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (st.sort === 'amount') list = [...list].sort((a, b) => amount(b) - amount(a));
    return list;
  }

  function docsHtml() {
    const counts = Object.fromEntries(FOLDERS.map((f) => [f.key, st.docs.filter((d) => d.folder === f.key).length]));
    const list = visibleDocs();
    const grouped = st.sort === 'recent' || st.sort === 'old';
    let lastGroup = '';
    const rows = list
      .map((d) => {
        const e = d.entryId ? entryById(d.entryId) : null;
        const kind = fileKind(d.name, d.type);
        const group = `${monthName(Number(d.date.slice(5, 7)) - 1)} ${d.date.slice(0, 4)}`;
        const head = grouped && group !== lastGroup ? `<h5 class="fgroup">${group}</h5>` : '';
        lastGroup = group;
        return `${head}<button class="file ${st.docId === d.id ? 'on' : ''}" data-doc="${d.id}">
          <span class="ftype k-${kind}">${KIND_LABEL[kind]}</span>
          <span class="fname"><b>${esc(d.name)}</b><small>${FOLDER[d.folder]?.label || 'Otros'}${e?.provider ? ` · ${esc(e.provider)}` : ''}${d.user ? ' · <em>subido</em>' : ''}</small></span>
          <span class="fdate">${fmtDate(d.date)}</span>
          <span class="famt ${e ? (e.amount > 0 ? 'in' : 'out') : ''}">${e ? signed(e.amount) : '—'}</span>
          <span class="fsize">${fmtSize(d.size || 0)}</span>
        </button>`;
      })
      .join('');
    const crumb = st.folder === 'all' ? 'Todos los archivos' : FOLDER[st.folder].label;
    return `<div class="docs ${st.docId ? 'with-preview' : ''}">
      <nav class="folders" aria-label="Carpetas">
        <button class="folder ${st.folder === 'all' ? 'on' : ''}" data-folder="all"><span class="fico">🗂️</span>Todos los archivos<span class="fcount">${st.docs.length}</span></button>
        ${FOLDERS.filter((f) => counts[f.key] || f.key !== 'obras')
          .map((f) => `<button class="folder ${st.folder === f.key ? 'on' : ''}" data-folder="${f.key}"><span class="fico">${f.icon}</span>${f.label}<span class="fcount">${counts[f.key]}</span></button>`)
          .join('')}
      </nav>
      <div class="files" id="dropzone">
        <div class="files-bar">
          <div class="crumb"><span>Biblioteca</span> / <b>${crumb}</b> <small>${list.length} archivos</small></div>
          <label class="lib-search"><input id="libSearch" type="search" placeholder="Buscar archivo…" value="${esc(st.query)}" autocomplete="off" /></label>
          <select id="libSort" aria-label="Ordenar">
            <option value="recent" ${st.sort === 'recent' ? 'selected' : ''}>Más recientes</option>
            <option value="old" ${st.sort === 'old' ? 'selected' : ''}>Más antiguos</option>
            <option value="name" ${st.sort === 'name' ? 'selected' : ''}>Nombre</option>
            <option value="amount" ${st.sort === 'amount' ? 'selected' : ''}>Importe</option>
          </select>
          <button class="btn-primary" id="libUpload">⬆ Subir archivos</button>
        </div>
        <div class="files-head"><span></span><span>Nombre</span><span>Fecha</span><span>Importe</span><span>Tamaño</span></div>
        <div class="files-list">${rows || '<p class="empty">No hay archivos en esta carpeta. Arrastra aquí tus facturas o pulsa «Subir archivos».</p>'}</div>
        <div class="drop-hint">Suelta los archivos para subirlos a <b>${crumb === 'Todos los archivos' ? 'la biblioteca' : crumb}</b></div>
      </div>
      ${st.docId ? previewHtml(docById(st.docId)) : ''}
    </div>`;
  }

  function previewHtml(d) {
    if (!d) return '';
    const e = d.entryId ? entryById(d.entryId) : null;
    const kind = fileKind(d.name, d.type);
    let body = '';
    if (d.user && d.url && kind === 'img') {
      body = `<img class="pv-img" src="${d.url}" alt="${esc(d.name)}" />`;
    } else if (e) {
      const isIncome = e.amount > 0;
      const total = Math.abs(e.amount);
      const base = e.vat ? total / 1.21 : total;
      body = `<div class="invoice">
        <div class="inv-head"><b>${isIncome ? 'Recibo' : 'Factura'}</b><span>${fmtDate(e.date)}</span></div>
        <dl>
          <dt>${isIncome ? 'Pagador' : 'Emisor'}</dt><dd>${esc(e.provider || '—')}</dd>
          <dt>${isIncome ? 'Propiedad' : 'Cliente'}</dt><dd>${esc(st.p.owner)}</dd>
          <dt>Concepto</dt><dd>${esc(e.concept)}</dd>
          ${e.vat ? `<dt>Base imponible</dt><dd>${eur2.format(base)}</dd><dt>IVA 21 %</dt><dd>${eur2.format(total - base)}</dd>` : ''}
          <dt class="tot">Total</dt><dd class="tot">${eur2.format(total)}</dd>
          <dt>Estado</dt><dd><span class="state s-${e.status?.split(' ')[0]}">${esc(e.status || '—')}</span></dd>
        </dl>
      </div>`;
    } else if (d.folder === 'contrato') {
      body = contractPreview(d);
    } else {
      body = `<div class="invoice"><div class="inv-head"><b>Documento</b><span>${fmtDate(d.date)}</span></div><p class="muted">Documento archivado sin movimiento contable.</p></div>`;
    }
    return `<aside class="preview" aria-label="Vista previa">
      <div class="pv-head"><span class="ftype k-${kind}">${KIND_LABEL[kind]}</span><b>${esc(d.name)}</b><button class="icon-btn" id="pvClose" aria-label="Cerrar vista previa">✕</button></div>
      <p class="pv-meta">${FOLDER[d.folder]?.label || 'Otros'} · ${fmtSize(d.size || 0)} · ${fmtDate(d.date)}</p>
      ${body}
      <div class="pv-actions">
        ${e ? `<button class="btn-ghost" data-goto-entry="${e.id}">Ver en contabilidad →</button>` : ''}
        ${d.url ? `<a class="btn-ghost" href="${d.url}" target="_blank" rel="noopener">Abrir archivo ↗</a>` : ''}
        ${d.user ? `<button class="btn-danger" data-delete="${d.id.replace('doc-', '')}">Eliminar</button>` : ''}
      </div>
    </aside>`;
  }

  function contractPreview(d) {
    const ks = contractsFor(st.p.id);
    const k = ks.find((x) => d.name.includes(x.unit?.replace(/\W+/g, '') || '§')) || ks[0];
    if (!k) return '';
    return `<div class="invoice">
      <div class="inv-head"><b>${d.name.includes('fianza') ? 'Depósito de fianza' : 'Contrato de arrendamiento'}</b><span>${fmtDate(k.start)}</span></div>
      <dl>
        <dt>Arrendatario</dt><dd>${esc(k.tenant)}${k.unit ? ` · ${esc(k.unit)}` : ''}</dd>
        <dt>Duración</dt><dd>${fmtDate(k.start)} – ${fmtDate(k.end)}</dd>
        <dt>Renta</dt><dd>${eur2.format(k.rent)}/mes</dd>
        <dt>Fianza</dt><dd>${eur2.format(k.deposit)} (${k.depositMonths} ${k.depositMonths === 1 ? 'mes' : 'meses'})</dd>
        <dt>Depositada en</dt><dd>INCASÒL</dd>
      </dl>
    </div>`;
  }

  // --- Contabilidad -------------------------------------------------------------------
  function contHtml() {
    const s = summarize(st.entries, st.year);
    const margin = s.income ? Math.round((s.net / s.income) * 100) : 0;
    const flowList = s.entries.filter((e) => (st.flow === 'all' ? true : st.flow === 'in' ? e.amount > 0 : e.amount < 0));
    const cats = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]);
    const maxCat = cats[0]?.[1] || 1;
    return `<div class="cont">
      <div class="tiles">
        <div class="tile"><small>Ingresos cobrados</small><b class="pos">${eur.format(s.income)}</b><span>${s.entries.filter((e) => e.amount > 0).length} recibos</span></div>
        <div class="tile"><small>Gastos</small><b>${eur.format(s.expenses)}</b><span>${s.entries.filter((e) => e.amount < 0).length} facturas</span></div>
        <div class="tile"><small>Resultado neto</small><b class="${s.net >= 0 ? 'pos' : 'neg'}">${s.net >= 0 ? '+' : '−'}${eur.format(Math.abs(s.net))}</b><span>${s.income ? `Margen ${margin} %` : 'Sin ingresos este año'}</span></div>
        <div class="tile ${s.pending ? 'warn' : ''}"><small>Pendiente de cobro</small><b>${eur.format(s.pending)}</b><span>${s.pending ? '⚠ Recibo sin cobrar' : '✓ Todo cobrado'}</span></div>
      </div>
      <div class="cont-grid">
        <section class="ccard chart-card">
          <div class="ccard-head"><h3>Ingresos y gastos por mes · ${st.year}</h3>
            <div class="legend-inline"><span><i class="sw in"></i>Ingresos</span><span><i class="sw out"></i>Gastos</span></div></div>
          <div class="chart" id="monthChart" data-months='${JSON.stringify(s.months)}'></div>
        </section>
        <section class="ccard">
          <div class="ccard-head"><h3>Gastos por categoría</h3></div>
          ${cats.length ? `<ul class="cats">${cats
            .map(([k, v]) => `<li><span class="cat-name">${CATEGORY_LABEL[k] || k}</span><span class="cat-bar"><i style="width:${(v / maxCat) * 100}%"></i></span><span class="cat-val">${eur.format(v)}</span></li>`)
            .join('')}</ul>` : '<p class="empty">Sin gastos este año.</p>'}
        </section>
      </div>
      <section class="ccard">
        <div class="ccard-head">
          <h3>Movimientos <small>${flowList.length}</small></h3>
          <div class="seg" role="group" aria-label="Filtrar movimientos">
            ${[['all', 'Todos'], ['in', 'Ingresos'], ['out', 'Gastos']].map(([k, l]) => `<button data-flow="${k}" aria-pressed="${st.flow === k}" class="${st.flow === k ? 'on' : ''}">${l}</button>`).join('')}
          </div>
          <span class="spacer"></span>
          <button class="btn-ghost" id="libCsv">Exportar CSV</button>
          <button class="btn-primary" id="libAdd">＋ Añadir gasto</button>
        </div>
        <div class="table-wrap"><table class="moves">
          <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Doc.</th><th class="num">Importe</th></tr></thead>
          <tbody>${flowList
            .map((e) => `<tr class="${st.highlight === e.id ? 'hl' : ''}" id="row-${e.id}">
              <td class="nowrap">${fmtDate(e.date)}</td>
              <td><b>${esc(e.concept)}</b><small>${esc(e.provider || '')}${e.status === 'pendiente' ? ' · <span class="warn">pendiente</span>' : ''}</small></td>
              <td><span class="cat-chip">${CATEGORY_LABEL[e.category] || e.category}</span></td>
              <td>${e.doc ? `<button class="doc-link" data-open-doc="${e.doc.id}" title="${esc(e.doc.name)}" aria-label="Ver documento ${esc(e.doc.name)}">📄</button>` : ''}</td>
              <td class="num ${e.amount > 0 ? 'in' : 'out'}">${signed(e.amount)}</td></tr>`)
            .join('')}</tbody>
        </table></div>
      </section>
    </div>`;
  }

  function drawChart() {
    const box = el.querySelector('#monthChart');
    if (!box) return;
    const months = JSON.parse(box.dataset.months);
    const W = Math.max(320, box.clientWidth);
    const H = 230;
    const pad = { l: 48, r: 8, t: 10, b: 26 };
    const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expenses]));
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    const gw = (W - pad.l - pad.r) / 12;
    const bw = Math.max(3, Math.min(16, gw * 0.32));
    const bar = (x, v, cls) => {
      if (v <= 0) return '';
      const h = Math.max(1, y(0) - y(v));
      const r = Math.min(4, h, bw / 2);
      const y0 = y(0);
      return `<path class="${cls}" d="M${x},${y0} V${y0 - h + r} Q${x},${y0 - h} ${x + r},${y0 - h} H${x + bw - r} Q${x + bw},${y0 - h} ${x + bw},${y0 - h + r} V${y0} Z"/>`;
    };
    let grid = '';
    for (let v = 0; v <= top; v += step) {
      grid += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? `${Math.round(v / 100) / 10} k€` : `${v} €`}</text>`;
    }
    const groups = months
      .map((m, i) => {
        const cx = pad.l + gw * i + gw / 2;
        return `<g class="mg" data-i="${i}">
          <rect class="hit" x="${pad.l + gw * i}" y="${pad.t}" width="${gw}" height="${H - pad.t - pad.b}"/>
          ${bar(cx - bw - 1, m.income, 'b-in')}${bar(cx + 1, m.expenses, 'b-out')}
          <text class="axis" x="${cx}" y="${H - 8}" text-anchor="middle">${gw < 34 ? MONTHS_SHORT[i][0].toUpperCase() : MONTHS_SHORT[i]}</text></g>`;
      })
      .join('');
    box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos por mes">${grid}${groups}</svg><div class="ctip" hidden></div>`;
    const tip = box.querySelector('.ctip');
    box.querySelectorAll('.mg').forEach((g) => {
      g.addEventListener('pointerenter', () => {
        const m = months[g.dataset.i];
        box.querySelectorAll('.mg').forEach((o) => o.classList.toggle('dim', o !== g));
        tip.innerHTML = `<b>${monthName(m.m)} ${st.year}</b><span><i class="sw in"></i>Ingresos <b>${eur.format(m.income)}</b></span><span><i class="sw out"></i>Gastos <b>${eur.format(m.expenses)}</b></span><span>Resultado <b>${m.income - m.expenses >= 0 ? '+' : '−'}${eur.format(Math.abs(m.income - m.expenses))}</b></span>`;
        tip.hidden = false;
        const gx = pad.l + gw * Number(g.dataset.i) + gw / 2;
        tip.style.left = `${Math.min(W - 180, Math.max(0, gx - 90))}px`;
      });
      g.addEventListener('pointerleave', () => {
        tip.hidden = true;
        box.querySelectorAll('.mg').forEach((o) => o.classList.remove('dim'));
      });
    });
  }
  function niceStep(raw) {
    const p = 10 ** Math.floor(Math.log10(raw || 1));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  // --- Formulario: subir factura / añadir gasto ---------------------------------------
  function openForm(file = null) {
    const sheet = el.querySelector('#libSheet');
    const remaining = st.queue.length;
    const defaultFolder = st.folder !== 'all' ? st.folder : file ? 'mantenimiento' : 'mantenimiento';
    const concept = file ? file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') : '';
    sheet.innerHTML = `<form class="sheet-card" id="entryForm">
      <h3>${file ? 'Archivar documento' : 'Añadir gasto'}${remaining ? ` <small>(quedan ${remaining} más)</small>` : ''}</h3>
      ${file ? `<p class="sheet-file"><span class="ftype k-${fileKind(file.name, file.type)}">${KIND_LABEL[fileKind(file.name, file.type)]}</span>${esc(file.name)} · ${fmtSize(file.size)}</p>` : ''}
      <div class="form-grid">
        <label>Carpeta<select id="fFolder">${FOLDERS.map((f) => `<option value="${f.key}" ${f.key === defaultFolder ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label>
        <label>Fecha<input id="fDate" type="date" value="${todayIso()}" required /></label>
        <label class="wide">Concepto<input id="fConcept" type="text" value="${esc(concept)}" required placeholder="Ej.: Reparación de caldera" /></label>
        <label>Proveedor<input id="fProvider" type="text" placeholder="Ej.: Fontaneria Pujol" /></label>
        <label>Importe (€)<input id="fAmount" type="number" step="0.01" min="0" inputmode="decimal" placeholder="${file ? 'Opcional' : '0,00'}" ${file ? '' : 'required'} /></label>
        <label>Tipo<select id="fType"><option value="out">Gasto</option><option value="in">Ingreso</option></select></label>
        ${file ? '' : '<label class="wide">Factura (opcional)<input id="fFile" type="file" /></label>'}
      </div>
      <p class="sheet-note">Si indicas un importe, el movimiento se suma a la contabilidad del inmueble.</p>
      <div class="sheet-actions"><button type="button" class="btn-ghost" id="fCancel">Cancelar</button><button class="btn-primary" type="submit">Guardar</button></div>
    </form>`;
    sheet.hidden = false;
    sheet.querySelector('#fConcept').focus();
    sheet.querySelector('#fCancel').addEventListener('click', () => {
      st.queue = [];
      sheet.hidden = true;
    });
    sheet.querySelector('#entryForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = (id) => sheet.querySelector(id);
      const chosen = file || f('#fFile')?.files?.[0] || null;
      const folder = f('#fFolder').value;
      const value = parseFloat(f('#fAmount').value);
      const amount = Number.isFinite(value) && value > 0 ? (f('#fType').value === 'in' ? value : -value) : 0;
      const id = `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const category = amount > 0 ? 'alquiler' : ['contrato', 'otros'].includes(folder) ? 'otros' : folder;
      const entry = {
        id,
        pid: st.p.id,
        date: f('#fDate').value,
        concept: f('#fConcept').value.trim(),
        provider: f('#fProvider').value.trim(),
        category: folder === 'alquiler' && amount > 0 ? 'alquiler' : category,
        amount,
        status: amount > 0 ? 'cobrado' : 'pagado',
        doc: chosen ? { name: chosen.name, folder, date: f('#fDate').value, size: chosen.size, type: chosen.type, blob: chosen } : null,
      };
      if (!entry.doc && !amount) return;
      await saveEntry(entry);
      sheet.hidden = true;
      await load();
      st.docId = entry.doc ? `doc-${id}` : null;
      if (st.queue.length) {
        render();
        openForm(st.queue.shift());
      } else {
        render();
        toast(entry.doc ? 'Documento archivado' : 'Gasto añadido');
      }
    });
  }

  function startUpload(files) {
    st.queue = [...files];
    if (st.queue.length) openForm(st.queue.shift());
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'lib-toast';
    t.textContent = msg;
    el.querySelector('.lib-win').appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function exportCsv() {
    const s = summarize(st.entries, st.year);
    const rows = [['Fecha', 'Concepto', 'Proveedor', 'Categoría', 'Estado', 'Importe', 'Documento']];
    for (const e of [...s.entries].reverse()) {
      rows.push([e.date, e.concept, e.provider || '', CATEGORY_LABEL[e.category] || e.category, e.status || '', e.amount.toFixed(2).replace('.', ','), e.doc?.name || '']);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `Contabilidad_${st.p.id}_${st.year}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------------------------------------------------------------------------------
  function render() {
    const scroll = el.querySelector('.files-list')?.scrollTop;
    el.innerHTML = frame();
    if (scroll) el.querySelector('.files-list') && (el.querySelector('.files-list').scrollTop = scroll);
    drawChart();
    if (st.highlight) {
      el.querySelector(`#row-${CSS.escape(st.highlight)}`)?.scrollIntoView({ block: 'center' });
    }
  }

  el.addEventListener('click', async (ev) => {
    const t = ev.target.closest('button, [data-close], a');
    if (!t) return;
    if (t.hasAttribute('data-close')) return close();
    if (t.dataset.tab) {
      st.tab = t.dataset.tab;
      st.highlight = null;
      return render();
    }
    if (t.dataset.folder) {
      st.folder = t.dataset.folder;
      st.docId = null;
      return render();
    }
    if (t.dataset.doc) {
      st.docId = st.docId === t.dataset.doc ? null : t.dataset.doc;
      return render();
    }
    if (t.id === 'pvClose') {
      st.docId = null;
      return render();
    }
    if (t.dataset.gotoEntry) {
      const e = entryById(t.dataset.gotoEntry);
      st.tab = 'cont';
      st.year = Number(e.date.slice(0, 4));
      st.flow = 'all';
      st.highlight = e.id;
      return render();
    }
    if (t.dataset.openDoc) {
      const d = docById(t.dataset.openDoc);
      st.tab = 'docs';
      st.folder = d?.folder || 'all';
      st.docId = t.dataset.openDoc;
      st.query = '';
      render();
      el.querySelector(`[data-doc="${CSS.escape(st.docId)}"]`)?.scrollIntoView({ block: 'center' });
      return;
    }
    if (t.dataset.flow) {
      st.flow = t.dataset.flow;
      return render();
    }
    if (t.dataset.delete) {
      await deleteEntry(t.dataset.delete);
      st.docId = null;
      await load();
      render();
      return toast('Documento eliminado');
    }
    if (t.id === 'libUpload') return el.querySelector('#libFile').click();
    if (t.id === 'libAdd') return openForm(null);
    if (t.id === 'libCsv') return exportCsv();
  });
  el.addEventListener('change', (ev) => {
    if (ev.target.id === 'libYear') {
      st.year = Number(ev.target.value);
      st.highlight = null;
      render();
    }
    if (ev.target.id === 'libSort') {
      st.sort = ev.target.value;
      render();
    }
    if (ev.target.id === 'libFile') {
      startUpload(ev.target.files);
      ev.target.value = '';
    }
  });
  el.addEventListener('input', (ev) => {
    if (ev.target.id === 'libSearch') {
      st.query = ev.target.value;
      const pos = ev.target.selectionStart;
      render();
      const input = el.querySelector('#libSearch');
      input.focus();
      input.setSelectionRange(pos, pos);
    }
  });
  // Arrastrar y soltar
  el.addEventListener('dragover', (ev) => {
    if (!el.querySelector('#dropzone') || !ev.dataTransfer?.types.includes('Files')) return;
    ev.preventDefault();
    el.querySelector('#dropzone').classList.add('dragging');
  });
  el.addEventListener('dragleave', (ev) => {
    if (ev.target.id === 'dropzone' || !el.contains(ev.relatedTarget)) el.querySelector('#dropzone')?.classList.remove('dragging');
  });
  el.addEventListener('drop', (ev) => {
    const dz = el.querySelector('#dropzone');
    if (!dz) return;
    ev.preventDefault();
    dz.classList.remove('dragging');
    startUpload(ev.dataTransfer.files);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !el.hidden) {
      ev.stopImmediatePropagation();
      const sheet = el.querySelector('#libSheet');
      if (sheet && !sheet.hidden) sheet.hidden = true;
      else close();
    }
  }, true);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => !el.hidden && drawChart(), 120);
  });

  async function open(p, tab = 'docs') {
    st.p = p;
    st.tab = tab;
    st.folder = 'all';
    st.docId = null;
    st.query = '';
    st.flow = 'all';
    st.highlight = null;
    st.year = Number(DEMO_TODAY.slice(0, 4));
    await load();
    el.hidden = false;
    document.body.classList.add('lib-open');
    render();
    el.querySelector('.lib-back')?.focus();
  }
  function close() {
    el.hidden = true;
    document.body.classList.remove('lib-open');
  }

  return { open, close, summary: (p) => summarize(buildLedger(p).entries, Number(DEMO_TODAY.slice(0, 4))), docCount: (p) => buildLedger(p).docs.length };
}
