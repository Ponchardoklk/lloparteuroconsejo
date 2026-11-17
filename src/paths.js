// Recorridos poligonales para vehículos.
import * as THREE from 'three';

export function makePath(pts, closed) {
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

export function samplePath(path, s, out) {
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

// Distancia de un punto (x, z) a un segmento [a, b].
export function distToSegment(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
}
