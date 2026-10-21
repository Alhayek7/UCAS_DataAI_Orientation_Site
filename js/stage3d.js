// =====================================================================
//  Stage3D: مشهد Three.js واحد بأوضاع متعددة (شبكة / مجرة الوظائف / خريطة الطريق / فِن / منصة التتويج)
// =====================================================================
import * as THREE from '../vendor/three.module.min.js';
import { CAREERS, YEARS } from './content.js';

const BLUE = 0x2f6bff, GREEN = 0x5fb012, AMBER = 0xf2a900, NAVY = 0x0a2a6b, WHITE = 0xffffff;
const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function numberTexture(txt, color = '#fff') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 256, 256); g.font = '800 170px Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(txt, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Stage3D {
  constructor(canvas, labelsEl, opts = {}) {
    this.canvas = canvas; this.labelsEl = labelsEl; this.onSelect = opts.onSelect || (() => { });
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lowPower = opts.lowPower ?? (matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4);
    this.ok = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lowPower, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { this.ok = false; console.warn('WebGL unavailable', e); return; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowPower ? 1.5 : 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xcfe1ff, 0.010);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.camPos = new THREE.Vector3(0, 0, 18); this.camLook = new THREE.Vector3(0, 0, 0);
    this.camTargetPos = this.camPos.clone(); this.camTargetLook = this.camLook.clone();
    this.camera.position.copy(this.camPos);
    this.clock = new THREE.Clock(); this.t = 0; this.frame = 0;
    this.pointer = new THREE.Vector2(); this.mode = 'network';
    this.labels = []; this.glow = glowTexture();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const l1 = new THREE.PointLight(BLUE, 70, 60); l1.position.set(-8, 6, 8); this.scene.add(l1);
    const l2 = new THREE.PointLight(GREEN, 60, 60); l2.position.set(9, -4, 7); this.scene.add(l2);
    this.groups = {};
    for (const k of ['network', 'galaxy', 'roadmap', 'venn', 'podium']) { this.groups[k] = new THREE.Group(); this.groups[k].visible = k === 'network'; this.scene.add(this.groups[k]); }
    this.buildNetwork(); this.buildGalaxy(); this.buildRoadmap(); this.buildVenn(); this.buildPodium(); this.buildBurst();
    this.bind(); this.resize();
    this.setMode('network', true);
    this.loop = this.loop.bind(this); this.running = true; requestAnimationFrame(this.loop);
  }

  // ---------- أدوات عامة ----------
  addLabel(html, cls, getPos, group) {
    const el = document.createElement('div'); el.className = 'lbl3d ' + (cls || ''); el.innerHTML = html; this.labelsEl.appendChild(el);
    const rec = { el, getPos, group }; this.labels.push(rec); return rec;
  }
  bind() {
    const c = this.canvas; this.drag = { on: false, x: 0, vx: 0, moved: 0 };
    window.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect(); this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      if (this.drag.on) { const dx = e.clientX - this.drag.x; this.drag.x = e.clientX; this.drag.vx = dx * 0.004; this.drag.moved += Math.abs(dx); this.groups.galaxy.rotation.y += dx * 0.005; }
    });
    c.addEventListener('pointerdown', (e) => { this.drag.on = true; this.drag.x = e.clientX; this.drag.moved = 0; });
    window.addEventListener('pointerup', (e) => { if (this.drag.on && this.drag.moved < 6 && this.mode === 'galaxy') this.pick(e); this.drag.on = false; });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(c.parentElement || c);
  }
  resize() {
    const p = this.canvas.parentElement || this.canvas; const w = Math.max(1, p.clientWidth), h = Math.max(1, p.clientHeight);
    this.w = w; this.h = h; this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    // على الشاشات الضيقة نبعد الكاميرا قليلًا
    this.aspectBoost = w / h < 0.9 ? 1.45 : w / h < 1.3 ? 1.15 : 1;
    this.camera.updateProjectionMatrix();
  }

  // ---------- شبكة الخلفية ----------
  buildNetwork() {
    const g = this.groups.network; const R = rnd(11); const N = this.lowPower ? 90 : 170; const pts = [];
    for (let i = 0; i < N; i++) { const r = 6 + R() * 11; const th = R() * Math.PI * 2; const ph = Math.acos(2 * R() - 1); pts.push(new THREE.Vector3(r * Math.sin(ph) * Math.cos(th) * 1.5, r * Math.sin(ph) * Math.sin(th) * 0.8, r * Math.cos(ph) - 4)); }
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3); const cB = new THREE.Color(0x2f6bff), cG = new THREE.Color(0x4c9a0a), cW = new THREE.Color(0x1b4fb8);
    pts.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); const c = i % 6 === 0 ? cG : i % 5 === 0 ? cW : cB; col.set([c.r, c.g, c.b], i * 3); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.netPoints = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.6, map: this.glow, vertexColors: true, opacity: 0.9, transparent: true, depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true }));
    g.add(this.netPoints);
    const segs = []; this.edges = [];
    pts.forEach((p, i) => { const near = pts.map((q, j) => [j, p.distanceToSquared(q)]).filter(x => x[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 2); near.forEach(([j, d]) => { if (d < 40 && j > i) { segs.push(p.x, p.y, p.z, pts[j].x, pts[j].y, pts[j].z); this.edges.push([p, pts[j]]); } }); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.28 })));
    // إشارات تتحرك على الحواف
    const S = this.lowPower ? 8 : 18; this.signals = Array.from({ length: S }, () => ({ e: Math.floor(R() * this.edges.length), t: R(), v: 0.15 + R() * 0.35 }));
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(S * 3), 3));
    this.sigPoints = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.9, map: this.glow, color: 0x3fa000, transparent: true, depthWrite: false, blending: THREE.NormalBlending }));
    g.add(this.sigPoints);
    // نواة متوهجة بعيدة
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: 0x2f6bff, wireframe: true, transparent: true, opacity: 0.32 })); core.position.set(0, 0, -14); g.add(core); this.netCore = core;
  }

  // ---------- مجرة الوظائف ----------
  buildGalaxy() {
    const g = this.groups.galaxy; this.nodes = [];
    const core = new THREE.Group(); const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color: 0x0a2a6b, emissive: 0x2f6bff, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.4 }));
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.95, 1), new THREE.MeshBasicMaterial({ color: 0x4c9a0a, wireframe: true, transparent: true, opacity: 0.65 }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0x6aa2ff, opacity: 0.45, transparent: true, blending: THREE.NormalBlending, depthWrite: false })); halo.scale.set(9, 9, 1);
    core.add(ico, wire, halo); g.add(core); this.galCore = core;
    this.addLabel('<b>DATA</b><span>&amp; AI</span>', 'core', () => new THREE.Vector3(0, 0, 0).applyMatrix4(g.matrixWorld), 'galaxy');
    CAREERS.forEach((c, i) => {
      const data = c.group === 'data'; const color = data ? BLUE : GREEN; const R = 4.2 + (i % 3) * 1.6; const tilt = (i % 2 ? 1 : -1) * (0.25 + (i % 3) * 0.12);
      const orbit = new THREE.Group(); orbit.rotation.x = tilt; orbit.rotation.z = i * 0.35; g.add(orbit);
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, k) => new THREE.Vector3(Math.cos(k / 96 * Math.PI * 2) * R, 0, Math.sin(k / 96 * Math.PI * 2) * R))), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }));
      orbit.add(ring);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 32), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.3 }));
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color, transparent: true, blending: THREE.NormalBlending, depthWrite: false })); h.scale.set(3.6, 3.6, 1); m.add(h);
      m.userData.career = c.id; orbit.add(m);
      const rec = { c, mesh: m, orbit, R, a: (i / CAREERS.length) * Math.PI * 2, speed: 0.12 + (i % 3) * 0.035, scale: 1, target: 1, halo: h };
      this.nodes.push(rec);
      this.addLabel(`<b>${c.ar}</b><span>${c.en}</span>`, data ? 'data' : 'ai', () => m.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.15, 0)), 'galaxy').el.dataset.career = c.id;
    });
  }
  pick(e) {
    const r = this.canvas.getBoundingClientRect(); const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.camera);
    const hit = ray.intersectObjects(this.nodes.map(n => n.mesh), false)[0]; if (hit) this.select(hit.object.userData.career);
  }
  select(id) {
    this.selected = id; this.nodes.forEach(n => { n.target = n.c.id === id ? 1.5 : 1; });
    this.labels.forEach(l => l.el.classList.toggle('sel', l.el.dataset.career === id));
    this.onSelect(id);
  }

  // ---------- خريطة الطريق ----------
  buildRoadmap() {
    const g = this.groups.roadmap; const cols = [BLUE, GREEN, AMBER, 0x6a5cff]; this.plat = [];
    const pts = YEARS.map((y, i) => new THREE.Vector3((i - 1.5) * 5.6, i * 1.7 - 2.4, Math.sin(i * 1.1) * 2.2));
    this.rmCurve = new THREE.CatmullRomCurve3(pts.map(p => p.clone().add(new THREE.Vector3(0, 0.6, 0))));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(this.rmCurve, 120, 0.08, 8, false), new THREE.MeshBasicMaterial({ color: 0x4c9a0a, transparent: true, opacity: 0.75 })); g.add(tube);
    YEARS.forEach((y, i) => {
      const p = pts[i]; const grp = new THREE.Group(); grp.position.copy(p);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, 0.5, 40), new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.3 })); grp.add(base);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.26; grp.add(ring);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: numberTexture(String(y.n), '#0A2A6B'), transparent: true })); num.position.y = 1.4; grp.add(num);
      g.add(grp); this.plat.push({ grp, num });
      this.addLabel(`<b>السنة ${y.n}</b><span>${y.en}</span>`, 'year y' + y.n, () => grp.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -1.0, 0)), 'roadmap').el.dataset.year = y.n;
    });
    const rocket = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })); const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 16), new THREE.MeshStandardMaterial({ color: 0xd64545 })); nose.position.y = 0.67;
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffb340, transparent: true, blending: THREE.NormalBlending, depthWrite: false })); flame.scale.set(1.2, 1.6, 1); flame.position.y = -0.7;
    rocket.add(body, nose, flame); g.add(rocket); this.rocket = rocket; this.rmProgress = 0; this.rmTarget = 0; this.rmFlame = flame;
  }
  setRoadmap(year) { this.rmTarget = Math.max(0, Math.min(3, year)); }

  // ---------- فِن ----------
  buildVenn() {
    const g = this.groups.venn; this.vennSpheres = [];
    [[1.9, BLUE], [-1.9, GREEN]].forEach(([x, col]) => {
      const grp = new THREE.Group(); grp.position.x = x;
      grp.add(new THREE.Mesh(new THREE.SphereGeometry(3.1, 48, 48), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.22, roughness: 0.2, metalness: 0.1, depthWrite: false })));
      grp.add(new THREE.Mesh(new THREE.SphereGeometry(3.14, 24, 18), new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.35 })));
      g.add(grp); this.vennSpheres.push(grp);
    });
    const lens = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffffff, transparent: true, blending: THREE.NormalBlending, depthWrite: false, opacity: 0.8 })); lens.scale.set(4.2, 5.6, 1); g.add(lens);
    this.addLabel('<b>علم البيانات</b><span>Data Science</span><i>فهم · تحليل · تفسير</i>', 'venn d', () => new THREE.Vector3(3.6, 0.2, 0.5), 'venn');
    this.addLabel('<b>الذكاء الاصطناعي</b><span>Artificial Intelligence</span><i>تعلّم · تنبؤ · قرار</i>', 'venn a', () => new THREE.Vector3(-3.6, 0.2, 0.5), 'venn');
    this.addLabel('<b>ML</b><span>تعلّم الآلة</span>', 'venn m', () => new THREE.Vector3(0, 0, 0.5), 'venn');
  }

  // ---------- منصة التتويج ----------
  buildPodium() {
    const g = this.groups.podium; this.towers = {};
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.4, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0xbfd5ff, emissive: 0x2f6bff, emissiveIntensity: 0.12, roughness: 0.5, metalness: 0.1 })); floor.position.y = -0.15; g.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.1, 0.06, 8, 96), new THREE.MeshBasicMaterial({ color: 0x4c9a0a })); ring.rotation.x = Math.PI / 2; g.add(ring);
    [['shabab', 3.2, BLUE, 'الشباب'], ['banat', -3.2, GREEN, 'البنات']].forEach(([id, x, col, nm]) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1, 3.2), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.3 })); tower.position.set(x, 0.5, 0); g.add(tower);
      const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0xffd66b, emissive: 0xf2a900, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.2 })); g.add(top);
      this.towers[id] = { tower, top, h: 1, target: 1, x, score: 0 };
      this.addLabel(`<b>${nm}</b><span class="sc" data-team="${id}">0</span><i data-team-sub="${id}"></i>`, 'tower ' + id, () => new THREE.Vector3(x, this.towers[id].h + 2.1, 0), 'podium');
    });
  }
  setPodium(scores) {
    const max = Math.max(1, scores.shabab, scores.banat);
    ['shabab', 'banat'].forEach(id => { const t = this.towers[id]; t.target = 1.2 + (scores[id] / max) * 4.4; t.score = scores[id]; });
    this.podiumWinner = scores.shabab === scores.banat ? null : (scores.shabab > scores.banat ? 'shabab' : 'banat');
    this.labelsEl.querySelectorAll('.sc').forEach(el => { el.textContent = Math.round(scores[el.dataset.team] * 10) / 10; });
  }

  // ---------- انفجار احتفالي ----------
  buildBurst() {
    const N = 160; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.burstPts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.7, map: this.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending, opacity: 1 }));
    this.burstPts.frustumCulled = false; this.burstData = { v: new Float32Array(N * 3), life: 0, N }; this.scene.add(this.burstPts); this.burstPts.visible = false;
  }
  burst(colors = [BLUE, GREEN, AMBER, WHITE], origin = new THREE.Vector3(0, 1, 4)) {
    if (!this.ok || this.reduced) return; const d = this.burstData; const pos = this.burstPts.geometry.attributes.position, col = this.burstPts.geometry.attributes.color;
    for (let i = 0; i < d.N; i++) { pos.setXYZ(i, origin.x, origin.y, origin.z); const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI, s = 3 + Math.random() * 7; d.v[i * 3] = Math.cos(a) * Math.sin(b) * s; d.v[i * 3 + 1] = Math.abs(Math.cos(b)) * s * 0.8 + 2; d.v[i * 3 + 2] = Math.sin(a) * Math.sin(b) * s; const c = new THREE.Color(colors[i % colors.length]); col.setXYZ(i, c.r, c.g, c.b); }
    pos.needsUpdate = col.needsUpdate = true; d.life = 1.6; this.burstPts.visible = true;
  }

  // ---------- التحكم بالأوضاع ----------
  setMode(mode, instant = false) {
    this.mode = mode; for (const k in this.groups) this.groups[k].visible = (k === mode) || k === 'network' && mode !== 'podium';
    this.groups.network.visible = true;
    const b = this.aspectBoost || 1;
    const P = {
      network: [[0, 0, 18], [0, 0, 0]], galaxy: [[0, 6, 16.5], [0, -0.7, 0]], roadmap: [[0, 1, 16], [0, -2.2, 0]],
      venn: [[0, 0, 12.5], [0, -0.6, 0]], podium: [[0, 4.2, 17.5], [0, 1.4, 0]],
    }[mode] || [[0, 0, 18], [0, 0, 0]];
    const half = { galaxy: 9, roadmap: 10.5, venn: 8, podium: 8.5 }[mode];
    let k = b; if (half) { const need = half / (Math.tan(this.camera.fov * Math.PI / 360) * Math.max(0.3, this.camera.aspect)); k = Math.max(1, need / P[0][2]); }
    this.base = { pos: new THREE.Vector3(P[0][0], P[0][1] * Math.min(k, 1.6), P[0][2] * k), look: new THREE.Vector3(...P[1]) };
    this.camTargetPos.copy(this.base.pos); this.camTargetLook.copy(this.base.look);
    if (instant) { this.camPos.copy(this.camTargetPos); this.camLook.copy(this.camTargetLook); }
    this.labels.forEach(l => { l.el.style.display = 'none'; });
    if (mode !== 'galaxy') { this.selected = null; this.nodes.forEach(n => { n.target = 1; }); this.labels.forEach(l => l.el.classList.remove('sel')); }
    if (mode === 'network') this.rmTarget = 0;
  }
  focusCareer(id) { this.select(id); }

  // ---------- الحلقة ----------
  loop() {
    if (!this.running) return; requestAnimationFrame(this.loop);
    if (document.hidden) return; this.frame++; if (this.lowPower && this.frame % 2) return;
    const dt = Math.min(this.clock.getDelta() * (this.lowPower ? 2 : 1), 0.1); this.t += dt; const t = this.t; const k = this.reduced ? 0 : 1;
    // شبكة
    this.groups.network.rotation.y = t * 0.025 * k; this.groups.network.rotation.x = Math.sin(t * 0.1) * 0.05 * k; this.netCore.rotation.y = t * 0.15; this.netCore.rotation.x = t * 0.1;
    const sp = this.sigPoints.geometry.attributes.position; this.signals.forEach((s, i) => { s.t += s.v * dt; if (s.t > 1) { s.t = 0; s.e = Math.floor(Math.random() * this.edges.length); } const [a, b] = this.edges[s.e]; sp.setXYZ(i, a.x + (b.x - a.x) * s.t, a.y + (b.y - a.y) * s.t, a.z + (b.z - a.z) * s.t); }); sp.needsUpdate = true;
    // مجرة
    if (this.mode === 'galaxy') {
      this.galCore.rotation.y = t * 0.4; this.galCore.rotation.x = t * 0.2;
      if (!this.drag.on) { this.groups.galaxy.rotation.y += (this.drag.vx || 0); this.drag.vx *= 0.94; this.groups.galaxy.rotation.y += 0.0016 * k; }
      this.nodes.forEach((n) => { n.a += n.speed * dt * k * (this.selected ? 0.25 : 1); n.mesh.position.set(Math.cos(n.a) * n.R, 0, Math.sin(n.a) * n.R); n.scale += (n.target - n.scale) * 0.12; n.mesh.scale.setScalar(n.scale); n.halo.material.opacity = n.c.id === this.selected ? 0.75 : 0.32 + Math.sin(t * 2 + n.R) * 0.08; });
      if (this.selected) { const n = this.nodes.find(x => x.c.id === this.selected); if (n) { const wp = n.mesh.getWorldPosition(new THREE.Vector3()); this.camTargetLook.lerp(wp.multiplyScalar(0.55), 0.05); this.camTargetPos.copy(this.base.pos).multiplyScalar(0.82); } }
      else { this.camTargetLook.lerp(this.base.look, 0.05); this.camTargetPos.copy(this.base.pos); }
    }
    // خريطة الطريق
    if (this.mode === 'roadmap') {
      this.rmProgress += (this.rmTarget - this.rmProgress) * 0.04; const u = this.rmProgress / 3; const p = this.rmCurve.getPoint(Math.min(1, Math.max(0, u))); const tg = this.rmCurve.getTangent(Math.min(1, Math.max(0, u)));
      this.rocket.position.copy(p).add(new THREE.Vector3(0, 0.5 + Math.sin(t * 3) * 0.08, 0)); this.rocket.rotation.z = -Math.atan2(tg.x, tg.y) * 0.6; this.rmFlame.scale.set(1 + Math.sin(t * 25) * 0.15, 1.6 + Math.sin(t * 30) * 0.25, 1);
      this.plat.forEach((pl, i) => { const near = Math.abs(this.rmProgress - i) < 0.6; pl.grp.scale.setScalar(pl.grp.scale.x + ((near ? 1.12 : 1) - pl.grp.scale.x) * 0.1); pl.num.rotation.y = Math.sin(t * 0.8 + i) * 0.25; pl.num.position.y = 1.4 + Math.sin(t * 1.5 + i) * 0.1; });
      this.camTargetLook.copy(this.base.look); this.camTargetPos.copy(this.base.pos);
    }
    // فِن
    if (this.mode === 'venn') { this.vennSpheres.forEach((s, i) => { s.rotation.y = t * 0.2 * (i ? -1 : 1) * k; s.rotation.x = Math.sin(t * 0.3 + i) * 0.1; }); }
    // منصة
    if (this.mode === 'podium') {
      for (const id in this.towers) { const T = this.towers[id]; T.h += (T.target - T.h) * 0.05; T.tower.scale.y = T.h; T.tower.position.y = T.h / 2; T.top.position.set(T.x, T.h + 0.95 + Math.sin(t * 2) * 0.12, 0); T.top.rotation.y = t * 1.2; T.top.scale.setScalar(this.podiumWinner === id ? 1.5 : 1); }
      this.groups.podium.rotation.y = Math.sin(t * 0.25) * 0.12 * k;
    }
    // انفجار
    if (this.burstPts.visible) { const d = this.burstData; d.life -= dt; const pos = this.burstPts.geometry.attributes.position; for (let i = 0; i < d.N; i++) { d.v[i * 3 + 1] -= 9 * dt; pos.setXYZ(i, pos.getX(i) + d.v[i * 3] * dt, pos.getY(i) + d.v[i * 3 + 1] * dt, pos.getZ(i) + d.v[i * 3 + 2] * dt); } pos.needsUpdate = true; this.burstPts.material.opacity = Math.max(0, d.life / 1.6); if (d.life <= 0) this.burstPts.visible = false; }
    // كاميرا
    this.camPos.lerp(this.camTargetPos, 0.045); this.camLook.lerp(this.camTargetLook, 0.05);
    this.camera.position.set(this.camPos.x + this.pointer.x * 0.9 * k, this.camPos.y + this.pointer.y * 0.6 * k, this.camPos.z); this.camera.lookAt(this.camLook);
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }
  updateLabels() {
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      if (l.group !== this.mode) { l.el.style.display = 'none'; continue; }
      v.copy(l.getPos()).project(this.camera);
      if (v.z > 1) { l.el.style.display = 'none'; continue; }
      l.el.style.display = ''; l.el.style.transform = `translate(-50%,-50%) translate(${((v.x * 0.5 + 0.5) * this.w).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * this.h).toFixed(1)}px)`;
    }
  }
  dispose() { this.running = false; this.ro && this.ro.disconnect(); this.renderer && this.renderer.dispose(); }
}
