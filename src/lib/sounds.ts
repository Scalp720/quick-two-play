// Simple sound effects using Web Audio API
const ctx = () => {
  if (!(window as any).__audioCtx) {
    (window as any).__audioCtx = new AudioContext();
  }
  return (window as any).__audioCtx as AudioContext;
};

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playCardDraw() {
  playTone(800, 0.08, 'triangle', 0.12);
  setTimeout(() => playTone(1000, 0.06, 'triangle', 0.1), 40);
}

export function playCardDiscard() {
  playTone(500, 0.1, 'triangle', 0.12);
}

export function playMeld() {
  playTone(600, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(800, 0.1, 'sine', 0.12), 80);
  setTimeout(() => playTone(1000, 0.15, 'sine', 0.12), 160);
}

export function playWin() {
  [0, 100, 200, 300, 400].forEach((d, i) => {
    setTimeout(() => playTone(500 + i * 100, 0.2, 'sine', 0.15), d);
  });
}

export function playLose() {
  playTone(400, 0.3, 'sawtooth', 0.08);
  setTimeout(() => playTone(300, 0.4, 'sawtooth', 0.08), 200);
}

export function playClick() {
  playTone(1200, 0.04, 'square', 0.06);
}

export function playFight() {
  playTone(300, 0.15, 'sawtooth', 0.1);
  setTimeout(() => playTone(500, 0.15, 'sawtooth', 0.12), 100);
  setTimeout(() => playTone(700, 0.2, 'triangle', 0.14), 200);
}
