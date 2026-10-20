/**
 * Efectos de sonido y música.
 *  - Los sonidos de public/sounds/ (los tuyos) suenan cuando ya cargaron; mientras tanto, o si falta un
 *    archivo, suena el efecto generado con Web Audio. Para cambiar un sonido, reemplaza el .mp3 con el mismo nombre.
 *  - Música: public/sounds/musica-menu.mp3 (menús) y musica-duelo.mp3 (duelos), en bucle.
 *  - setMuted(true) apaga todo; la música tiene además su propio botón. Se recuerda en este navegador.
 */
export type Sfx =
  | 'click' | 'draw' | 'play' | 'fusion' | 'fusionFail' | 'attack' | 'hit' | 'destroy' | 'damage'
  | 'heal' | 'trap' | 'spell' | 'phase' | 'night' | 'win' | 'lose' | 'error' | 'coin' | 'ritual' | 'level'
  | 'setCard' | 'position' | 'direct' | 'pack';

/** Sonido con archivo propio (en public/sounds/). Los que no están aquí usan el sonido generado. */
const FILES: Partial<Record<Sfx, string>> = {
  click: 'boton', setCard: 'colocar-apoyo', spell: 'colocar-apoyo', trap: 'trampa', attack: 'ataque', direct: 'ataque-directo',
  damage: 'dano', hit: 'dano', destroy: 'destruir', win: 'ganar', lose: 'perder', pack: 'sobre', coin: 'comprar',
  level: 'nivel', position: 'posicion',
};
const buffers = new Map<string, AudioBuffer | 'loading' | 'missing'>();

/** Baja y prepara los sonidos (una vez, después del primer toque). */
function preload(): void {
  const a = ctx;
  if (!a) return;
  for (const name of new Set(Object.values(FILES))) {
    if (buffers.has(name)) continue;
    buffers.set(name, 'loading');
    fetch(`/sounds/${name}.mp3`)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('sin archivo'))))
      .then(data => a.decodeAudioData(data))
      .then(buf => buffers.set(name, buf))
      .catch(() => buffers.set(name, 'missing'));
  }
}

/** Toca el archivo si ya está listo. Devuelve false si hay que usar el sonido generado. */
function playFile(name: Sfx): boolean {
  const file = FILES[name];
  const buf = file ? buffers.get(file) : undefined;
  const a = audio();
  if (!a || !master || !(buf instanceof AudioBuffer)) return false;
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.value = 0.9;
  src.connect(g).connect(master);
  src.start();
  return true;
}

const KEY = 'cartas.sonido';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
const listeners = new Set<(m: boolean) => void>();

function readMuted(): boolean {
  try { return localStorage.getItem(KEY) === 'off'; } catch { return false; }
}

export const isMuted = (): boolean => muted;

export function setMuted(m: boolean): void {
  muted = m;
  try { localStorage.setItem(KEY, m ? 'off' : 'on'); } catch { /* sin almacenamiento */ }
  if (master) master.gain.value = m ? 0 : 0.5;
  listeners.forEach(fn => fn(m));
  syncMusic();
}

export function onMuteChange(fn: (m: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** El navegador solo deja sonar después de que el jugador toca algo. */
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  preload();
  return ctx;
}
if (typeof window !== 'undefined') {
  const unlock = () => { audio(); syncMusic(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

interface ToneOpts { type?: OscillatorType; gain?: number; to?: number; delay?: number; attack?: number }
function tone(freq: number, dur: number, o: ToneOpts = {}): void {
  const a = audio(); if (!a || !master) return;
  const t = a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const peak = o.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

interface NoiseOpts { gain?: number; delay?: number; filter?: BiquadFilterType; freq?: number; to?: number; q?: number }
let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, o: NoiseOpts = {}): void {
  const a = audio(); if (!a || !master) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + (o.delay ?? 0);
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = o.filter ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1200, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  f.Q.value = o.q ?? 1;
  const g = a.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);   // número MIDI → Hz

const SOUNDS: Record<Sfx, () => void> = {
  click: () => tone(1100, 0.04, { type: 'triangle', gain: 0.12 }),
  draw: () => noise(0.12, { freq: 3000, to: 1500, gain: 0.12, q: 0.7 }),
  play: () => { tone(220, 0.16, { to: 90, gain: 0.35 }); noise(0.08, { freq: 2500, gain: 0.1 }); },
  spell: () => { [72, 76, 79].forEach((n, i) => tone(NOTE(n), 0.25, { type: 'triangle', gain: 0.12, delay: i * 0.05 })); },
  fusion: () => {
    [60, 64, 67, 72, 76].forEach((n, i) => tone(NOTE(n), 0.35, { type: 'triangle', gain: 0.16, delay: i * 0.07 }));
    noise(0.6, { freq: 6000, to: 9000, gain: 0.06, delay: 0.25, filter: 'highpass' });
  },
  fusionFail: () => { tone(NOTE(64), 0.18, { type: 'square', gain: 0.07 }); tone(NOTE(58), 0.3, { type: 'square', gain: 0.07, delay: 0.12 }); },
  attack: () => noise(0.22, { freq: 800, to: 4000, gain: 0.22, q: 2 }),
  hit: () => { tone(120, 0.18, { to: 50, gain: 0.45 }); noise(0.12, { freq: 900, gain: 0.2, filter: 'lowpass' }); },
  destroy: () => { noise(0.45, { freq: 1500, to: 120, gain: 0.35, filter: 'lowpass' }); tone(90, 0.35, { type: 'square', to: 40, gain: 0.12 }); },
  damage: () => tone(160, 0.25, { type: 'sawtooth', to: 70, gain: 0.12 }),
  heal: () => { tone(NOTE(76), 0.3, { gain: 0.14 }); tone(NOTE(83), 0.4, { gain: 0.12, delay: 0.1 }); },
  trap: () => { tone(NOTE(55), 0.3, { type: 'sawtooth', gain: 0.09 }); tone(NOTE(61), 0.3, { type: 'sawtooth', gain: 0.09 }); noise(0.15, { freq: 600, gain: 0.15 }); },
  phase: () => { tone(NOTE(79), 1.0, { gain: 0.1, attack: 0.02 }); tone(NOTE(86), 1.2, { gain: 0.06, attack: 0.02, delay: 0.05 }); },
  night: () => { tone(NOTE(67), 1.3, { gain: 0.1, attack: 0.05 }); tone(NOTE(70), 1.4, { gain: 0.07, attack: 0.05, delay: 0.1 }); },
  win: () => { [60, 64, 67, 72].forEach((n, i) => tone(NOTE(n), i === 3 ? 0.7 : 0.18, { type: 'triangle', gain: 0.2, delay: i * 0.14 })); },
  lose: () => { [67, 63, 60, 55].forEach((n, i) => tone(NOTE(n), i === 3 ? 0.8 : 0.25, { type: 'triangle', gain: 0.16, delay: i * 0.2 })); },
  error: () => tone(140, 0.12, { type: 'square', gain: 0.06 }),
  coin: () => { tone(NOTE(88), 0.08, { type: 'square', gain: 0.06 }); tone(NOTE(93), 0.25, { type: 'square', gain: 0.06, delay: 0.07 }); },
  ritual: () => {
    for (let i = 0; i < 10; i++) tone(NOTE(60 + i * 2), 0.3, { type: 'triangle', gain: 0.08, delay: i * 0.11 });
    tone(NOTE(84), 1.2, { gain: 0.14, delay: 1.25, attack: 0.02 });
    noise(1.0, { freq: 5000, to: 10000, gain: 0.05, delay: 1.2, filter: 'highpass' });
  },
  level: () => { [72, 79, 84].forEach((n, i) => tone(NOTE(n), 0.2, { type: 'triangle', gain: 0.14, delay: i * 0.08 })); },
  setCard: () => noise(0.15, { freq: 1800, to: 700, gain: 0.18, q: 0.8 }),
  position: () => tone(700, 0.08, { type: 'triangle', gain: 0.12, to: 500 }),
  direct: () => { noise(0.2, { freq: 1000, to: 5000, gain: 0.22, q: 2 }); tone(110, 0.25, { to: 45, gain: 0.4, delay: 0.12 }); },
  pack: () => { noise(0.35, { freq: 2500, to: 8000, gain: 0.18, filter: 'highpass' }); [72, 76, 79].forEach((n, i) => tone(NOTE(n), 0.3, { type: 'triangle', gain: 0.1, delay: 0.2 + i * 0.06 })); },
};

/** Suena un efecto (si no está en silencio). */
export function sfx(name: Sfx): void {
  if (muted) return;
  try { if (!playFile(name)) SOUNDS[name](); } catch { /* el sonido nunca debe romper el juego */ }
}

/** Botón 🔊 / 🔇 para cualquier pantalla. */
export function muteButton(className = 'link-btn'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `${className} mute-btn`;
  const paint = () => { b.textContent = muted ? '🔇' : '🔊'; b.title = muted ? 'Activar sonido' : 'Silenciar'; b.setAttribute('aria-label', b.title); };
  b.addEventListener('click', () => { setMuted(!muted); if (!muted) sfx('click'); });
  const off = onMuteChange(paint);
  const obs = new MutationObserver(() => { if (!b.isConnected) { off(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true, subtree: true });
  paint();
  return b;
}

// ---------------------------------------------------------------- música

export type Track = 'menu' | 'duel';
const MUSIC_KEY = 'cartas.musica';
const MUSIC_VOLUME = 0.35;
let musicOn = readMusic();
let wanted: Track | null = null;
let player: HTMLAudioElement | null = null;
let playing: Track | null = null;
const musicListeners = new Set<(on: boolean) => void>();

function readMusic(): boolean {
  try { return localStorage.getItem(MUSIC_KEY) !== 'off'; } catch { return true; }
}

/** Qué música debe sonar en esta pantalla (null = ninguna). */
export function setTrack(track: Track | null): void {
  wanted = track;
  syncMusic();
}

export const isMusicOn = (): boolean => musicOn;
export function setMusicOn(on: boolean): void {
  musicOn = on;
  try { localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ }
  musicListeners.forEach(fn => fn(on));
  syncMusic();
}

function syncMusic(): void {
  if (typeof window === 'undefined') return;
  const should = musicOn && !muted && wanted && !document.hidden ? wanted : null;
  if (!should) { player?.pause(); playing = null; return; }
  if (!player) { player = new Audio(); player.loop = true; player.preload = 'auto'; }
  player.volume = MUSIC_VOLUME;
  if (playing !== should) {
    player.src = `/sounds/musica-${should === 'menu' ? 'menu' : 'duelo'}.mp3`;
    playing = should;
  }
  void player.play().catch(() => { playing = null; /* el navegador espera a que toques algo */ });
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', syncMusic);   // se pausa al salir de la app

/** Botón 🎵 para prender/apagar la música. */
export function musicButton(className = 'link-btn'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `${className} mute-btn music-btn${musicOn ? '' : ' music-btn--off'}`;
  const paint = () => {
    b.textContent = '🎵';
    b.classList.toggle('music-btn--off', !musicOn);
    b.title = musicOn ? 'Apagar música' : 'Prender música';
    b.setAttribute('aria-label', b.title);
  };
  b.addEventListener('click', () => setMusicOn(!musicOn));
  const fn = () => paint();
  musicListeners.add(fn);
  const obs = new MutationObserver(() => { if (!b.isConnected) { musicListeners.delete(fn); obs.disconnect(); } });
  obs.observe(document.body, { childList: true, subtree: true });
  paint();
  return b;
}
