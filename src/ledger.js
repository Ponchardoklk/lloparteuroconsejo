// Contabilidad y documentos de ejemplo de cada inmueble.
// Genera, de forma determinista, los movimientos (recibos de alquiler, comunidad, honorarios,
// IBI, seguro, suministros, mantenimiento y obras) desde enero de 2025 hasta DEMO_TODAY,
// cada uno con su documento (factura o recibo) archivado en su carpeta.
import { CONTRACTS, DEMO_TODAY } from './data.js';

export const FOLDERS = [
  { key: 'contrato', label: 'Contratos y fianzas', icon: '📑' },
  { key: 'alquiler', label: 'Recibos de alquiler', icon: '💶' },
  { key: 'comunidad', label: 'Comunidad', icon: '🏢' },
  { key: 'honorarios', label: 'Honorarios de gestión', icon: '🧾' },
  { key: 'impuestos', label: 'Impuestos y tasas', icon: '🏛️' },
  { key: 'seguros', label: 'Seguros', icon: '🛡️' },
  { key: 'suministros', label: 'Suministros', icon: '💡' },
  { key: 'mantenimiento', label: 'Mantenimiento y reparaciones', icon: '🔧' },
  { key: 'obras', label: 'Obras y reformas', icon: '🏗️' },
  { key: 'otros', label: 'Otros documentos', icon: '📁' },
];
export const FOLDER = Object.fromEntries(FOLDERS.map((f) => [f.key, f]));

// Categorías contables (= carpetas con importes). Los ingresos son "alquiler".
export const CATEGORY_LABEL = {
  alquiler: 'Alquiler',
  comunidad: 'Comunidad',
  honorarios: 'Honorarios de gestión',
  impuestos: 'Impuestos y tasas',
  seguros: 'Seguros',
  suministros: 'Suministros',
  mantenimiento: 'Mantenimiento',
  obras: 'Obras y reformas',
  otros: 'Otros',
};

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthName = (m) => MONTH_NAMES[m];

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const round2 = (n) => Math.round(n * 100) / 100;

function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const MAINTENANCE = [
  ['Reparación de fontanería', 'Fontaneria Pujol', 120, 380],
  ['Revisión de caldera', 'Calefaccions del Pirineu', 90, 160],
  ['Cambio de persiana', 'Persianes Roca', 140, 260],
  ['Pintura y repasos', 'Pintures Vidal', 300, 900],
  ['Cerrajería: cambio de bombín', 'Serralleria Font', 80, 150],
  ['Electricista: cuadro eléctrico', 'Instal·lacions Mas', 160, 420],
  ['Reparación de electrodoméstico', 'Servei Tècnic Casals', 90, 240],
];

// Cache por inmueble: el cálculo es determinista.
const cache = new Map();

export function buildLedger(p) {
  if (cache.has(p.id)) return cache.get(p.id);
  const rnd = seeded(p.id);
  const contracts = CONTRACTS[p.id] || [];
  const today = DEMO_TODAY;
  const [ty, tm, td] = today.split('-').map(Number);
  const out = [];
  const docs = [];
  let n = 0;
  const add = (e) => {
    if (e.date > today) return;
    const id = `${p.id}-${++n}`;
    const entry = { id, pid: p.id, ...e, amount: round2(e.amount) };
    if (e.doc !== false) {
      entry.doc = {
        id: `doc-${id}`,
        name: e.docName,
        folder: e.folder || e.category,
        date: e.date,
        size: Math.round(60 + rnd() * 380) * 1024,
        entryId: id,
      };
      docs.push(entry.doc);
    }
    out.push(entry);
  };
  const isBcn = p.zone === 'bcn';
  const city = p.city.replace(/ \(.*\)/, '');
  const multi = contracts.length > 1;
  const slug = p.name.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/_+$/, '');

  // --- Documentos de contrato (sin importe)
  contracts.forEach((k, i) => {
    const who = multi ? `_${k.unit.replace(/\W+/g, '')}` : '';
    docs.push({ id: `doc-${p.id}-ctr-${i}`, name: `Contrato_arrendamiento${who}_${k.start.slice(0, 4)}.pdf`, folder: 'contrato', date: k.start, size: 412 * 1024 });
    if (k.start <= today) docs.push({ id: `doc-${p.id}-fz-${i}`, name: `Justificante_fianza_INCASOL${who}.pdf`, folder: 'contrato', date: k.start, size: 96 * 1024 });
  });
  docs.push({ id: `doc-${p.id}-ce`, name: 'Certificado_eficiencia_energetica.pdf', folder: 'otros', date: '2024-03-12', size: 640 * 1024 });
  docs.push({ id: `doc-${p.id}-ch`, name: 'Cedula_habitabilidad.pdf', folder: 'otros', date: '2023-05-08', size: 210 * 1024 });

  // --- Movimientos mes a mes
  const annualMonthIbi = isBcn ? 5 : 8; // junio en Barcelona, septiembre en Puigcerdà
  const annualMonthSeguro = Math.floor(rnd() * 12);
  for (let y = 2025; y <= ty; y++) {
    for (let m = 0; m < 12; m++) {
      if (y === ty && m > tm - 1) break;
      const ym = `${y}-${pad(m + 1)}`;
      const mname = monthName(m);
      // Ingresos: recibos de alquiler
      const active = contracts.filter((k) => k.start.slice(0, 7) <= ym && k.end.slice(0, 7) >= ym);
      if (active.length) {
        const total = active.reduce((s, k) => s + k.rent, 0);
        const lastMonth = y === ty && m === tm - 1;
        const pending = lastMonth && p.payments.at(-1) === 'late';
        const late = !pending && y === ty && m >= tm - 6 && p.payments[m - (tm - 6)] === 'late';
        add({
          date: iso(y, m, late ? 12 : pending ? 5 : 3),
          concept: multi ? `Remesa de recibos ${mname} (${active.length} contratos)` : `Recibo alquiler ${mname} · ${active[0].tenant}`,
          category: 'alquiler',
          provider: multi ? `${active.length} inquilinos` : active[0].tenant,
          amount: total,
          status: pending ? 'pendiente' : late ? 'cobrado con retraso' : 'cobrado',
          docName: `Recibo_alquiler_${ym}_${p.id}.pdf`,
        });
        // Honorarios de gestión: 6 % de lo cobrado (+ IVA)
        if (!pending) {
          add({
            date: iso(y, m, 10),
            concept: `Honorarios de gestión ${mname}`,
            category: 'honorarios',
            provider: 'Llopart Euroconsejo',
            amount: -(total * 0.06 * 1.21),
            vat: true,
            status: 'pagado',
            docName: `Factura_honorarios_${ym}.pdf`,
          });
        }
      }
      // Comunidad / mantenimiento del edificio
      if (p.type === 'edificio') {
        add({ date: iso(y, m, 5), concept: `Mantenimiento ascensor ${mname}`, category: 'mantenimiento', provider: 'Ascensors BCN', amount: -(180 * 1.21), vat: true, status: 'pagado', docName: `Factura_ascensor_${ym}.pdf` });
        add({ date: iso(y, m, 6), concept: `Limpieza zonas comunes ${mname}`, category: 'comunidad', provider: 'Neteges Eixample', amount: -(420 * 1.21), vat: true, status: 'pagado', docName: `Factura_limpieza_${ym}.pdf` });
        add({ date: iso(y, m, 20), concept: `Luz zonas comunes ${mname}`, category: 'suministros', provider: 'Compañía eléctrica', amount: -(95 + rnd() * 40), status: 'pagado', docName: `Factura_luz_comunes_${ym}.pdf` });
      } else if (!['chalet', 'masia', 'nave'].includes(p.type)) {
        const fee = { piso: 95, atico: 185, local: 140, oficina: 320, adosado: 60 }[p.type] || 90;
        add({ date: iso(y, m, 2), concept: `Cuota comunidad ${mname}`, category: 'comunidad', provider: `Comunidad de propietarios ${p.address.split(',')[0]}`, amount: -fee, status: 'pagado', docName: `Recibo_comunidad_${ym}.pdf` });
      }
      // Suministros a cargo de la propiedad cuando está vacío o en obras (bimestral)
      if (!active.length && m % 2 === 0) {
        add({ date: iso(y, m, 18), concept: `Luz y agua ${mname}`, category: 'suministros', provider: 'Compañías suministradoras', amount: -(45 + rnd() * 50), status: 'pagado', docName: `Factura_suministros_${ym}.pdf` });
      }
      // IBI y tasa de residuos
      if (m === annualMonthIbi) {
        add({ date: iso(y, m, 15), concept: `IBI ${y}`, category: 'impuestos', provider: `Ajuntament de ${city}`, amount: -(p.m2 * (isBcn ? 4.6 : 3.1)), status: 'pagado', docName: `IBI_${y}.pdf` });
        add({ date: iso(y, m, 15), concept: `Tasa de residuos ${y}`, category: 'impuestos', provider: `Ajuntament de ${city}`, amount: -(isBcn ? 96 : 74), status: 'pagado', docName: `Tasa_residuos_${y}.pdf` });
      }
      // Seguro multirriesgo anual
      if (m === annualMonthSeguro) {
        add({ date: iso(y, m, 1), concept: `Seguro multirriesgo ${y}`, category: 'seguros', provider: 'Aseguradora (póliza multirriesgo)', amount: -(140 + p.m2 * 1.1), status: 'pagado', docName: `Poliza_seguro_${y}.pdf` });
      }
      // Reparaciones puntuales
      if (rnd() < (p.type === 'edificio' ? 0.35 : 0.14)) {
        const [concept, provider, lo, hi] = MAINTENANCE[Math.floor(rnd() * MAINTENANCE.length)];
        add({ date: iso(y, m, 8 + Math.floor(rnd() * 18)), concept, category: 'mantenimiento', provider, amount: -((lo + rnd() * (hi - lo)) * 1.21), vat: true, status: 'pagado', docName: `Factura_${concept.split(/[:\s]/)[0].toLowerCase()}_${ym}.pdf` });
      }
    }
  }

  // Obras de reforma (certificaciones)
  if (p.reform) {
    const r = p.reform;
    const parts = [0.3, 0.42, 0.28];
    ['2026-09-30', '2026-10-31', '2026-11-15'].forEach((d, i) => {
      add({ date: d, concept: `Certificación de obra nº ${i + 1}`, category: 'obras', provider: r.company, amount: -(r.spent * parts[i]), vat: true, status: 'pagado', docName: `Certificacion_obra_${i + 1}.pdf` });
    });
    docs.push({ id: `doc-${p.id}-pres`, name: 'Presupuesto_reforma_integral.pdf', folder: 'obras', date: r.start, size: 1210 * 1024 });
  }

  out.sort((a, b) => b.date.localeCompare(a.date));
  docs.sort((a, b) => b.date.localeCompare(a.date));
  const result = { entries: out, docs, slug, td };
  cache.set(p.id, result);
  return result;
}

// Próxima revisión anual (fecha aniversario del contrato posterior a hoy)
export function nextReview(k, today = DEMO_TODAY) {
  const [, m0, d0] = k.start.split('-').map(Number);
  const y = Number(today.slice(0, 4));
  let candidate = `${y}-${pad(m0)}-${pad(d0)}`;
  if (candidate <= today) candidate = `${y + 1}-${pad(m0)}-${pad(d0)}`;
  if (candidate <= k.start) return null;
  return candidate > k.end ? null : candidate;
}

export function summarize(entries, year) {
  const yearEntries = entries.filter((e) => e.date.startsWith(String(year)));
  const income = yearEntries.filter((e) => e.amount > 0 && e.status !== 'pendiente').reduce((s, e) => s + e.amount, 0);
  const pending = yearEntries.filter((e) => e.status === 'pendiente').reduce((s, e) => s + e.amount, 0);
  const expenses = -yearEntries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
  const months = Array.from({ length: 12 }, (_, m) => ({ m, income: 0, expenses: 0 }));
  const byCat = {};
  for (const e of yearEntries) {
    const m = Number(e.date.slice(5, 7)) - 1;
    if (e.amount > 0) {
      if (e.status !== 'pendiente') months[m].income += e.amount;
    } else {
      months[m].expenses -= e.amount;
      byCat[e.category] = (byCat[e.category] || 0) - e.amount;
    }
  }
  return { income, expenses, net: income - expenses, pending, months, byCat, entries: yearEntries };
}
