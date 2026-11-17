// Escena isométrica 3D: barrio con los inmuebles gestionados, tráfico, peatones y marcadores de estado.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { M, boxAt, buildProperty, car, person, rand, signBoard, streetLamp, tree } from './builders.js';
import { STATUS } from './data.js';

const RING = 28; // anillo exterior de calles
const ROAD_W = 4;
const HALF = 66; // medio lado del terreno

export function createScene(container, properties, { onSelect, onHover } = {}) {
  // --- Renderer, cámara y controles -------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const DAY_BG = new THREE.Color('#e8eef6');
  const NIGHT_BG = new THREE.Color('#0d1526');
  scene.background = DAY_BG.clone();
  scene.fog = new THREE.Fog(scene.background, 120, 230);

  const FRUSTUM = 62;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
  const ISO_DIR = new THREE.Vector3(1, 0.92, 1).normalize();
  camera.position.copy(ISO_DIR).multiplyScalar(120);
  camera.zoom = 1;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.7;
  controls.maxZoom = 3.2;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.15;
  controls.screenSpacePanning = false;
  controls.target.set(0, 0, 0);
  controls.update();

  // --- Luces -------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight('#ffffff', '#b9c4d6', 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff6e8', 2.1);
  sun.position.set(-30, 60, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 200;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // --- Terreno y calles ---------------------------------------------------------------
  const world = new THREE.Group();
  scene.add(world);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#f1f4f8', roughness: 1 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 1, HALF * 2), groundMat);
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  world.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: '#5d6676', roughness: 0.95 });
  const walkMat = new THREE.MeshStandardMaterial({ color: '#dde2ea', roughness: 1 });
  const lineMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
  const roads = new THREE.Group();
  world.add(roads);

  function road(x, z, len, alongX) {
    const w = alongX ? len : ROAD_W;
    const d = alongX ? ROAD_W : len;
    boxAt(roads, w, 0.04, d, roadMat, x, 0, z).castShadow = false;
    // aceras
    for (const s of [-1, 1]) {
      const off = (ROAD_W / 2 + 0.6) * s;
      boxAt(roads, alongX ? len : 1.2, 0.14, alongX ? 1.2 : len, walkMat, alongX ? x : x + off, 0, alongX ? z + off : z).castShadow = false;
    }
  }
  function dashes(x, z, len, alongX, skip) {
    for (let t = -len / 2 + 1; t < len / 2; t += 2.2) {
      const px = alongX ? x + t : x;
      const pz = alongX ? z : z + t;
      if (skip(px, pz)) continue;
      boxAt(roads, alongX ? 1.1 : 0.16, 0.02, alongX ? 0.16 : 1.1, lineMat, px, 0.04, pz).castShadow = false;
    }
  }
  const nearCross = (px, pz) => {
    const near = (v) => Math.abs(v) < ROAD_W || Math.abs(Math.abs(v) - RING) < ROAD_W;
    return near(px) && near(pz);
  };
  road(0, 0, HALF * 2, true);
  road(0, 0, HALF * 2, false);
  for (const s of [-1, 1]) {
    road(0, s * RING, RING * 2 + ROAD_W, true);
    road(s * RING, 0, RING * 2 + ROAD_W, false);
  }
  dashes(0, 0, HALF * 2, true, nearCross);
  dashes(0, 0, HALF * 2, false, nearCross);
  for (const s of [-1, 1]) {
    dashes(0, s * RING, RING * 2, true, nearCross);
    dashes(s * RING, 0, RING * 2, false, nearCross);
  }
  // Pasos de cebra en el cruce central
  for (const [cx, cz, alongX] of [[0, 3.6, true], [0, -3.6, true], [3.6, 0, false], [-3.6, 0, false]]) {
    for (let i = -3; i <= 3; i++) {
      boxAt(roads, alongX ? 0.3 : 1.2, 0.02, alongX ? 1.2 : 0.3, lineMat, alongX ? cx + i * 0.55 : cx, 0.04, alongX ? cz : cz + i * 0.55).castShadow = false;
    }
  }

  // Farolas
  for (let t = -24; t <= 24; t += 12) {
    if (t === 0) continue;
    streetLamp(world, 2.7, t);
    streetLamp(world, t, -2.7);
  }

  // Parque central decorativo fuera del anillo y arbolado
  const anim = { trees: [], pools: [], cranes: [] };
  const occupied = properties.map((p) => p.position);
  const isFree = (x, z) => {
    if (Math.abs(x) < 4.5 || Math.abs(z) < 4.5) return false;
    if (Math.abs(Math.abs(x) - RING) < 4.5 || Math.abs(Math.abs(z) - RING) < 4.5) return false;
    return !occupied.some(([px, pz]) => Math.abs(px - x) < 6 && Math.abs(pz - z) < 6);
  };
  for (let i = 0; i < 260; i++) {
    const x = (rand() * 2 - 1) * (HALF - 3);
    const z = (rand() * 2 - 1) * (HALF - 3);
    if (!isFree(x, z)) continue;
    const inside = Math.abs(x) < RING && Math.abs(z) < RING;
    if (inside && rand() < 0.5) continue;
    anim.trees.push(tree(world, x, z, 0.7 + rand() * 0.6, rand() < 0.4));
  }
  // Edificios de relleno (no gestionados) fuera del anillo, en gris claro
  const fillerMat = new THREE.MeshStandardMaterial({ color: '#dfe4ec', roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const x = (rand() * 2 - 1) * (HALF - 6);
    const z = (rand() * 2 - 1) * (HALF - 6);
    if (Math.abs(x) < RING + 5 && Math.abs(z) < RING + 5) continue;
    if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;
    const w = 3 + rand() * 4;
    const d = 3 + rand() * 4;
    boxAt(world, w, 1.5 + rand() * 6, d, fillerMat, x, 0, z);
  }

  // --- Inmuebles ----------------------------------------------------------------------
  const items = new Map(); // id -> { p, group, pin, glow, border, height, baseY }
  const pickables = [];

  function pinTexture(color) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 160;
    const x = c.getContext('2d');
    x.shadowColor = 'rgba(15,23,42,0.35)';
    x.shadowBlur = 10;
    x.shadowOffsetY = 4;
    x.fillStyle = color;
    x.beginPath();
    x.arc(64, 58, 46, Math.PI, 0);
    x.bezierCurveTo(110, 96, 74, 120, 64, 150);
    x.bezierCurveTo(54, 120, 18, 96, 18, 58);
    x.fill();
    x.shadowColor = 'transparent';
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(64, 58, 30, 0, Math.PI * 2);
    x.fill();
    // icono casa
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(64, 38);
    x.lineTo(84, 56);
    x.lineTo(78, 56);
    x.lineTo(78, 74);
    x.lineTo(50, 74);
    x.lineTo(50, 56);
    x.lineTo(44, 56);
    x.closePath();
    x.fill();
    x.fillStyle = '#fff';
    x.fillRect(60, 62, 8, 12);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const pinTex = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, pinTexture(v.color)]));

  properties.forEach((p, i) => {
    const { group, height } = buildProperty(p, anim);
    const [x, z] = p.position;
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.add(group);
    world.add(holder);
    group.traverse((o) => { o.userData.pid = p.id; });
    pickables.push(group);

    const color = new THREE.Color(STATUS[p.status].color);
    // Borde de parcela con el color del estado
    const borderMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const border = new THREE.Group();
    const L = 9.6;
    for (const [bx, bz, w, d] of [[0, L / 2, L, 0.2], [0, -L / 2, L, 0.2], [L / 2, 0, 0.2, L], [-L / 2, 0, 0.2, L]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), borderMat);
      b.position.set(bx, 0.22, bz);
      border.add(b);
    }
    holder.add(border);
    // Halo de selección
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;
    holder.add(glow);
    // Marcador flotante
    const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTex[p.status], depthTest: false, transparent: true }));
    pin.scale.set(2.6, 3.25, 1);
    pin.position.set(0, height + 2, 0);
    pin.renderOrder = 10;
    pin.userData.pid = p.id;
    holder.add(pin);
    pickables.push(pin);
    // Cartel
    if (p.status === 'disponible' || p.status === 'reservado') {
      const s = signBoard(p.status === 'disponible' ? 'SE ALQUILA' : 'RESERVADO', STATUS[p.status].color);
      s.position.set(3.6, 0.2, 4.1);
      s.rotation.y = Math.PI / 4;
      s.traverse((o) => { o.userData.pid = p.id; });
      holder.add(s);
    }
    group.scale.y = 0.001; // animación de entrada
    items.set(p.id, { p, holder, group, pin, glow, border, height, delay: 0.25 + i * 0.12, visible: true });
  });

  // --- Tráfico ------------------------------------------------------------------------
  function makePath(pts, closed) {
    const v = pts.map(([x, z]) => new THREE.Vector3(x, 0.07, z));
    const segs = [];
    let total = 0;
    const n = closed ? v.length : v.length - 1;
    for (let i = 0; i < n; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      const len = a.distanceTo(b);
      segs.push({ a, b, len, start: total });
      total += len;
    }
    return { segs, total, closed };
  }
  function samplePath(path, s, out) {
    s = ((s % path.total) + path.total) % path.total;
    for (const seg of path.segs) {
      if (s <= seg.start + seg.len) {
        const t = (s - seg.start) / seg.len;
        out.pos.lerpVectors(seg.a, seg.b, t);
        out.dir.subVectors(seg.b, seg.a).normalize();
        return out;
      }
    }
    return out;
  }
  const r1 = RING - 1;
  const r2 = RING + 1;
  const paths = [
    makePath([[-r1, -r1], [-r1, r1], [r1, r1], [r1, -r1]], true),
    makePath([[-r2, -r2], [r2, -r2], [r2, r2], [-r2, r2]], true),
    makePath([[-1, -HALF], [-1, HALF]], false),
    makePath([[1, HALF], [1, -HALF]], false),
    makePath([[-HALF, 1], [HALF, 1]], false),
    makePath([[HALF, -1], [-HALF, -1]], false),
  ];
  const vehicles = [];
  const vehicleSpec = [
    [0, 0.0, 'car'], [0, 0.33, 'van'], [0, 0.66, 'car'],
    [1, 0.1, 'car'], [1, 0.55, 'car'],
    [2, 0.2, 'car'], [2, 0.7, 'van'],
    [3, 0.4, 'car'],
    [4, 0.15, 'car'], [4, 0.6, 'car'],
    [5, 0.35, 'van'], [5, 0.85, 'car'],
  ];
  vehicleSpec.forEach(([pi, phase, kind], i) => {
    const mesh = car(i, kind);
    world.add(mesh);
    vehicles.push({ mesh, path: paths[pi], s: phase * paths[pi].total, speed: 5 + (i % 4) * 0.9 });
  });

  // --- Peatones -----------------------------------------------------------------------
  const walkers = [];
  const walkSpec = [
    [[2.6, -22], [2.6, 22]], [[-2.6, 20], [-2.6, -20]], [[-22, 2.6], [22, 2.6]], [[20, -2.6], [-20, -2.6]],
    [[-2.6, -8], [-2.6, 14]], [[2.6, 6], [2.6, -14]], [[-12, -2.6], [12, -2.6]], [[14, 2.6], [-8, 2.6]],
  ];
  walkSpec.forEach(([a, b], i) => {
    const mesh = person(i);
    world.add(mesh);
    const from = new THREE.Vector3(a[0], 0.14, a[1]);
    const to = new THREE.Vector3(b[0], 0.14, b[1]);
    walkers.push({ mesh, from, to, len: from.distanceTo(to), t: rand(), speed: 1.1 + rand() * 0.6 });
  });

  // --- Nubes --------------------------------------------------------------------------
  // Las nubes no se ven: solo proyectan sombras suaves que cruzan el barrio.
  const cloudMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + rand() * 1.4, 0), cloudMat);
      s.position.set(k * 1.9 - n, rand() * 0.8, rand() * 1.6);
      s.castShadow = true;
      c.add(s);
    }
    c.position.set((rand() * 2 - 1) * 70, 40 + rand() * 6, (rand() * 2 - 1) * 60);
    c.userData.speed = 1.2 + rand() * 1.5;
    scene.add(c);
    clouds.push(c);
  }

  // --- Interacción --------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredId = null;
  let selectedId = null;
  let downAt = null;

  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    for (const h of hits) {
      const id = h.object.userData.pid;
      if (id && items.get(id).visible) return id;
    }
    return null;
  }

  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    const id = pick(ev);
    if (id !== hoveredId) {
      hoveredId = id;
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    }
    onHover?.(id, ev.clientX, ev.clientY);
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    hoveredId = null;
    onHover?.(null);
  });
  renderer.domElement.addEventListener('pointerdown', (ev) => { downAt = [ev.clientX, ev.clientY]; });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (!downAt) return;
    const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]);
    downAt = null;
    if (moved > 6) return; // fue un arrastre
    const id = pick(ev);
    onSelect?.(id);
  });

  // --- Cámara: enfoque animado --------------------------------------------------------
  const focus = { target: new THREE.Vector3(), zoom: 1, active: false };
  // px que se desplaza el centro de la vista (ficha lateral en escritorio / inferior en móvil)
  const viewShift = new THREE.Vector2();
  const viewShiftTarget = new THREE.Vector2();

  function focusOn(id) {
    if (!id) {
      focus.target.set(0, 0, 0);
      focus.zoom = 1;
    } else {
      const it = items.get(id);
      focus.target.set(it.holder.position.x, Math.min(it.height * 0.35, 4), it.holder.position.z);
      focus.zoom = 1.9;
    }
    focus.active = true;
  }
  controls.addEventListener('start', () => { focus.active = false; });

  // --- Día / noche --------------------------------------------------------------------
  let night = 0;
  let nightTarget = 0;
  const dayGround = new THREE.Color('#f1f4f8');
  const nightGround = new THREE.Color('#2a3448');
  const dayRoad = new THREE.Color('#5d6676');
  const nightRoad = new THREE.Color('#1e2533');
  const daySun = new THREE.Color('#fff6e8');
  const nightSun = new THREE.Color('#8fa8ff');

  function applyNight(n) {
    scene.background.copy(DAY_BG).lerp(NIGHT_BG, n);
    scene.fog.color.copy(scene.background);
    hemi.intensity = THREE.MathUtils.lerp(1.15, 0.35, n);
    hemi.groundColor.set('#b9c4d6').lerp(new THREE.Color('#1b2333'), n);
    sun.intensity = THREE.MathUtils.lerp(2.1, 0.45, n);
    sun.color.copy(daySun).lerp(nightSun, n);
    groundMat.color.copy(dayGround).lerp(nightGround, n);
    roadMat.color.copy(dayRoad).lerp(nightRoad, n);
    walkMat.color.set('#dde2ea').lerp(new THREE.Color('#465066'), n);
    M.windowLit.emissiveIntensity = n * 1.6;
    M.lamp.emissiveIntensity = 0.1 + n * 2.4;
  }

  // --- Bucle --------------------------------------------------------------------------
  const clock = new THREE.Clock();
  const tmp = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
  const offset = new THREE.Vector3();
  let elapsed = 0;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const f = aspect < 1 ? FRUSTUM * 1.25 : FRUSTUM;
    camera.left = (-f * aspect) / 2;
    camera.right = (f * aspect) / 2;
    camera.top = f / 2;
    camera.bottom = -f / 2;
    applyViewOffset();
  }
  function applyViewOffset() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (viewShift.lengthSq() < 0.25) camera.clearViewOffset();
    else camera.setViewOffset(w, h, viewShift.x, viewShift.y, w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const easeOutBack = (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const intro = clock.elapsedTime; // tiempo real, para que la entrada no dependa de los FPS

    // Entrada: los edificios "crecen"
    for (const it of items.values()) {
      const t = THREE.MathUtils.clamp((intro - it.delay) / 0.9, 0, 1);
      it.group.scale.y = Math.max(0.001, easeOutBack(t));
      const isSel = it.p.id === selectedId;
      const isHov = it.p.id === hoveredId;
      // Marcadores
      const bob = Math.sin(elapsed * 2 + it.delay * 5) * 0.35;
      const targetScale = isSel ? 1.35 : isHov ? 1.2 : 1;
      const sc = THREE.MathUtils.lerp(it.pin.scale.x / 2.6, targetScale, 0.15);
      it.pin.scale.set(2.6 * sc, 3.25 * sc, 1);
      it.pin.position.y = it.height + 2 + bob + (t < 1 ? (1 - t) * 6 : 0);
      it.pin.material.opacity = it.visible ? Math.min(1, t * 1.5) : 0;
      it.border.visible = it.visible;
      // Halo pulsante
      const glowTarget = isSel ? 0.22 + Math.sin(elapsed * 4) * 0.08 : isHov ? 0.16 : 0;
      it.glow.material.opacity = THREE.MathUtils.lerp(it.glow.material.opacity, it.visible ? glowTarget : 0, 0.2);
    }

    // Vehículos
    for (const v of vehicles) {
      v.s += v.speed * dt;
      if (!v.path.closed && v.s > v.path.total) v.s = 0;
      samplePath(v.path, v.s, tmp);
      v.mesh.position.copy(tmp.pos);
      v.mesh.rotation.y = Math.atan2(tmp.dir.x, tmp.dir.z);
      v.mesh.children[0].position.y = Math.sin(elapsed * 18 + v.s) * 0.015;
    }
    // Peatones (van y vuelven)
    for (const w of walkers) {
      w.t += (w.speed * dt) / w.len;
      const k = w.t % 2;
      const forward = k < 1;
      const u = forward ? k : 2 - k;
      w.mesh.position.lerpVectors(w.from, w.to, u);
      w.mesh.position.y = 0.14 + Math.abs(Math.sin(elapsed * 8 + w.len)) * 0.08;
      const dx = (w.to.x - w.from.x) * (forward ? 1 : -1);
      const dz = (w.to.z - w.from.z) * (forward ? 1 : -1);
      w.mesh.rotation.y = Math.atan2(dx, dz);
    }
    // Nubes
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 80) c.position.x = -80;
    }
    // Árboles, agua, grúas
    for (const t of anim.trees) t.rotation.z = Math.sin(elapsed * 1.3 + t.userData.sway) * 0.05;
    for (const p of anim.pools) p.material.emissiveIntensity = 0.15 + Math.sin(elapsed * 2.5) * 0.08 + night * 0.6;
    for (const c of anim.cranes) {
      c.jib.rotation.y = Math.sin(elapsed * 0.35) * 1.1;
      const lift = (Math.sin(elapsed * 0.7) + 1) * 1.2;
      c.cable.scale.y = (3 - lift) / 3;
      c.cable.position.y = -(3 - lift) / 2;
      c.load.position.y = -(3 - lift) - 0.5;
    }

    // Día / noche
    if (Math.abs(night - nightTarget) > 0.001) {
      night = THREE.MathUtils.lerp(night, nightTarget, 0.05);
      applyNight(night);
    }

    // Enfoque de cámara
    if (focus.active) {
      offset.subVectors(camera.position, controls.target);
      controls.target.lerp(focus.target, 0.08);
      camera.position.copy(controls.target).add(offset);
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, focus.zoom, 0.08);
      camera.updateProjectionMatrix();
      if (controls.target.distanceTo(focus.target) < 0.05 && Math.abs(camera.zoom - focus.zoom) < 0.01) focus.active = false;
    }
    if (viewShift.distanceTo(viewShiftTarget) > 0.5) {
      viewShift.lerp(viewShiftTarget, 0.12);
      applyViewOffset();
    } else if (!viewShift.equals(viewShiftTarget)) {
      viewShift.copy(viewShiftTarget);
      applyViewOffset();
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    select(id) {
      selectedId = id;
      focusOn(id);
    },
    setPanelOffset(x, y = 0) {
      viewShiftTarget.set(x, y);
    },
    setNight(on) {
      nightTarget = on ? 1 : 0;
    },
    setVisible(predicate) {
      for (const it of items.values()) it.visible = predicate(it.p);
    },
    resetView() {
      selectedId = null;
      focusOn(null);
    },
    zoomBy(f) {
      focus.active = false;
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, controls.minZoom, controls.maxZoom);
      camera.updateProjectionMatrix();
    },
  };
}
