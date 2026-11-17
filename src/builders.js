// Constructores de geometría low-poly para cada tipo de inmueble y elementos del barrio.
import * as THREE from 'three';

const geoCache = new Map();
function box(w, h, d) {
  const k = `b${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}

export const M = {
  wall: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.9 }),
  wallWarm: new THREE.MeshStandardMaterial({ color: '#efd9b9', roughness: 0.9 }),
  wallStone: new THREE.MeshStandardMaterial({ color: '#d9cdb8', roughness: 0.95 }),
  wallBlue: new THREE.MeshStandardMaterial({ color: '#e6ecf7', roughness: 0.85 }),
  wallGrey: new THREE.MeshStandardMaterial({ color: '#cfd5df', roughness: 0.85 }),
  brand: new THREE.MeshStandardMaterial({ color: '#2f5bea', roughness: 0.6 }),
  brandDark: new THREE.MeshStandardMaterial({ color: '#2346b8', roughness: 0.6 }),
  roof: new THREE.MeshStandardMaterial({ color: '#c8693f', roughness: 0.8 }),
  roofDark: new THREE.MeshStandardMaterial({ color: '#8f4a32', roughness: 0.8 }),
  roofFlat: new THREE.MeshStandardMaterial({ color: '#b9c0cc', roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: '#7fa6d9', roughness: 0.15, metalness: 0.3 }),
  glassDark: new THREE.MeshStandardMaterial({ color: '#4d6f9e', roughness: 0.2, metalness: 0.4 }),
  windowLit: new THREE.MeshStandardMaterial({ color: '#8fb3e0', roughness: 0.2, metalness: 0.2, emissive: '#ffcf7a', emissiveIntensity: 0 }),
  windowDark: new THREE.MeshStandardMaterial({ color: '#8fb3e0', roughness: 0.2, metalness: 0.2 }),
  door: new THREE.MeshStandardMaterial({ color: '#6b4a34', roughness: 0.8 }),
  metal: new THREE.MeshStandardMaterial({ color: '#9aa3b2', roughness: 0.5, metalness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: '#3b4352', roughness: 0.7 }),
  white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }),
  grass: new THREE.MeshStandardMaterial({ color: '#cfe8b8', roughness: 1 }),
  grassDark: new THREE.MeshStandardMaterial({ color: '#a9d48a', roughness: 1 }),
  paving: new THREE.MeshStandardMaterial({ color: '#e7e9ee', roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: '#4fc3e8', roughness: 0.1, metalness: 0.1, emissive: '#1a90c0', emissiveIntensity: 0.15 }),
  hedge: new THREE.MeshStandardMaterial({ color: '#6fb35a', roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: '#8a6446', roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#7cc46a', roughness: 1, flatShading: true }),
  leafDark: new THREE.MeshStandardMaterial({ color: '#4f9e4a', roughness: 1, flatShading: true }),
  scaffold: new THREE.MeshStandardMaterial({ color: '#f2a93b', roughness: 0.6 }),
  crane: new THREE.MeshStandardMaterial({ color: '#f5c026', roughness: 0.6 }),
  slate: new THREE.MeshStandardMaterial({ color: '#4b5262', roughness: 0.85 }),
  slateDark: new THREE.MeshStandardMaterial({ color: '#3a404d', roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: '#c8b896', roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.9 }),
  snow: new THREE.MeshStandardMaterial({ color: '#fbfdff', roughness: 0.9 }),
  pine: new THREE.MeshStandardMaterial({ color: '#3f7f52', roughness: 1, flatShading: true }),
  lamp: new THREE.MeshStandardMaterial({ color: '#fff4c9', emissive: '#ffd27a', emissiveIntensity: 0.1 }),
};

export function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function boxAt(parent, w, h, d, mat, x, y, z) {
  // y es la base del bloque
  return mesh(box(w, h, d), mat, x, y + h / 2, z, parent);
}

// Determinista para que la escena sea siempre igual.
let seed = 7;
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function gableRoof(w, h, d, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Ventanas en las 4 fachadas de un volumen centrado en (cx, cz).
function windows(parent, { w, d, y0, floors, floorH, cols, colsD, cx = 0, cz = 0, size = [0.55, 0.7], litRatio = 0.45, skipGroundFront = false }) {
  const [ww, wh] = size;
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * floorH + floorH * 0.35;
    const faces = [
      { n: cols, len: w, place: (t) => [cx + t, cz + d / 2 + 0.02], rot: 0 },
      { n: cols, len: w, place: (t) => [cx + t, cz - d / 2 - 0.02], rot: 0 },
      { n: colsD, len: d, place: (t) => [cx + w / 2 + 0.02, cz + t], rot: Math.PI / 2 },
      { n: colsD, len: d, place: (t) => [cx - w / 2 - 0.02, cz + t], rot: Math.PI / 2 },
    ];
    faces.forEach((face, fi) => {
      if (skipGroundFront && f === 0 && fi === 0) return;
      for (let i = 0; i < face.n; i++) {
        const t = -face.len / 2 + (face.len / face.n) * (i + 0.5);
        const [x, z] = face.place(t);
        const mat = rand() < litRatio ? M.windowLit : M.windowDark;
        const m = mesh(box(ww, wh, 0.08), mat, x, y + wh / 2, z, parent);
        m.rotation.y = face.rot;
        m.castShadow = false;
      }
    });
  }
}

export function tree(parent, x, z, s = 1, dark = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 1.2 * s, 6), M.trunk, 0, 0.6 * s, 0, g);
  const crown = mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), dark ? M.leafDark : M.leaf, 0, 1.75 * s, 0, g);
  crown.userData.sway = rand() * Math.PI * 2;
  parent.add(g);
  return crown;
}

function hedgeRow(parent, x, z, len, alongX) {
  boxAt(parent, alongX ? len : 0.5, 0.6, alongX ? 0.5 : len, M.hedge, x, 0.2, z);
}

function lot(group, w, d, mat = M.paving) {
  boxAt(group, w, 0.2, d, mat, 0, 0, 0);
}

// ---------------------------------------------------------------------------
// Tipos de inmueble. Cada constructor devuelve la altura total para colocar el marcador.

const isMountain = (p) => p.zone === 'pcd';
const roofOf = (p, dark) => (isMountain(p) ? (dark ? M.slateDark : M.slate) : dark ? M.roofDark : M.roof);

// Chimenea; en la montaña humea (el humo lo anima la escena).
function chimney(g, x, y, z, anim, smoking) {
  const c = boxAt(g, 0.5, 1.4, 0.5, M.stone, x, y, z);
  if (smoking) anim.chimneys.push(c);
  return c;
}

function buildChalet(g, p, anim) {
  lot(g, 9, 9, M.grass);
  const wallMat = isMountain(p) ? M.stone : M.wall;
  boxAt(g, 5.4, 3, 4.2, wallMat, -0.8, 0.2, -1);
  boxAt(g, 3, 2.2, 3, M.wall, 1.9, 0.2, -1.6);
  chimney(g, -2.6, 3.6, -1.6, anim, isMountain(p));
  const r1 = gableRoof(6.0, 1.8, 4.8, roofOf(p));
  r1.position.set(-0.8, 3.2, -1);
  g.add(r1);
  const r2 = gableRoof(3.4, 1.2, 3.4, roofOf(p, true));
  r2.rotation.y = Math.PI / 2;
  r2.position.set(1.9, 2.4, -1.6);
  g.add(r2);
  boxAt(g, 0.8, 1.6, 0.1, M.door, -0.8, 0.2, 1.12);
  windows(g, { w: 5.4, d: 4.2, y0: 0.2, floors: 2, floorH: 1.45, cols: 3, colsD: 2, cx: -0.8, cz: -1, size: [0.6, 0.6], skipGroundFront: false });
  // Porche
  boxAt(g, 2.4, 0.12, 1.4, M.paving, -0.8, 0.2, 1.8);
  if (p.features.some((f) => f.startsWith('Piscina'))) {
    boxAt(g, 3.6, 0.15, 2.2, M.white, 2.2, 0.2, 2.6);
    const water = boxAt(g, 3.2, 0.1, 1.8, M.water, 2.2, 0.28, 2.6);
    water.castShadow = false;
    anim.pools.push(water);
  } else {
    // Leña apilada y bancal
    for (let i = 0; i < 3; i++) boxAt(g, 1.6, 0.35, 0.6, M.wood, 2.2, 0.2 + i * 0.36, 3.2);
    boxAt(g, 2.6, 0.1, 1.4, M.grassDark, 2.2, 0.2, 1.6);
  }
  // Setos y árboles
  hedgeRow(g, 0, -4.2, 8.6, true);
  hedgeRow(g, -4.2, 0, 8.6, false);
  anim.trees.push(tree(g, -3.3, 3.2, 0.9), tree(g, 3.4, -3.4, 0.8, true));
  boxAt(g, 1.8, 0.12, 3, M.dark, 3.2, 0.2, -1.6 + 3); // acceso garaje
  return 5;
}

function buildAdosados(g, p, anim) {
  lot(g, 9, 8, M.grass);
  const cols = [M.wall, M.wallWarm, M.wallBlue];
  for (let i = 0; i < 3; i++) {
    const x = -2.9 + i * 2.9;
    boxAt(g, 2.8, 3.4, 4.2, cols[i], x, 0.2, -1);
    // tejado con cumbrera paralela a la calle
    const r2 = gableRoof(4.6, 1.3, 2.95, roofOf(p, i === 1));
    r2.rotation.y = Math.PI / 2;
    r2.position.set(x, 3.6, -1);
    g.add(r2);
    boxAt(g, 0.7, 1.5, 0.1, M.door, x - 0.6, 0.2, 1.12);
    windows(g, { w: 2.8, d: 4.2, y0: 0.2, floors: 2, floorH: 1.6, cols: 2, colsD: i === 0 || i === 2 ? 2 : 0, cx: x, cz: -1, size: [0.55, 0.65] });
    chimney(g, x + 0.9, 3.9, -2.2, anim, isMountain(p) && i !== 1);
    // Placas solares
    const panel = boxAt(g, 1.6, 0.06, 1.1, M.glassDark, x, 4.05, 0.05);
    panel.rotation.x = -0.5;
    // patio delantero
    boxAt(g, 2.6, 0.08, 2, M.grassDark, x, 0.2, 2.2);
    hedgeRow(g, x + 1.42, 2.2, 2, false);
  }
  anim.trees.push(tree(g, -3.6, 3.3, 0.7), tree(g, 3.6, 3.3, 0.7, true));
  return 5.2;
}

function buildEdificio(g, p) {
  lot(g, 9, 9);
  const floors = p.floors || 6;
  const fh = 1.35;
  const h = floors * fh;
  boxAt(g, 7, 1.4, 6, M.brandDark, 0, 0.2, 0); // planta baja
  boxAt(g, 7, h - 1.4, 6, M.wallStone, 0, 1.6, 0);
  boxAt(g, 1.6, 1.1, 0.1, M.glass, 0, 0.2, 3.02);
  windows(g, { w: 7, d: 6, y0: 1.6, floors: floors - 1, floorH: fh, cols: 4, colsD: 3, size: [0.8, 0.75] });
  // Balcones
  for (let f = 1; f < floors; f++) {
    for (let i = 0; i < 4; i++) {
      const x = -3.5 + (7 / 4) * (i + 0.5);
      boxAt(g, 1.2, 0.08, 0.5, M.white, x, 0.2 + f * fh + 0.05, 3.25);
      boxAt(g, 1.2, 0.45, 0.04, M.metal, x, 0.2 + f * fh + 0.1, 3.5);
    }
  }
  // Cubierta
  boxAt(g, 7.2, 0.25, 6.2, M.roofFlat, 0, 0.2 + h, 0);
  boxAt(g, 1.4, 0.9, 1.4, M.metal, -2, 0.45 + h, -1.5);
  boxAt(g, 1.2, 1.3, 1.2, M.wallGrey, 2.2, 0.45 + h, 1.4);
  return h + 1.8;
}

function buildAtico(g, p, anim) {
  lot(g, 9, 9);
  const floors = p.floors || 10;
  const fh = 1.25;
  const h = floors * fh;
  boxAt(g, 5, h - fh, 5, M.wallBlue, 0, 0.2, 0);
  // Bandas de vidrio
  for (let f = 0; f < floors - 1; f++) {
    const y = 0.2 + f * fh + 0.35;
    const mat = rand() < 0.4 ? M.windowLit : M.glass;
    boxAt(g, 5.04, 0.6, 5.04, mat, 0, y, 0).castShadow = false;
  }
  // Ático retranqueado con terraza (el inmueble gestionado)
  const top = 0.2 + h - fh;
  boxAt(g, 5.3, 0.12, 5.3, M.white, 0, top, 0);
  boxAt(g, 3, fh, 3, M.brand, -0.9, top + 0.12, -0.9);
  boxAt(g, 2.95, 0.7, 0.05, M.glass, -0.9, top + 0.4, 0.62);
  for (const [x, z, w, d] of [[0, 2.62, 5.3, 0.05], [2.62, 0, 0.05, 5.3]]) boxAt(g, w, 0.5, d, M.glass, x, top + 0.12, z);
  anim.trees.push(tree(g, 1.6, 1.6, 0.35));
  // Árboles alrededor
  anim.trees.push(tree(g, -3.6, 3.6, 0.8), tree(g, 3.6, -3.6, 0.7, true));
  return h + 1.6;
}

function awningTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 8;
  const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? '#ffffff' : '#2f5bea';
    x.fillRect(i * 8, 0, 8, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildLocal(g) {
  lot(g, 9, 9);
  boxAt(g, 7.5, 2.4, 5.5, M.wallWarm, 0, 0.2, -0.5);
  boxAt(g, 7.5, 3, 5.5, M.wallStone, 0, 2.6, -0.5);
  boxAt(g, 6.6, 1.8, 0.08, M.glass, 0, 0.35, 2.27); // escaparate
  boxAt(g, 0.08, 1.8, 4, M.glass, 3.77, 0.35, -0.5);
  const aw = new THREE.Mesh(box(7, 0.08, 1.4), new THREE.MeshStandardMaterial({ map: awningTexture(), roughness: 0.8 }));
  aw.position.set(0, 2.45, 2.9);
  aw.rotation.x = 0.35;
  aw.castShadow = true;
  g.add(aw);
  boxAt(g, 3.2, 0.5, 0.1, M.brand, 0, 2.75, 2.3); // rótulo
  windows(g, { w: 7.5, d: 5.5, y0: 2.6, floors: 2, floorH: 1.4, cols: 4, colsD: 3, cz: -0.5, size: [0.7, 0.8] });
  boxAt(g, 7.7, 0.2, 5.7, M.roofFlat, 0, 5.6, -0.5);
  // Mesas de terraza
  for (const x of [-2.5, 0, 2.5]) {
    boxAt(g, 0.08, 0.6, 0.08, M.metal, x, 0.2, 3.8);
    boxAt(g, 0.8, 0.06, 0.8, M.white, x, 0.8, 3.8);
  }
  return 7.4;
}

function buildPiso(g, p, anim) {
  lot(g, 9, 9);
  const floors = p.floors || 4;
  const fh = 1.5;
  const h = floors * fh;
  boxAt(g, 6.6, h, 5.6, p.status === 'reforma' ? M.wallWarm : M.wallStone, 0, 0.2, 0);
  windows(g, { w: 6.6, d: 5.6, y0: 0.2, floors, floorH: fh, cols: 3, colsD: 3, size: [0.7, 0.95] });
  for (let f = 1; f < floors; f++) {
    for (let i = 0; i < 3; i++) {
      const x = -3.3 + 2.2 * (i + 0.5);
      boxAt(g, 1.3, 0.08, 0.5, M.white, x, 0.2 + f * fh, 3.05);
      boxAt(g, 1.3, 0.45, 0.04, M.dark, x, 0.25 + f * fh, 3.3);
    }
  }
  boxAt(g, 6.9, 0.3, 5.9, M.roofDark, 0, 0.2 + h, 0);
  if (p.status === 'reforma') {
    // Andamio en la fachada principal y lateral
    const sh = h + 0.6;
    for (let i = 0; i <= 5; i++) {
      const x = -3.4 + i * 1.36;
      boxAt(g, 0.08, sh, 0.08, M.scaffold, x, 0.2, 3.5);
      boxAt(g, 0.08, sh, 0.08, M.scaffold, x, 0.2, 4.1);
    }
    for (let f = 1; f <= floors; f++) {
      boxAt(g, 6.9, 0.07, 0.75, M.scaffold, 0, 0.2 + f * fh - 0.1, 3.8);
      boxAt(g, 6.9, 0.05, 0.05, M.scaffold, 0, 0.2 + f * fh + 0.5, 4.1);
    }
    // Lona de obra
    const net = new THREE.MeshStandardMaterial({ color: '#7bc96f', transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    boxAt(g, 0.02, sh - 1.5, 5.6, net, 3.6, 1.6, 0).castShadow = false;
    // Contenedor de escombros
    boxAt(g, 2, 0.9, 1.1, M.scaffold, -2.6, 0.2, -3.6);
    // Grúa
    const crane = new THREE.Group();
    crane.position.set(3.4, 0.2, -3.4);
    g.add(crane);
    const mastH = h + 4.5;
    for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) boxAt(crane, 0.1, mastH, 0.1, M.crane, dx, 0, dz);
    for (let y = 0.6; y < mastH; y += 0.9) boxAt(crane, 0.6, 0.06, 0.6, M.crane, 0, y, 0);
    const jib = new THREE.Group();
    jib.position.y = mastH;
    crane.add(jib);
    boxAt(jib, 9, 0.35, 0.35, M.crane, -2.8, 0, 0);
    boxAt(jib, 1.2, 0.9, 0.8, M.dark, 1.3, -0.45, 0); // contrapeso
    boxAt(jib, 0.8, 0.8, 0.8, M.white, 0, 0.35, 0); // cabina
    const cable = boxAt(jib, 0.03, 3, 0.03, M.dark, -5.5, -3, 0);
    const load = boxAt(jib, 0.8, 0.5, 0.8, M.wallWarm, -5.5, -3.5, 0);
    anim.cranes.push({ jib, cable, load });
    return mastH + 1.5;
  }
  return h + 1.5;
}

function buildOficina(g, p) {
  lot(g, 9, 9);
  const floors = p.floors || 4;
  const fh = 1.6;
  const h = floors * fh;
  boxAt(g, 7, h, 6, M.glassDark, 0, 0.2, 0);
  for (let f = 0; f <= floors; f++) boxAt(g, 7.06, 0.18, 6.06, M.white, 0, 0.2 + f * fh - 0.09, 0);
  for (let i = 0; i <= 6; i++) boxAt(g, 0.1, h, 6.08, M.white, -3.5 + i * (7 / 6), 0.2, 0);
  // Ventanas iluminadas aleatorias (oficinas de noche)
  for (let f = 0; f < floors; f++) for (let i = 0; i < 6; i++) {
    if (rand() < 0.5) boxAt(g, 1, 1.1, 0.04, M.windowLit, -3.5 + (7 / 6) * (i + 0.5), 0.45 + f * fh, 3.04).castShadow = false;
  }
  boxAt(g, 2.4, 0.8, 1.6, M.metal, 1.5, 0.2 + h, -1);
  boxAt(g, 2.6, 0.15, 0.6, M.brand, -1.6, 0.2 + h + 0.5, 3.0); // logo
  // Parking
  for (let i = 0; i < 3; i++) boxAt(g, 0.08, 0.02, 1.4, M.white, -3.6 + i * 1.6, 0.2, 4);
  return h + 1.6;
}

function buildNave(g, p, anim) {
  lot(g, 10, 9);
  boxAt(g, 8.6, 3.2, 6.4, M.wallGrey, 0, 0.2, -0.8);
  // Cubierta abovedada: medio cilindro tumbado a lo largo de Z, aplanado.
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 6.6, 24, 1, false, -Math.PI / 2, Math.PI), M.brand);
  roof.rotation.set(-Math.PI / 2, 0, 0);
  roof.scale.set(0.98, 1, 0.3);
  roof.position.set(0, 3.4, -0.8);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  // Muelles de carga
  for (const x of [-2.2, 2.2]) {
    boxAt(g, 2.2, 2.3, 0.1, M.metal, x, 0.2, 2.42);
    for (let k = 0; k < 6; k++) boxAt(g, 2.2, 0.03, 0.12, M.dark, x, 0.4 + k * 0.35, 2.46);
    boxAt(g, 2.6, 0.5, 0.9, M.dark, x, 0.2, 2.9);
  }
  boxAt(g, 1.8, 1.2, 0.05, M.glass, -3.1, 1.6, 2.43);
  // Palets
  for (let i = 0; i < 3; i++) boxAt(g, 0.9, 0.6, 0.9, M.wallWarm, 3.4 - i * 1.0, 0.2, 3.8);
  anim.trees.push(tree(g, -4.3, 3.6, 0.7, true));
  return 6.3;
}

// Casa de pueblo de piedra con tejado de pizarra (Cerdanya)
function buildMasia(g, p, anim) {
  lot(g, 9.5, 9, M.grass);
  boxAt(g, 6.4, 3.6, 4.6, M.stone, -0.6, 0.2, -1.2);
  const r = gableRoof(7.2, 2.2, 5.4, M.slate);
  r.position.set(-0.6, 3.8, -1.2);
  g.add(r);
  // Nieve en la cumbrera
  const snowCap = gableRoof(1.9, 0.6, 5.5, M.snow);
  snowCap.position.set(-0.6, 5.44, -1.2);
  g.add(snowCap);
  boxAt(g, 3, 2.2, 3, M.stone, 3.6, 0.2, -2.0); // pajar / anexo
  const r2 = gableRoof(3.6, 1, 3.4, M.slateDark);
  r2.rotation.y = Math.PI / 2;
  r2.position.set(3.6, 2.4, -2.0);
  g.add(r2);
  boxAt(g, 1.2, 1.9, 0.1, M.wood, 3.6, 0.2, -0.45); // portalón
  boxAt(g, 0.9, 1.8, 0.1, M.door, -1.6, 0.2, 1.12);
  windows(g, { w: 6.4, d: 4.6, y0: 0.2, floors: 2, floorH: 1.7, cols: 3, colsD: 2, cx: -0.6, cz: -1.2, size: [0.55, 0.75] });
  // Balcón de madera corrido
  boxAt(g, 6.4, 0.12, 0.8, M.wood, -0.6, 2.0, 1.5);
  for (let i = 0; i <= 8; i++) boxAt(g, 0.06, 0.6, 0.06, M.wood, -3.8 + i * 0.8, 2.1, 1.85);
  boxAt(g, 6.4, 0.06, 0.06, M.wood, -0.6, 2.7, 1.85);
  chimney(g, -3.0, 4.6, -2.2, anim, true);
  // Huerto y leña
  for (let i = 0; i < 3; i++) boxAt(g, 2.6, 0.18, 0.5, M.grassDark, -2, 0.2, 2.9 + i * 0.6);
  for (let i = 0; i < 3; i++) boxAt(g, 1.4, 0.3, 0.6, M.wood, 3.4, 0.2 + i * 0.31, 2.6);
  anim.trees.push(pine(g, -4.2, 3.6, 0.8), pine(g, 4.2, 3.8, 0.7, true));
  return 7;
}

const BUILDERS = {
  masia: buildMasia,
  chalet: buildChalet,
  adosado: buildAdosados,
  edificio: buildEdificio,
  atico: buildAtico,
  local: buildLocal,
  piso: buildPiso,
  oficina: buildOficina,
  nave: buildNave,
};

export function pine(parent, x, z, s = 1, snow = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.9 * s, 6), M.trunk, 0, 0.45 * s, 0, g);
  const crown = new THREE.Group();
  crown.position.y = 0.6 * s;
  g.add(crown);
  for (let k = 0; k < 3; k++) {
    const r = (1.1 - k * 0.28) * s;
    mesh(new THREE.ConeGeometry(r, 1.3 * s, 7), M.pine, 0, (0.6 + k * 0.75) * s, 0, crown);
    if (snow) mesh(new THREE.ConeGeometry(r * 0.55, 0.6 * s, 7), M.snow, 0, (0.95 + k * 0.75) * s, 0, crown);
  }
  crown.userData.sway = rand() * Math.PI * 2;
  parent.add(g);
  return crown;
}

export function buildProperty(p, anim) {
  const g = new THREE.Group();
  const height = (BUILDERS[p.type] || buildPiso)(g, p, anim);
  return { group: g, height };
}

// ---------------------------------------------------------------------------
// Señales "SE ALQUILA" / "RESERVADO"

export function signBoard(text, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = color;
  x.fillRect(0, 0, 256, 34);
  x.fillStyle = '#fff';
  x.font = 'bold 22px system-ui, sans-serif';
  x.textAlign = 'center';
  x.fillText('LLOPART', 128, 25);
  x.fillStyle = color;
  x.font = 'bold 34px system-ui, sans-serif';
  x.fillText(text, 128, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), M.metal, 0, 1.1, 0, g);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
  board.position.set(0, 2.1, 0);
  g.add(board);
  return g;
}

// ---------------------------------------------------------------------------
// Vehículos y peatones

const CAR_COLORS = ['#ef4444', '#f8fafc', '#2f5bea', '#111827', '#f59e0b', '#10b981', '#94a3b8'];

export function car(colorIdx, kind = 'car') {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: CAR_COLORS[colorIdx % CAR_COLORS.length], roughness: 0.4, metalness: 0.2 });
  const inner = new THREE.Group();
  g.add(inner);
  if (kind === 'van') {
    boxAt(inner, 1.4, 1.5, 3.2, M.white, 0, 0.3, -0.3);
    boxAt(inner, 1.4, 1.0, 1.0, body, 0, 0.3, 1.6);
    boxAt(inner, 1.3, 0.5, 0.05, M.glassDark, 0, 0.85, 2.11);
    boxAt(inner, 0.05, 0.5, 2.4, M.brand, 0.72, 0.9, -0.3);
    boxAt(inner, 0.05, 0.5, 2.4, M.brand, -0.72, 0.9, -0.3);
  } else {
    boxAt(inner, 1.3, 0.55, 2.6, body, 0, 0.3, 0);
    boxAt(inner, 1.15, 0.5, 1.4, body, 0, 0.85, -0.15);
    boxAt(inner, 1.17, 0.36, 1.2, M.glassDark, 0, 0.9, -0.15);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 10);
  for (const [x, z] of [[-0.65, 0.85], [0.65, 0.85], [-0.65, -0.85], [0.65, -0.85]]) {
    const w = mesh(wheelGeo, M.dark, x, 0.28, z, inner);
    w.rotation.z = Math.PI / 2;
  }
  // Faros (se encienden de noche)
  for (const x of [-0.4, 0.4]) boxAt(inner, 0.25, 0.12, 0.05, M.lamp, x, 0.5, kind === 'van' ? 2.12 : 1.31).castShadow = false;
  return g;
}

const PEOPLE_COLORS = ['#2f5bea', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9'];
export function person(i) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: PEOPLE_COLORS[i % PEOPLE_COLORS.length] });
  const legs = new THREE.MeshStandardMaterial({ color: '#334155' });
  const skin = new THREE.MeshStandardMaterial({ color: ['#f1c6a5', '#c99572', '#8d5a3b'][i % 3] });
  boxAt(g, 0.32, 0.45, 0.22, legs, 0, 0, 0);
  boxAt(g, 0.4, 0.5, 0.26, shirt, 0, 0.45, 0);
  mesh(new THREE.SphereGeometry(0.17, 10, 8), skin, 0, 1.1, 0, g);
  return g;
}

export function streetLamp(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), M.dark, 0, 1.5, 0, g);
  mesh(new THREE.SphereGeometry(0.22, 10, 8), M.lamp, 0, 3.05, 0, g).castShadow = false;
  parent.add(g);
}

// Señal de carretera azul con destino
export function roadSign(text) {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#1d4ed8';
  x.fillRect(0, 0, 320, 96);
  x.strokeStyle = '#fff';
  x.lineWidth = 6;
  x.strokeRect(8, 8, 304, 80);
  x.fillStyle = '#fff';
  x.font = 'bold 40px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 160, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  for (const px of [-1.2, 1.2]) mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 6), M.metal, px, 1.5, 0, g);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
  board.position.y = 3;
  g.add(board);
  return g;
}
