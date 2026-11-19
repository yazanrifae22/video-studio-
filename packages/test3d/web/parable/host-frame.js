// Host view framing: a camera along a direction that puts groups of world points inside their own screen boxes. No Three.js scene needed.
import * as THREE from 'three';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export function makeFit(W, H) {
  const K = { W, H };
  const up = V(0, 1, 0), _f = V(), _r = V(), _u = V(), _d = V();
  const project = (pos, aim, fov, p) => {
    _f.copy(aim).sub(pos).normalize(); _r.crossVectors(_f, up).normalize(); _u.crossVectors(_r, _f);
    _d.copy(p).sub(pos); const z = Math.max(1e-4, _d.dot(_f)), th = Math.tan(fov * Math.PI / 360);
    return [_d.dot(_r) / (z * th * K.W / K.H), _d.dot(_u) / (z * th)];   // NDC, y up
  };
  /** where to look from pos so the world point p lands at (sx, sy) of the picture */
  const aimAt = (pos, p, sx, sy, fov) => {
    const th = Math.tan(fov * Math.PI / 360), tx = (2 * sx - 1) * th * K.W / K.H, ty = (1 - 2 * sy) * th, n = Math.hypot(tx, ty, 1), d = p.clone().sub(pos);
    const e = Math.asin(clamp(n * d.y / d.length() / Math.hypot(1, ty), -1, 1)) - Math.atan(ty), ph = Math.atan2(d.z, d.x) - Math.atan2(tx, Math.cos(e) - ty * Math.sin(e));
    return V(pos.x + Math.cos(e) * Math.cos(ph), pos.y + Math.sin(e), pos.z + Math.cos(e) * Math.sin(ph));
  };
  const dirOf = (az, el) => V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  /**
   * fit(groups, dir, fov) -> {pos, aim, c}: the closest camera along dir (from the groups' centre) that puts every point of each group inside
   * that group's screen box [x0, y0, x1, y1] (fractions, y from the top). Scale and shift solved per axis, 4 rounds against the real projection.
   */
  const fit = (groups, dir, fov, { centre = null, d0 = 1 } = {}) => {
    const pts = []; for (const g of groups) for (const p of g.pts) pts.push([p, g.box]);
    const c = centre ? centre.clone() : pts.reduce((s, [p]) => s.add(p), V()).multiplyScalar(1 / pts.length);
    let d = d0, scx = 0.5, scy = 0.42, pos = V(), aim = V();
    for (let it = 0; it < 7; it++) {
      pos.copy(c).addScaledVector(dir, d); aim = aimAt(pos, c, scx, scy, fov);
      const pc = project(pos, aim, fov, c), rel = pts.map(([p, b]) => { const q = project(pos, aim, fov, p); return [q[0] - pc[0], q[1] - pc[1], b]; });
      // the largest scale s for which one shift puts every point in its box: for each pair (a, b) lo_a - s r_a <= hi_b - s r_b.
      // Exact (fix round 2): the old bisection assumed feasibility from s -> 0, which fails for boxes that do not overlap (a head
      // above the frame and the board below it, the l65 line-up under the faces) and then threw the camera 6 m away
      const solve = (ax) => {
        const lo = (b) => (ax === 0 ? 2 * b[0] - 1 : 1 - 2 * b[3]), hi = (b) => (ax === 0 ? 2 * b[2] - 1 : 1 - 2 * b[1]);
        let smin = 0.02, smax = 30;
        for (const a of rel) for (const b of rel) { const dr = b[ax] - a[ax], gap = hi(b[2]) - lo(a[2]); if (dr > 1e-9) smax = Math.min(smax, gap / dr); else if (dr < -1e-9) smin = Math.max(smin, gap / dr); }
        return Math.max(0.02, smax >= smin ? smax : smin);
      };
      const s = Math.min(solve(0), solve(1));
      const cx = (() => { let a = -1e9, z = 1e9; for (const r of rel) { a = Math.max(a, 2 * r[2][0] - 1 - s * r[0]); z = Math.min(z, 2 * r[2][2] - 1 - s * r[0]); } return (a + z) / 2; })();
      const cy = (() => { let a = -1e9, z = 1e9; for (const r of rel) { a = Math.max(a, 1 - 2 * r[2][3] - s * r[1]); z = Math.min(z, 1 - 2 * r[2][1] - s * r[1]); } return (a + z) / 2; })();
      d = clamp(clamp(d / s, d * 0.6, d * 1.8), 0.12, 6); scx = clamp(0.5 + cx / 2, 0.1, 0.9); scy = clamp(0.5 - cy / 2, 0.1, 0.9);   // d damped: the linear model holds only near the current distance
    }
    pos.copy(c).addScaledVector(dir, d); aim = aimAt(pos, c, scx, scy, fov);
    return { pos, aim, c, d, scx, scy };
  };
  return { project, aimAt, dirOf, fit };
}
