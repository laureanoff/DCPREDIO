const KEY = "dc-sfx";

export function sfxEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}
export function setSfxEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* sin almacenamiento */ }
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** "¡Gol!": arpegio ascendente + rugido de hinchada. Generado en el navegador, sin archivos. */
export function playGoal() {
  if (!sfxEnabled()) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + 0.02;

  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    const s = t0 + i * 0.09;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.22, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + (i === 3 ? 0.55 : 0.16));
    o.connect(g).connect(a.destination);
    o.start(s);
    o.stop(s + 0.6);
  });

  const len = Math.floor(a.sampleRate * 1.2);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = a.createBufferSource();
  n.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900;
  bp.Q.value = 0.6;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0 + 0.15);
  g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
  n.connect(bp).connect(g).connect(a.destination);
  n.start(t0 + 0.15);
}
