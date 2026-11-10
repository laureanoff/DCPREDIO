import * as THREE from "three";
import { stageFx } from "@/lib/stage-fx";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function grassTexture(maxAniso: number) {
  const W = 1024, H = 1844; // 20 m x 36 m
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const stripes = 9;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? "#2c7620" : "#378529";
    g.fillRect(0, (H / stripes) * i, W, H / stripes + 1);
  }
  for (let i = 0; i < 90000; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    g.fillStyle = Math.random() < 0.5 ? `rgba(180,230,110,${rnd(0.05, 0.16)})` : `rgba(10,40,6,${rnd(0.08, 0.2)})`;
    g.fillRect(x, y, rnd(1, 2.2), rnd(4, 11));
  }
  g.strokeStyle = "rgba(255,255,255,.92)";
  g.lineWidth = 7;
  const m = 26;
  g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  g.beginPath(); g.moveTo(m, H / 2); g.lineTo(W - m, H / 2); g.stroke();
  g.beginPath(); g.arc(W / 2, H / 2, 154, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(W / 2, H / 2, 8, 0, Math.PI * 2); g.fill();
  for (const top of [true, false]) {
    const y0 = top ? m : H - m - 300;
    g.strokeRect(W / 2 - 256, y0, 512, 300);
    g.beginPath(); g.arc(W / 2, top ? m + 205 : H - m - 205, 8, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function noiseTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 25);
  return t;
}

function glowTexture(streak = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,250,225,1)");
  gr.addColorStop(0.12, "rgba(255,244,205,.75)");
  gr.addColorStop(0.45, "rgba(255,240,190,.16)");
  gr.addColorStop(1, "rgba(255,240,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  if (streak) { g.globalCompositeOperation = "destination-in"; const lg = g.createLinearGradient(0, 0, 0, 256); lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(.5, "rgba(0,0,0,1)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(0, 0, 256, 256); }
  return new THREE.CanvasTexture(c);
}

const beamMat = (intensity: { v: number }) =>
  new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uI: intensity as unknown as THREE.IUniform<number>, uColor: { value: new THREE.Color(1, 0.96, 0.8) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){ vH = uv.y; vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition-wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform float uI; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = uI * pow(f,2.0) * (0.03 + 0.34*pow(vH,1.3)); gl_FragColor = vec4(uColor, a); }`,
  });

export function createStageScene(canvas: HTMLCanvasElement, host: HTMLElement) {
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
  renderer.setClearColor(0x03060a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04080d, 0.022);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0x5a7da8, 0x0a1a08, 0.12));

  // Cancha
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 36),
    new THREE.MeshStandardMaterial({ map: grassTexture(aniso), bumpMap: noiseTexture(), bumpScale: 0.9, roughness: 0.92, metalness: 0 }),
  );
  pitch.rotation.x = -Math.PI / 2;
  scene.add(pitch);
  const surround = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ color: 0x0b2308, roughness: 1 }));
  surround.rotation.x = -Math.PI / 2; surround.position.y = -0.02;
  scene.add(surround);

  // Arco lejano (fondo)
  const goal = new THREE.Group();
  const post = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 });
  for (const x of [-1.5, 1.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2, 12), post); p.position.set(x, 1, 0); goal.add(p); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.12, 12), post); bar.rotation.z = Math.PI / 2; bar.position.set(0, 2, 0); goal.add(bar);
  const netPts: number[] = [];
  for (let i = 0; i <= 12; i++) { const x = -1.5 + (3 * i) / 12; netPts.push(x, 0, -1.2, x, 2, -0.2); }
  for (let j = 0; j <= 8; j++) { const y = (2 * j) / 8; netPts.push(-1.5, y, -0.2 - (1 - y / 2) * 1, 1.5, y, -0.2 - (1 - y / 2) * 1); }
  const netGeo = new THREE.BufferGeometry(); netGeo.setAttribute("position", new THREE.Float32BufferAttribute(netPts, 3));
  goal.add(new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0xdfe8df, transparent: true, opacity: 0.28 })));
  goal.position.set(0, 0, -17.6);
  scene.add(goal);

  // Reflectores
  type Lamp = { group: THREE.Group; spot: THREE.SpotLight; beam: THREE.Mesh; bulbs: THREE.MeshBasicMaterial[]; glow: THREE.Sprite; streak: THREE.Sprite; u: { v: number }; side: number };
  const glowTex = glowTexture(), streakTex = glowTexture(true);
  const lamps: Lamp[] = [-1, 1].map((side) => {
    const u = { v: 0 };
    const group = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 0.35), new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.6, metalness: 0.5 }));
    group.add(frame);
    const bulbs: THREE.MeshBasicMaterial[] = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x151d24 });
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.31, 20), m);
      b.position.set((c - 1) * 0.74, (r - 0.5) * 0.74, 0.19); group.add(b); bulbs.push(m);
    }
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 11, 0.22), new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.7 }));
    scene.add(pole);
    const spot = new THREE.SpotLight(0xfff1cf, 0, 60, 0.62, 0.85, 1.4);
    spot.castShadow = false;
    scene.add(spot, spot.target);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    scene.add(group, glow, streak);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1, 1, 48, 1, true), beamMat(u));
    scene.add(beam);
    (group as THREE.Group & { pole?: THREE.Mesh }).pole = pole;
    return { group, spot, beam, bulbs, glow, streak, u, side };
  });

  // Polvo flotando en los haces
  const N = mobile ? 160 : 380;
  const dust = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dust[i * 3] = rnd(-14, 14); dust[i * 3 + 1] = rnd(0.5, 11); dust[i * 3 + 2] = rnd(-14, 6); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  const dm = new THREE.PointsMaterial({ color: 0xfff3d0, size: 0.06, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  scene.add(new THREE.Points(dg, dm));

  let w = 1, h = 1, camP = -1, raf = 0, running = false;
  const layout = () => {
    const r = host.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 50 + (1 - w / h) * 22 : 50;
    camera.updateProjectionMatrix();
    // Posición de los reflectores según el ancho visible a esa distancia
    const dist = 24;
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect * dist;
    const lx = Math.min(12.5, halfW * 0.78);
    for (const L of lamps) {
      const pos = new THREE.Vector3(L.side * lx, 10.2, -6);
      const tgt = new THREE.Vector3(-L.side * lx * 0.22, 0, -2.5);
      L.group.position.copy(pos);
      L.group.lookAt(tgt.clone().setY(pos.y - 4)); // la cara mira hacia la cancha y un poco al público
      L.spot.position.copy(pos); L.spot.target.position.copy(tgt);
      const pole = (L.group as THREE.Group & { pole?: THREE.Mesh }).pole!;
      pole.position.set(pos.x, pos.y / 2 - 0.9, pos.z - 0.4);
      const dir = pos.clone().sub(tgt); const len = dir.length();
      const rBot = len * Math.tan(0.6);
      L.beam.scale.set(rBot, len, rBot);
      L.beam.position.copy(pos.clone().add(tgt).multiplyScalar(0.5));
      L.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  const clock = new THREE.Clock();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!stageFx.visible) return;
    const t = clock.getElapsedTime();
    camP = camP < 0 ? stageFx.p : camP + (stageFx.p - camP) * 0.08;
    camera.position.set(Math.sin(t * 0.15) * 0.35, 3.4 - camP * 1.5, 20 - camP * 5.5);
    camera.lookAt(0, 2.6 + camP * 0.4, -10);
    const ls = [stageFx.l1, stageFx.l2];
    lamps.forEach((L, i) => {
      const l = ls[i];
      L.spot.intensity = l * 1100;
      L.u.v = l;
      const s = l > 0 ? 1 : 0;
      L.bulbs.forEach((m) => m.color.setRGB(0.08 + l * 0.95, 0.1 + l * 0.9, 0.12 + l * 0.75));
      L.glow.position.copy(L.group.position); L.streak.position.copy(L.group.position);
      L.glow.scale.setScalar((9 + l * 9) * s); L.streak.scale.set((26 + l * 12) * s, 1.8 * s, 1);
      (L.glow.material as THREE.SpriteMaterial).opacity = l * 0.9;
      (L.streak.material as THREE.SpriteMaterial).opacity = l * 0.55;
    });
    dm.opacity = Math.min(1, (ls[0] + ls[1]) * 0.45);
    const pos = dg.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) { pos.setY(i, ((pos.getY(i) + 0.0025 * (1 + (i % 5))) % 11) + 0.0); pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i) * 0.0015); }
    pos.needsUpdate = true;
    renderer.render(scene, camera);
  };
  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
  start();

  return {
    dispose() {
      cancelAnimationFrame(raf); running = false; ro.disconnect();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose()); });
      renderer.dispose();
    },
  };
}
