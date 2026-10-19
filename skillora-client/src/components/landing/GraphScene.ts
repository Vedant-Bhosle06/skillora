// The homepage hero: the real skill graph in three.js, driven by scroll progress (0 → 1).
// Story: start on the one skill you know → pull back to the whole graph → the A* route lights up
// → the route settles into the SKILLORA mark (its four nodes are the route's four steps).
// Loaded with a dynamic import, so three.js is only fetched on the homepage.
import * as THREE from "three";
import type { LandingGraph } from "@/content/landingGraph";

// Same path as the logo (src/components/Logo.tsx), on its 32×32 grid.
const LOGO_PATH = "M8,26.5 C16.7,24.4 22.05,27.95 22.5,23 C22.95,18.05 9.05,15.1 9.5,10 C9.95,4.9 15.3,8.4 24,6";
const LOGO_NODES: [number, number][] = [[8, 26.5], [22.5, 23], [9.5, 10], [24, 6]];
const TRAIL = 360; // points along the route trail

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

interface Palette { base: THREE.Color; held: THREE.Color; routeA: THREE.Color; routeB: THREE.Color; edge: THREE.Color }
const PALETTES: Record<"dark" | "light", Palette> = {
  dark: { base: new THREE.Color("#9aa3d8"), held: new THREE.Color("#5cc8ff"), routeA: new THREE.Color("#a597ff"), routeB: new THREE.Color("#5cc8ff"), edge: new THREE.Color("#8f97c8") },
  light: { base: new THREE.Color("#6b72a3"), held: new THREE.Color("#0377c4"), routeA: new THREE.Color("#5b45f0"), routeB: new THREE.Color("#0377c4"), edge: new THREE.Color("#5d6694") },
};

const POINT_VERT = /* glsl */ `
  attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
  varying vec3 vColor; varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vColor = aColor; vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (24.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const POINT_FRAG = /* glsl */ `
  varying vec3 vColor; varying float vAlpha; uniform float uGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = smoothstep(0.24, 0.17, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.55 * uGlow;
    float a = (disc + halo) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }`;
const LINE_VERT = /* glsl */ `
  attribute float aAlpha; attribute vec3 aColor; varying vec3 vColor; varying float vAlpha;
  void main() { vColor = aColor; vAlpha = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINE_FRAG = /* glsl */ `
  varying vec3 vColor; varying float vAlpha; uniform float uOpacity;
  void main() { gl_FragColor = vec4(vColor, vAlpha * uOpacity); }`;

/** Samples the logo's three cubic Béziers into `n` points on the 32-grid. */
function sampleLogo(n: number): [number, number][] {
  const nums = LOGO_PATH.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const start: [number, number] = [nums[0], nums[1]];
  const curves: [number, number][][] = [];
  let prev = start;
  for (let i = 2; i + 5 < nums.length; i += 6) {
    const c: [number, number][] = [prev, [nums[i], nums[i + 1]], [nums[i + 2], nums[i + 3]], [nums[i + 4], nums[i + 5]]];
    curves.push(c);
    prev = c[3];
  }
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const u = (k / (n - 1)) * curves.length;
    const ci = Math.min(curves.length - 1, Math.floor(u));
    const t = u - ci;
    const [p0, p1, p2, p3] = curves[ci];
    const mt = 1 - t;
    out.push([
      mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
      mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

export class GraphScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
  private nodes: THREE.Points;
  private edges: THREE.LineSegments;
  private trail: THREE.Points;
  private nodeMat: THREE.ShaderMaterial;
  private trailMat: THREE.ShaderMaterial;
  private edgeMat: THREE.ShaderMaterial;
  private palette: Palette;
  private dark: boolean;

  private target = 0;      // scroll progress requested
  private current = -1;    // progress actually drawn (eased toward target)
  private raf = 0;
  private running = false;
  private clock = new THREE.Clock();
  private width = 1;
  private height = 1;

  private basePos: Float32Array;
  private routeIdx: number[];
  private heldIdx: Set<number>;
  private neighbourIdx: Set<number>;
  private graphTrail: THREE.Vector3[];
  private logoTrail: [number, number][];
  private labels: { el: HTMLElement; node: number; step: number }[] = [];

  constructor(canvas: HTMLCanvasElement, private labelLayer: HTMLElement, private graph: LandingGraph, opts: { dark: boolean }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.dark = opts.dark;
    this.palette = PALETTES[this.dark ? "dark" : "light"];

    const index = new Map(graph.nodes.map((n, i) => [n.slug, i]));
    this.routeIdx = graph.route.map(s => index.get(s.slug)!);
    this.heldIdx = new Set(graph.held.map(h => index.get(h.slug)!));
    const start = index.get("python")!;
    this.neighbourIdx = new Set(graph.edges.flatMap(([a, b]) => (a === start ? [b] : b === start ? [a] : [])));

    // Nodes
    const n = graph.nodes.length;
    this.basePos = new Float32Array(n * 3);
    graph.nodes.forEach((node, i) => this.basePos.set(node.p, i * 3));
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.BufferAttribute(this.basePos.slice(), 3));
    ng.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    ng.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(n), 1));
    ng.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(n), 1));
    this.nodeMat = this.pointMaterial();
    this.nodes = new THREE.Points(ng, this.nodeMat);

    // Edges
    const eg = new THREE.BufferGeometry();
    const ep = new Float32Array(graph.edges.length * 6);
    graph.edges.forEach(([a, b], i) => { ep.set(graph.nodes[a].p, i * 6); ep.set(graph.nodes[b].p, i * 6 + 3); });
    eg.setAttribute("position", new THREE.BufferAttribute(ep, 3));
    eg.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(graph.edges.length * 6), 3));
    eg.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(graph.edges.length * 2), 1));
    this.edgeMat = new THREE.ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false,
      uniforms: { uOpacity: { value: 1 } },
    });
    this.edges = new THREE.LineSegments(eg, this.edgeMat);

    // Route trail: dense points along a smooth curve through the route's nodes, in step order.
    const curve = new THREE.CatmullRomCurve3(this.routeIdx.map(i => new THREE.Vector3(...graph.nodes[i].p)), false, "centripetal");
    this.graphTrail = curve.getSpacedPoints(TRAIL - 1);
    this.logoTrail = sampleLogo(TRAIL);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    tg.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    tg.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(TRAIL), 1));
    tg.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(TRAIL), 1));
    this.trailMat = this.pointMaterial();
    this.trail = new THREE.Points(tg, this.trailMat);

    this.scene.add(this.edges, this.nodes, this.trail);
    this.buildLabels(start);
    this.applyTheme();
  }

  private pointMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false,
      uniforms: { uPixelRatio: { value: this.renderer.getPixelRatio() }, uGlow: { value: 1 } },
    });
  }

  private buildLabels(start: number) {
    const make = (text: string, node: number, step: number) => {
      const el = document.createElement("div");
      el.className = "graph-label";
      el.textContent = text;
      el.style.opacity = "0";
      this.labelLayer.appendChild(el);
      this.labels.push({ el, node, step });
    };
    make("Python · you know this", start, -1);
    this.graph.route.forEach((s, i) => {
      if (s.slug === "python") return;
      make(`${s.name} · ${s.estCost} h`, this.routeIdx[i], i);
    });
  }

  setTheme(dark: boolean) {
    if (dark === this.dark) return;
    this.dark = dark;
    this.palette = PALETTES[dark ? "dark" : "light"];
    this.applyTheme();
    this.current = -1; // force a redraw with the new colours
    this.requestFrame();
  }

  private applyTheme() {
    const blending = this.dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (const m of [this.nodeMat, this.trailMat, this.edgeMat]) { m.blending = blending; m.needsUpdate = true; }
    this.nodeMat.uniforms.uGlow.value = this.dark ? 1 : 0.35;
    this.trailMat.uniforms.uGlow.value = this.dark ? 1 : 0.45;
    // Edge colours never change with progress, only with theme.
    const c = this.edges.geometry.getAttribute("aColor") as THREE.BufferAttribute;
    for (let i = 0; i < c.count; i++) c.setXYZ(i, this.palette.edge.r, this.palette.edge.g, this.palette.edge.b);
    c.needsUpdate = true;
  }

  setProgress(p: number) {
    this.target = clamp01(p);
    this.requestFrame();
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.current = -1;
    this.requestFrame();
  }

  /** Keeps a gentle idle drift going while the hero is on screen. */
  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.requestFrame();
  }

  stop() {
    this.running = false;
    this.lastFrame = 0;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private requestFrame() {
    if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.frame(); });
  }

  private lastFrame = 0;

  private frame() {
    // Ease toward the scroll position by elapsed time, not per frame, so slow or throttled
    // screens catch up as quickly as 120 Hz ones.
    const now = performance.now();
    const dt = this.lastFrame ? Math.min(0.5, (now - this.lastFrame) / 1000) : 1;
    this.lastFrame = now;
    const settled = Math.abs(this.target - this.current) < 0.0005;
    this.current = this.current < 0 ? this.target : mix(this.current, this.target, 1 - Math.exp(-dt * 9));
    if (settled) this.current = this.target;
    this.draw(this.current, this.clock.getElapsedTime());
    if (this.running || !settled) this.requestFrame();
  }

  private draw(p: number, time: number) {
    const g = this.graph;
    const pal = this.palette;
    const wide = this.width / this.height > 1.05;

    // Where the mark ends up: right of the text on wide screens, above it on tall ones.
    const logoScale = wide ? 0.42 : 0.25;
    const logoCentre = new THREE.Vector3(wide ? 5.2 : 0, wide ? 0.4 : 5, 0);
    const logoPoint = ([x, y]: [number, number], out = new THREE.Vector3()) =>
      out.set(logoCentre.x + (x - 16) * logoScale, logoCentre.y + (16 - y) * logoScale, 0);

    // Phases
    const reveal = ease(seg(p, 0.12, 0.42));     // pull back from Python to the whole graph
    const route = seg(p, 0.55, 0.76);            // the route lights up step by step
    const morph = ease(seg(p, 0.8, 0.97));       // the route settles into the mark
    const dimOthers = ease(seg(p, 0.5, 0.62));
    const hideOthers = ease(seg(p, 0.78, 0.92));

    // Camera: close on Python, out to the graph, round to face the mark.
    const routeCentre = this.routeIdx.reduce((v, i) => v.add(new THREE.Vector3(...g.nodes[i].p)), new THREE.Vector3()).multiplyScalar(1 / this.routeIdx.length);
    const lookAt = new THREE.Vector3().lerpVectors(new THREE.Vector3(), routeCentre, ease(seg(p, 0.48, 0.62)));
    // Aim between the mark and the text column, so the mark sits beside (wide) or above (tall) the words.
    lookAt.lerp(new THREE.Vector3(logoCentre.x * 0.55, 0, 0), morph);
    const dist = mix(mix(4.2, 27, reveal), wide ? 26 : 30, morph);
    const drift = time * 0.025;
    const theta = mix(0.7 + p * 1.6 + drift, 0, morph);
    const lift = mix(0.22, 0, morph);
    this.camera.position.set(lookAt.x + Math.sin(theta) * dist, lookAt.y + dist * lift, lookAt.z + Math.cos(theta) * dist);
    this.camera.lookAt(lookAt);

    // Nodes
    const pos = this.nodes.geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = this.nodes.geometry.getAttribute("aColor") as THREE.BufferAttribute;
    const alp = this.nodes.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const siz = this.nodes.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    const routeColour = (k: number) => pal.routeA.clone().lerp(pal.routeB, k / Math.max(1, this.routeIdx.length - 1));
    for (let i = 0; i < g.nodes.length; i++) {
      const isHeld = this.heldIdx.has(i);
      const step = this.routeIdx.indexOf(i);
      const near = this.neighbourIdx.has(i);
      const twinkle = 0.85 + 0.15 * Math.sin(time * 1.3 + i * 1.7);
      let a = near ? mix(0.35, 0.85, seg(p, 0.08, 0.3)) : mix(0.0, 0.62, reveal) * twinkle;
      let size = mix(10, 7, reveal) + Math.min(6, g.nodes[i].degree) * 0.6;
      let c = pal.base;
      if (isHeld) { a = 1; size = 16; c = pal.held; }
      if (step >= 0) {
        const lit = route * (this.routeIdx.length - 1) >= step - 0.001 && route > 0;
        if (lit) { a = 1; size = 17; c = routeColour(step); }
      }
      if (step < 0 && !isHeld) a *= mix(1, 0.3, dimOthers) * (1 - hideOthers);
      if (isHeld && step < 0) a *= 1 - hideOthers; // SQL stays out of the final mark
      tmp.set(this.basePos[i * 3], this.basePos[i * 3 + 1], this.basePos[i * 3 + 2]);
      if (step >= 0) { const target = logoPoint(LOGO_NODES[step]); tmp.lerp(target, morph); size = mix(size, step === 3 ? 30 : 24, morph); }
      pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      col.setXYZ(i, c.r, c.g, c.b);
      alp.setX(i, a);
      siz.setX(i, size);
    }
    pos.needsUpdate = col.needsUpdate = alp.needsUpdate = siz.needsUpdate = true;

    // Edges follow the reveal, dim while the route shows, and leave before the mark forms.
    const ea = this.edges.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    g.edges.forEach(([a, b, prereq], i) => {
      const touchesStart = this.neighbourIdx.has(a) && this.neighbourIdx.has(b) ? 0 : (this.neighbourIdx.has(a) || this.neighbourIdx.has(b)) ? 1 : 0;
      const v = (touchesStart ? mix(0.25, 0.4, reveal) * seg(p, 0.06, 0.25) : 0.26 * reveal) * (prereq ? 1 : 0.6) * mix(1, 0.35, dimOthers) * (1 - hideOthers);
      ea.setX(i * 2, v); ea.setX(i * 2 + 1, v);
    });
    ea.needsUpdate = true;
    this.edgeMat.uniforms.uOpacity.value = this.dark ? 1 : 0.9;

    // Trail: drawn along the route, then reshaped into the mark.
    const tp = this.trail.geometry.getAttribute("position") as THREE.BufferAttribute;
    const tc = this.trail.geometry.getAttribute("aColor") as THREE.BufferAttribute;
    const ta = this.trail.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const ts = this.trail.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const lt = new THREE.Vector3();
    for (let k = 0; k < TRAIL; k++) {
      const u = k / (TRAIL - 1);
      tmp.copy(this.graphTrail[k]).lerp(logoPoint(this.logoTrail[k], lt), morph);
      tp.setXYZ(k, tmp.x, tmp.y, tmp.z);
      const c = pal.routeA.clone().lerp(pal.routeB, u);
      tc.setXYZ(k, c.r, c.g, c.b);
      const head = route * 1.0001 - u;
      ta.setX(k, head >= 0 ? mix(0.55, 0.9, morph) : 0);
      ts.setX(k, mix(4.5, 9, morph));
    }
    tp.needsUpdate = tc.needsUpdate = ta.needsUpdate = ts.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
    this.placeLabels(p, route, morph);
  }

  private placeLabels(p: number, route: number, morph: number) {
    const pos = this.nodes.geometry.getAttribute("position") as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      let o: number;
      if (l.step < 0) o = 1 - seg(p, 0.26, 0.36);
      else o = (route * (this.graph.route.length - 1) >= l.step - 0.001 && route > 0 ? 1 : 0) * (1 - morph);
      v.set(pos.getX(l.node), pos.getY(l.node), pos.getZ(l.node)).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * this.width;
      const y = (-v.y * 0.5 + 0.5) * this.height;
      const visible = o > 0.01 && v.z < 1;
      l.el.style.opacity = visible ? String(o) : "0";
      if (visible) l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }

  dispose() {
    this.stop();
    for (const o of [this.nodes, this.edges, this.trail]) o.geometry.dispose();
    for (const m of [this.nodeMat, this.trailMat, this.edgeMat]) m.dispose();
    this.renderer.dispose();
    for (const l of this.labels) l.el.remove();
    this.labels = [];
  }
}

/** True when this browser can create a WebGL context. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
