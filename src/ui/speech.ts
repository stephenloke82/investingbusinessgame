// Text-to-speech for the guide using the browser's Web Speech API.
// Never speaks before the player has interacted with the page (browsers block
// autoplay, and it would be rude). On-screen text is always shown as well.

let userGestured = false;
let enabled = false;
let voiceName = '';
let rate = 1;

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function markGesture() {
  userGestured = true;
}

export function configureVoice(opts: { on: boolean; name: string; rate: number }) {
  enabled = opts.on;
  voiceName = opts.name;
  rate = opts.rate;
  if (!enabled) stop();
}

export function voices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
}

/** Speak text if voice is on (or if forced by a "listen" button press). */
export function speak(text: string, force = false) {
  if (!speechSupported() || !userGestured) return;
  if (!enabled && !force) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const units: Record<string, string> = { K: ' thousand', M: ' million', B: ' billion', T: ' trillion' };
  const clean = text
    .replace(/\s+/g, ' ')
    .replace(/\$([\d,.]*\d)([KMBT]?)/g, (_m, n: string, u: string) => `${n}${units[u] ?? ''} dollars`)
    .replace(/(\d)%/g, '$1 percent');
  const u = new SpeechSynthesisUtterance(clean);
  const v = voices().find((x) => x.name === voiceName) ?? voices()[0];
  if (v) u.voice = v;
  u.rate = rate;
  synth.speak(u);
}

export function stop() {
  if (speechSupported()) window.speechSynthesis.cancel();
}
