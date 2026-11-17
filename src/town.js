// Puigcerdà: pueblo de montaña de la Cerdanya, con el estany, el campanar,
// casas de piedra con tejado de pizarra, pinos nevados y el Pirineo al fondo.
import * as THREE from 'three';
import { M, boxAt, mesh, pine, rand } from './builders.js';
import { makePath } from './paths.js';

const HALF = 60;
const ROAD_W = 3.6;
const LAKE = { x: -30, z: 30, rx: 11, rz: 7 };
const PLAZA = { x: -6, z: -30 };

function gable(w, h, d, mat) {
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

export function buildPuigcerda(group, properties, anim, { roadMat, lineMat }) {
  const groundMat = new THREE.MeshStandardMaterial({ color: '#dfeccf', roughness: 1 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 1, HALF * 2), groundMat);
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  group.add(ground);

  // --- Calles -------------------------------------------------------------------------
  boxAt(group, HALF * 2, 0.04, ROAD_W, roadMat, 0, 0, 0).castShadow = false;
  boxAt(group, ROAD_W, 0.04, HALF * 2, roadMat, 0, 0, 0).castShadow = false;
  for (let t = -HALF + 1; t < HALF; t += 2.4) {
    if (Math.abs(t) < ROAD_W) continue;
    boxAt(group, 1.1, 0.02, 0.14, lineMat, t, 0.04, 0).castShadow = false;
    boxAt(group, 0.14, 0.02, 1.1, lineMat, 0, 0.04, t).castShadow = false;
  }
  // Farolas de estilo antiguo
  for (let t = -40; t <= 40; t += 13) {
    if (Math.abs(t) < 5) continue;
    for (const [x, z] of [[t, 2.6], [-2.6, t]]) {
      mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6), M.dark, x, 1.3, z, group);
      mesh(new THREE.BoxGeometry(0.4, 0.45, 0.4), M.lamp, x, 2.75, z, group).castShadow = false;
    }
  }

  // --- Plaza y campanar ----------------------------------------------------------------
  boxAt(group, 12, 0.12, 10, M.paving, PLAZA.x, 0, PLAZA.z).castShadow = false;
  const tower = new THREE.Group();
  tower.position.set(PLAZA.x - 2, 0.12, PLAZA.z - 1);
  group.add(tower);
  boxAt(tower, 3.6, 13, 3.6, M.stone, 0, 0, 0);
  for (let y = 3; y < 13; y += 3) boxAt(tower, 3.75, 0.2, 3.75, M.wallStone, 0, y, 0);
  // Campanario: arcos en las 4 caras
  for (const [x, z, w, d] of [[0, 1.82, 1.2, 0.1], [0, -1.82, 1.2, 0.1], [1.82, 0, 0.1, 1.2], [-1.82, 0, 0.1, 1.2]]) {
    boxAt(tower, w, 1.8, d, M.dark, x, 10.4, z);
  }
  const clock = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 20), M.white, 0, 8.2, 1.85, tower);
  clock.rotation.x = Math.PI / 2;
  const hand = boxAt(tower, 0.08, 0.55, 0.05, M.dark, 0, 8.2, 1.92);
  hand.geometry = hand.geometry.clone();
  hand.geometry.translate(0, 0.25, 0);
  hand.position.y = 8.2;
  const spire = mesh(new THREE.ConeGeometry(2.9, 3.6, 4), M.slate, 0, 14.8, 0, tower);
  spire.rotation.y = Math.PI / 4;
  // Bancos y fuente
  mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.5, 14), M.wallStone, PLAZA.x + 3, 0.37, PLAZA.z + 2, group);
  const fountain = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 14), M.water, PLAZA.x + 3, 0.64, PLAZA.z + 2, group);
  fountain.castShadow = false;

  // --- Estany con barca y cisnes ---------------------------------------------------------
  const shore = mesh(new THREE.CylinderGeometry(1, 1, 0.1, 40), M.paving, LAKE.x, 0.05, LAKE.z, group);
  shore.scale.set(LAKE.rx + 1.4, 1, LAKE.rz + 1.4);
  shore.castShadow = false;
  const lakeMat = new THREE.MeshStandardMaterial({ color: '#5cb8e0', roughness: 0.15, metalness: 0.1, emissive: '#1a90c0', emissiveIntensity: 0.12 });
  const lake = mesh(new THREE.CylinderGeometry(1, 1, 0.1, 40), lakeMat, LAKE.x, 0.1, LAKE.z, group);
  lake.scale.set(LAKE.rx, 1, LAKE.rz);
  lake.castShadow = false;
  const boat = new THREE.Group();
  boxAt(boat, 0.9, 0.35, 2, M.wood, 0, 0, 0);
  boxAt(boat, 0.32, 0.5, 0.26, new THREE.MeshStandardMaterial({ color: '#ef4444' }), 0, 0.3, 0.2);
  mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshStandardMaterial({ color: '#f1c6a5' }), 0, 0.95, 0.2, boat);
  group.add(boat);
  const swans = [0, 1].map(() => {
    const s = new THREE.Group();
    boxAt(s, 0.4, 0.3, 0.7, M.white, 0, 0, 0);
    boxAt(s, 0.12, 0.5, 0.12, M.white, 0, 0.2, 0.3);
    group.add(s);
    return s;
  });

  // --- Montañas (Pirineo) detrás del pueblo ------------------------------------------------
  const rockMat = new THREE.MeshStandardMaterial({ color: '#8fa38c', roughness: 1, flatShading: true });
  const rockMat2 = new THREE.MeshStandardMaterial({ color: '#7d9180', roughness: 1, flatShading: true });
  const mountains = [
    [-92, -30, 26, 30], [-74, -78, 30, 40], [-30, -98, 28, 34], [18, -100, 24, 28], [58, -96, 18, 22],
    [-52, -96, 20, 24], [-100, -64, 18, 26], [92, -70, 20, 24], [100, -20, 16, 18],
  ];
  mountains.forEach(([x, z, r, h], i) => {
    const m = mesh(new THREE.ConeGeometry(r, h, 7, 1), i % 2 ? rockMat : rockMat2, x, h / 2 - 0.5, z, group);
    m.rotation.y = rand() * Math.PI;
    m.castShadow = false;
    if (h > 20) {
      const capH = h * 0.32;
      const cap = mesh(new THREE.ConeGeometry((r * capH) / h + 0.15, capH, 7, 1), M.snow, x, h - capH / 2 - 0.45, z, group);
      cap.rotation.y = m.rotation.y;
      cap.castShadow = false;
    }
  });

  // --- Casas del pueblo (no gestionadas) y pinos --------------------------------------------
  const occupied = properties.map((p) => p.position);
  const inLake = (x, z, pad = 2.5) => ((x - LAKE.x) / (LAKE.rx + pad)) ** 2 + ((z - LAKE.z) / (LAKE.rz + pad)) ** 2 < 1;
  const isFree = (x, z, pad = 6) => {
    if (Math.abs(x) < 4 || Math.abs(z) < 4) return false;
    if (inLake(x, z)) return false;
    if (Math.abs(x - PLAZA.x) < 8 && Math.abs(z - PLAZA.z) < 7) return false;
    return !occupied.some(([px, pz]) => Math.abs(px - x) < pad && Math.abs(pz - z) < pad);
  };
  const walls = [M.stone, M.wall, M.wallWarm, M.stone];
  let houses = 0;
  for (let i = 0; i < 400 && houses < 30; i++) {
    const x = (rand() * 2 - 1) * 42;
    const z = (rand() * 2 - 1) * 42;
    if (!isFree(x, z, 8)) continue;
    const w = 3 + rand() * 1.8;
    const d = 3 + rand() * 1.5;
    const h = 2.4 + rand() * 1.8;
    const rot = rand() < 0.5 ? 0 : Math.PI / 2;
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    house.rotation.y = rot;
    group.add(house);
    boxAt(house, w, h, d, walls[houses % walls.length], 0, 0, 0);
    const roof = gable(w + 0.5, 1.3, d + 0.4, rand() < 0.5 ? M.slate : M.slateDark);
    roof.position.y = h;
    house.add(roof);
    boxAt(house, 0.6, 1.2, 0.08, M.wood, 0, 0, d / 2 + 0.02);
    for (const s of [-1, 1]) boxAt(house, 0.5, 0.6, 0.08, rand() < 0.4 ? M.windowLit : M.windowDark, s * w * 0.3, h * 0.5, d / 2 + 0.02);
    if (houses % 3 === 0) {
      const c = boxAt(house, 0.45, 1.2, 0.45, M.stone, w * 0.25, h + 0.3, 0);
      anim.chimneys.push(c);
    }
    houses++;
  }
  for (let i = 0; i < 420; i++) {
    const x = (rand() * 2 - 1) * (HALF - 2);
    const z = (rand() * 2 - 1) * (HALF - 2);
    if (!isFree(x, z, 6)) continue;
    const outskirts = Math.abs(x) > 34 || Math.abs(z) > 34;
    if (!outskirts && rand() < 0.75) continue;
    anim.trees.push(pine(group, x, z, 0.8 + rand() * 0.7, rand() < 0.45));
  }

  // --- Nieve cayendo -----------------------------------------------------------------
  const FLAKES = 1400;
  const pos = new Float32Array(FLAKES * 3);
  const speed = new Float32Array(FLAKES);
  for (let i = 0; i < FLAKES; i++) {
    pos[i * 3] = (rand() * 2 - 1) * HALF;
    pos[i * 3 + 1] = rand() * 40;
    pos[i * 3 + 2] = (rand() * 2 - 1) * HALF;
    speed[i] = 1.2 + rand() * 1.6;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snowMat = new THREE.PointsMaterial({ color: '#ffffff', size: 2.5, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  group.add(snow);

  // --- Tráfico y peatones (coordenadas locales de la zona) --------------------------------
  const paths = [
    makePath([[-HALF, 1], [HALF, 1]], false),
    makePath([[HALF, -1], [-HALF, -1]], false),
    makePath([[-1, -HALF], [-1, HALF]], false),
    makePath([[1, HALF], [1, -HALF]], false),
  ];
  const vehicleSpec = [[0, 0.1, 'car'], [1, 0.5, 'van'], [2, 0.3, 'car'], [3, 0.75, 'car']];
  const walkSpec = [
    [[2.4, -26], [2.4, 22]], [[-2.4, 24], [-2.4, -20]], [[-26, 2.4], [24, 2.4]], [[22, -2.4], [-24, -2.4]],
    [[PLAZA.x - 4, PLAZA.z + 4], [PLAZA.x + 4, PLAZA.z + 4]],
  ];

  function update(dt, t, night) {
    const a = snowGeo.attributes.position.array;
    for (let i = 0; i < FLAKES; i++) {
      a[i * 3 + 1] -= speed[i] * dt;
      a[i * 3] += Math.sin(t * 0.8 + i) * dt * 0.4;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 40;
    }
    snowGeo.attributes.position.needsUpdate = true;
    boat.position.set(LAKE.x + Math.cos(t * 0.15) * LAKE.rx * 0.55, 0.15, LAKE.z + Math.sin(t * 0.15) * LAKE.rz * 0.55);
    boat.rotation.y = -t * 0.15;
    swans.forEach((s, i) => {
      const k = -t * 0.09 + i * 0.6;
      s.position.set(LAKE.x - 2 + Math.cos(k) * 4, 0.2, LAKE.z + 1 + Math.sin(k) * 2.4);
      s.rotation.y = -k + Math.PI;
    });
    hand.rotation.z = -t * 0.2;
    lakeMat.emissiveIntensity = 0.12 + Math.sin(t * 1.7) * 0.05 + night * 0.4;
  }

  return { groundMat, snowMat, paths, vehicleSpec, walkSpec, update };
}
