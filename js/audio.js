/* OPERATE! — tasteful Web Audio beeps (optional) */
(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function tone(freq, dur, type, gain, when) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t0 = (when || 0) + c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const AudioFX = {
    setEnabled(v) {
      enabled = !!v;
      if (enabled) getCtx();
    },
    isEnabled() { return enabled; },
    unlock() {
      const c = getCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    },
    select() { tone(520, 0.06, 'triangle', 0.05); },
    armOp() { tone(380, 0.07, 'sine', 0.045); },
    merge() {
      tone(440, 0.08, 'triangle', 0.06);
      tone(660, 0.1, 'sine', 0.04, 0.05);
    },
    error() { tone(180, 0.12, 'square', 0.035); },
    win() {
      tone(523.25, 0.1, 'sine', 0.07);
      tone(659.25, 0.1, 'sine', 0.06, 0.09);
      tone(783.99, 0.18, 'triangle', 0.07, 0.18);
    },
    deal() {
      tone(300, 0.05, 'triangle', 0.035);
      tone(360, 0.05, 'triangle', 0.03, 0.04);
    },
  };

  global.OperateAudio = AudioFX;
})(window);
