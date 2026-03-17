/**
 * ═══════════════════════════════════════════════════════════════
 *  🔊 Void Abyss — AudioManager
 *  音色方向: lava/void — 厚重、紧张, sawtooth + 低频 50-400Hz
 *  技术: 纯 Web Audio API 程序化生成, 无外部音频文件
 *  约束: AudioNode 用完即断开, 120ms 节流防轰炸
 * ═══════════════════════════════════════════════════════════════
 */
const AudioManager = (() => {
  'use strict';

  // ─── 内部状态 ───
  let ctx = null;
  let muted = false;
  let currentState = 'explore'; // explore | combat | boss
  let bgmNodes = null; // 当前 BGM 的节点组
  let heartbeatInterval = null;

  // 音量层级
  const volumes = {
    master: 0.7,
    sfx: 0.8,
    bgm: 0.5,
  };

  // 节流记录 —— { sfxName: lastPlayTimestamp }
  const throttleMap = {};
  let THROTTLE_MS = 120;

  // 活跃节点计数（限制最大并发 20）
  let activeNodes = 0;
  const MAX_ACTIVE_NODES = 20;

  // ─── 初始化与工具 ───

  /** 懒初始化 AudioContext + resume */
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  /** 从 localStorage 恢复设置 */
  function loadSettings() {
    try {
      const m = localStorage.getItem('void_abyss_muted');
      if (m !== null) muted = m === 'true';
      const vm = localStorage.getItem('void_abyss_volume_master');
      if (vm !== null) volumes.master = parseFloat(vm);
      const vs = localStorage.getItem('void_abyss_volume_sfx');
      if (vs !== null) volumes.sfx = parseFloat(vs);
      const vb = localStorage.getItem('void_abyss_volume_bgm');
      if (vb !== null) volumes.bgm = parseFloat(vb);
    } catch (_) { /* 无痕模式 */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem('void_abyss_muted', String(muted));
      localStorage.setItem('void_abyss_volume_master', String(volumes.master));
      localStorage.setItem('void_abyss_volume_sfx', String(volumes.sfx));
      localStorage.setItem('void_abyss_volume_bgm', String(volumes.bgm));
    } catch (_) { /* 无痕模式 */ }
  }

  /** 获取实际 SFX 增益值 */
  function sfxGain() {
    return volumes.master * volumes.sfx;
  }

  /** 获取实际 BGM 增益值 */
  function bgmGain() {
    return volumes.master * volumes.bgm;
  }

  /** 节流检查 —— 同一音效 120ms 内不重复播放 */
  function throttled(name) {
    const now = performance.now();
    if (throttleMap[name] && now - throttleMap[name] < THROTTLE_MS) {
      return true;
    }
    throttleMap[name] = now;
    return false;
  }

  /** 跟踪活跃节点，超限时静默跳过 */
  function trackNode() {
    if (activeNodes >= MAX_ACTIVE_NODES) return false;
    activeNodes++;
    return true;
  }
  function releaseNode() {
    activeNodes = Math.max(0, activeNodes - 1);
  }

  /** 创建增益节点 */
  function makeGain(c, vol) {
    const g = c.createGain();
    g.gain.value = vol;
    return g;
  }

  /** 创建振荡器 + 增益 → 目标节点，返回 {osc, gain} */
  function makeOsc(c, type, freq, vol, dest) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = makeGain(c, vol);
    osc.connect(g);
    g.connect(dest || c.destination);
    return { osc, gain: g };
  }

  /** 安全停止振荡器并释放节点 */
  function stopOsc(osc, gain, time) {
    try {
      osc.stop(time);
      osc.onended = () => {
        try { osc.disconnect(); } catch (_) {}
        try { gain.disconnect(); } catch (_) {}
        releaseNode();
      };
    } catch (_) { releaseNode(); }
  }

  /** 创建白噪声 buffer（缓存复用） */
  let noiseBuffer = null;
  function getNoiseBuffer(c) {
    if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
    const size = c.sampleRate * 2;
    noiseBuffer = c.createBuffer(1, size, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  /** 创建噪声源 */
  function makeNoise(c, dest) {
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer(c);
    src.loop = true;
    const g = makeGain(c, 0.1);
    src.connect(g);
    g.connect(dest || c.destination);
    return { src, gain: g };
  }

  /** 创建滤波器 */
  function makeFilter(c, type, freq, Q) {
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (Q !== undefined) f.Q.value = Q;
    return f;
  }

  // ═══════════════════════════════════════════════════
  //  音效实现 —— UI
  // ═══════════════════════════════════════════════════

  function sfx_click(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sine', 800, sfxGain() * 0.3);
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
    gain.gain.setValueAtTime(sfxGain() * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    stopOsc(osc, gain, t + 0.08);
  }

  function sfx_hover(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'triangle', 1000, sfxGain() * 0.08);
    gain.gain.setValueAtTime(sfxGain() * 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.start(t);
    stopOsc(osc, gain, t + 0.05);
  }

  function sfx_confirm(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sine', 600, sfxGain() * 0.25);
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
    gain.gain.setValueAtTime(sfxGain() * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(t);
    stopOsc(osc, gain, t + 0.1);
  }

  function sfx_cancel(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'triangle', 600, sfxGain() * 0.2);
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.07);
    gain.gain.setValueAtTime(sfxGain() * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    stopOsc(osc, gain, t + 0.08);
  }

  // ═══════════════════════════════════════════════════
  //  音效实现 —— 战斗
  // ═══════════════════════════════════════════════════

  function sfx_attack_light(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 锯齿波快速衰减
    const { osc, gain } = makeOsc(c, 'sawtooth', 300, sfxGain() * 0.25);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    gain.gain.setValueAtTime(sfxGain() * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t);
    stopOsc(osc, gain, t + 0.15);

    // 高频噪声脉冲
    if (trackNode()) {
      const filter = makeFilter(c, 'highpass', 2000, 1);
      const { src, gain: ng } = makeNoise(c, filter);
      filter.connect(c.destination);
      ng.gain.setValueAtTime(sfxGain() * 0.12, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.start(t);
      src.stop(t + 0.08);
      src.onended = () => {
        try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  function sfx_attack_heavy(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sawtooth', 120, sfxGain() * 0.35);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    gain.gain.setValueAtTime(sfxGain() * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    stopOsc(osc, gain, t + 0.3);

    // 延迟反馈层
    if (trackNode()) {
      const delay = c.createDelay(0.5);
      delay.delayTime.value = 0.08;
      const { osc: o2, gain: g2 } = makeOsc(c, 'sawtooth', 90, sfxGain() * 0.15);
      o2.connect(delay);
      delay.connect(g2);
      g2.connect(c.destination);
      g2.gain.setValueAtTime(sfxGain() * 0.15, t + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o2.start(t + 0.05);
      o2.stop(t + 0.3);
      o2.onended = () => {
        try { o2.disconnect(); g2.disconnect(); delay.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  function sfx_crit(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 金属共鸣
    const { osc, gain } = makeOsc(c, 'square', 500, sfxGain() * 0.2);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    gain.gain.setValueAtTime(sfxGain() * 0.2, t);
    gain.gain.linearRampToValueAtTime(sfxGain() * 0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t);
    stopOsc(osc, gain, t + 0.4);

    // 高频泛音
    if (trackNode()) {
      const { osc: o2, gain: g2 } = makeOsc(c, 'sine', 1200, sfxGain() * 0.1);
      o2.frequency.exponentialRampToValueAtTime(600, t + 0.2);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o2.start(t);
      stopOsc(o2, g2, t + 0.4);
    }
  }

  function sfx_hit_flesh(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sawtooth', 80, sfxGain() * 0.3);
    gain.gain.setValueAtTime(sfxGain() * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    stopOsc(osc, gain, t + 0.1);

    // 噪声层
    if (trackNode()) {
      const filter = makeFilter(c, 'lowpass', 400, 1);
      const { src, gain: ng } = makeNoise(c, filter);
      filter.connect(c.destination);
      ng.gain.setValueAtTime(sfxGain() * 0.15, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.start(t);
      src.stop(t + 0.08);
      src.onended = () => {
        try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  function sfx_hit_metal(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'square', 1200, sfxGain() * 0.15);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);
    gain.gain.setValueAtTime(sfxGain() * 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t);
    stopOsc(osc, gain, t + 0.12);

    // 滤波共振尾音
    if (trackNode()) {
      const filter = makeFilter(c, 'bandpass', 900, 8);
      const { osc: o2, gain: g2 } = makeOsc(c, 'sawtooth', 600, sfxGain() * 0.08);
      o2.connect(filter);
      filter.connect(g2);
      g2.connect(c.destination);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o2.start(t);
      o2.stop(t + 0.12);
      o2.onended = () => {
        try { o2.disconnect(); g2.disconnect(); filter.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  function sfx_dodge(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 滤波噪声 —— 风声呼啸
    const filter = makeFilter(c, 'bandpass', 400, 2);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);
    const { src, gain: ng } = makeNoise(c, filter);
    filter.connect(c.destination);
    ng.gain.setValueAtTime(sfxGain() * 0.2, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.start(t);
    src.stop(t + 0.25);
    src.onended = () => {
      try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
      releaseNode();
    };
  }

  function sfx_parry(c) {
    // 多层叠加：金属鸣响 + 冲击波低频 + 能量爆发
    if (!trackNode()) return;
    const t = c.currentTime;

    // 层1：金属鸣响
    const { osc: o1, gain: g1 } = makeOsc(c, 'square', 800, sfxGain() * 0.2);
    o1.frequency.exponentialRampToValueAtTime(400, t + 0.3);
    g1.gain.setValueAtTime(sfxGain() * 0.2, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o1.start(t);
    stopOsc(o1, g1, t + 0.45);

    // 层2：冲击波低频
    if (trackNode()) {
      const { osc: o2, gain: g2 } = makeOsc(c, 'sawtooth', 60, sfxGain() * 0.3);
      g2.gain.setValueAtTime(sfxGain() * 0.3, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o2.start(t);
      stopOsc(o2, g2, t + 0.35);
    }

    // 层3：能量扫频
    if (trackNode()) {
      const { osc: o3, gain: g3 } = makeOsc(c, 'sine', 200, sfxGain() * 0.15);
      o3.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      o3.frequency.exponentialRampToValueAtTime(400, t + 0.4);
      g3.gain.setValueAtTime(sfxGain() * 0.15, t);
      g3.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o3.start(t);
      stopOsc(o3, g3, t + 0.5);
    }
  }

  function sfx_block(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sawtooth', 200, sfxGain() * 0.25);
    gain.gain.setValueAtTime(sfxGain() * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t);
    stopOsc(osc, gain, t + 0.15);
  }

  function sfx_skill_cast(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 虚空能量上行
    const { osc, gain } = makeOsc(c, 'sawtooth', 100, sfxGain() * 0.25);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);
    gain.gain.setValueAtTime(sfxGain() * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t);
    stopOsc(osc, gain, t + 0.4);

    // 混响尾音（模拟）
    if (trackNode()) {
      const delay = c.createDelay(1.0);
      delay.delayTime.value = 0.12;
      const fb = makeGain(c, 0.3);
      const { osc: o2, gain: g2 } = makeOsc(c, 'sine', 300, sfxGain() * 0.08);
      o2.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(g2);
      g2.connect(c.destination);
      o2.frequency.exponentialRampToValueAtTime(600, t + 0.25);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o2.start(t);
      o2.stop(t + 0.4);
      o2.onended = () => {
        try { o2.disconnect(); g2.disconnect(); delay.disconnect(); fb.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  // ═══════════════════════════════════════════════════
  //  音效实现 —— 元素
  // ═══════════════════════════════════════════════════

  function sfx_elem_fire(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 高频 crackling
    const filter = makeFilter(c, 'highpass', 1500, 0.5);
    const { src, gain: ng } = makeNoise(c, filter);
    filter.connect(c.destination);
    ng.gain.setValueAtTime(sfxGain() * 0.2, t);
    ng.gain.linearRampToValueAtTime(sfxGain() * 0.3, t + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.start(t);
    src.stop(t + 0.3);
    src.onended = () => {
      try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
      releaseNode();
    };

    // 低频 rumble
    if (trackNode()) {
      const { osc, gain } = makeOsc(c, 'sawtooth', 80, sfxGain() * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      stopOsc(osc, gain, t + 0.3);
    }
  }

  function sfx_elem_ice(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 清脆下行
    const { osc, gain } = makeOsc(c, 'sine', 1200, sfxGain() * 0.2);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.2);
    gain.gain.setValueAtTime(sfxGain() * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    stopOsc(osc, gain, t + 0.3);

    // 结晶感泛音
    if (trackNode()) {
      const { osc: o2, gain: g2 } = makeOsc(c, 'triangle', 2400, sfxGain() * 0.06);
      o2.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o2.start(t);
      stopOsc(o2, g2, t + 0.25);
    }
  }

  function sfx_elem_lightning(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 白噪声尖锐爆发
    const filter = makeFilter(c, 'highpass', 3000, 0.5);
    const { src, gain: ng } = makeNoise(c, filter);
    filter.connect(c.destination);
    ng.gain.setValueAtTime(sfxGain() * 0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.start(t);
    src.stop(t + 0.15);
    src.onended = () => {
      try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
      releaseNode();
    };

    // 低频余震
    if (trackNode()) {
      const { osc, gain } = makeOsc(c, 'sawtooth', 100, sfxGain() * 0.15);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(sfxGain() * 0.15, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      stopOsc(osc, gain, t + 0.25);
    }
  }

  function sfx_elem_void(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 深沉频率调制震荡
    const { osc, gain } = makeOsc(c, 'sawtooth', 50, sfxGain() * 0.3);
    // LFO 调制
    if (trackNode()) {
      const lfo = c.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5;
      const lfoGain = makeGain(c, 15);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + 0.5);
      lfo.onended = () => {
        try { lfo.disconnect(); lfoGain.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
    gain.gain.setValueAtTime(sfxGain() * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t);
    stopOsc(osc, gain, t + 0.5);
  }

  function sfx_elem_reaction(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 双频叠加爆发
    const { osc: o1, gain: g1 } = makeOsc(c, 'sawtooth', 150, sfxGain() * 0.25);
    o1.frequency.exponentialRampToValueAtTime(400, t + 0.15);
    o1.frequency.exponentialRampToValueAtTime(100, t + 0.5);
    g1.gain.setValueAtTime(sfxGain() * 0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o1.start(t);
    stopOsc(o1, g1, t + 0.6);

    if (trackNode()) {
      const { osc: o2, gain: g2 } = makeOsc(c, 'square', 600, sfxGain() * 0.12);
      o2.frequency.exponentialRampToValueAtTime(200, t + 0.4);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o2.start(t);
      stopOsc(o2, g2, t + 0.6);
    }

    // 噪声爆发
    if (trackNode()) {
      const filter = makeFilter(c, 'bandpass', 800, 1);
      const { src, gain: ng } = makeNoise(c, filter);
      filter.connect(c.destination);
      ng.gain.setValueAtTime(sfxGain() * 0.15, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      src.start(t);
      src.stop(t + 0.35);
      src.onended = () => {
        try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  // ═══════════════════════════════════════════════════
  //  音效实现 —— 游戏事件
  // ═══════════════════════════════════════════════════

  function sfx_levelup(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 上行琶音 C→E→G (261→329→392)
    const notes = [261.6, 329.6, 392.0];
    notes.forEach((freq, i) => {
      if (i > 0 && !trackNode()) return;
      const offset = i * 0.12;
      const { osc, gain } = makeOsc(c, 'sine', freq, sfxGain() * 0.2);
      gain.gain.setValueAtTime(sfxGain() * 0.2, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.5);
      osc.start(t + offset);
      stopOsc(osc, gain, t + offset + 0.55);
    });

    // 混响尾音
    if (trackNode()) {
      const { osc, gain } = makeOsc(c, 'sine', 523, sfxGain() * 0.08);
      gain.gain.setValueAtTime(0.001, t + 0.36);
      gain.gain.linearRampToValueAtTime(sfxGain() * 0.08, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(t + 0.36);
      stopOsc(osc, gain, t + 0.8);
    }
  }

  function sfx_item_pickup(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sine', 800, sfxGain() * 0.2);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    gain.gain.setValueAtTime(sfxGain() * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    stopOsc(osc, gain, t + 0.15);
  }

  function sfx_item_equip(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 金属嵌合
    const { osc, gain } = makeOsc(c, 'square', 300, sfxGain() * 0.2);
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.setValueAtTime(450, t + 0.06);
    gain.gain.setValueAtTime(sfxGain() * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    stopOsc(osc, gain, t + 0.2);
  }

  function sfx_coin_drop(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'triangle', 1000, sfxGain() * 0.12);
    gain.gain.setValueAtTime(sfxGain() * 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    stopOsc(osc, gain, t + 0.1);
  }

  function sfx_coin_pickup(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sine', 1200, sfxGain() * 0.15);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.05);
    gain.gain.setValueAtTime(sfxGain() * 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    stopOsc(osc, gain, t + 0.08);
  }

  function sfx_chest_open(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 神秘上行旋律
    const notes = [200, 300, 400, 600];
    notes.forEach((freq, i) => {
      if (i > 0 && !trackNode()) return;
      const offset = i * 0.15;
      const { osc, gain } = makeOsc(c, 'sine', freq, sfxGain() * 0.15);
      gain.gain.setValueAtTime(sfxGain() * 0.15, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.4);
      osc.start(t + offset);
      stopOsc(osc, gain, t + offset + 0.45);
    });

    // 能量释放
    if (trackNode()) {
      const filter = makeFilter(c, 'bandpass', 600, 2);
      const { src, gain: ng } = makeNoise(c, filter);
      filter.connect(c.destination);
      ng.gain.setValueAtTime(0.001, t + 0.45);
      ng.gain.linearRampToValueAtTime(sfxGain() * 0.12, t + 0.55);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      src.start(t + 0.45);
      src.stop(t + 1.0);
      src.onended = () => {
        try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  function sfx_door_open(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 低沉推动
    const { osc, gain } = makeOsc(c, 'sawtooth', 80, sfxGain() * 0.25);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    gain.gain.setValueAtTime(sfxGain() * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t);
    stopOsc(osc, gain, t + 0.4);

    // 噪声摩擦
    if (trackNode()) {
      const filter = makeFilter(c, 'lowpass', 300, 1);
      const { src, gain: ng } = makeNoise(c, filter);
      filter.connect(c.destination);
      ng.gain.setValueAtTime(sfxGain() * 0.1, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      src.start(t);
      src.stop(t + 0.4);
      src.onended = () => {
        try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  // ═══════════════════════════════════════════════════
  //  音效实现 —— Boss/危险
  // ═══════════════════════════════════════════════════

  function sfx_boss_intro(c) {
    if (!trackNode()) return;
    const t = c.currentTime;

    // 层1：低频 rumble
    const { osc: o1, gain: g1 } = makeOsc(c, 'sawtooth', 40, sfxGain() * 0.3);
    g1.gain.setValueAtTime(0.001, t);
    g1.gain.linearRampToValueAtTime(sfxGain() * 0.3, t + 0.8);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    o1.start(t);
    stopOsc(o1, g1, t + 2.0);

    // 层2：号角上行
    if (trackNode()) {
      const { osc: o2, gain: g2 } = makeOsc(c, 'sawtooth', 100, sfxGain() * 0.15);
      o2.frequency.setValueAtTime(100, t + 0.3);
      o2.frequency.exponentialRampToValueAtTime(300, t + 1.2);
      o2.frequency.exponentialRampToValueAtTime(200, t + 1.8);
      g2.gain.setValueAtTime(0.001, t);
      g2.gain.linearRampToValueAtTime(sfxGain() * 0.15, t + 0.5);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
      o2.start(t + 0.3);
      stopOsc(o2, g2, t + 2.0);
    }

    // 层3：虚空共鸣（频率调制）
    if (trackNode()) {
      const { osc: o3, gain: g3 } = makeOsc(c, 'sine', 60, sfxGain() * 0.12);
      if (trackNode()) {
        const lfo = c.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 3;
        const lg = makeGain(c, 10);
        lfo.connect(lg);
        lg.connect(o3.frequency);
        lfo.start(t);
        lfo.stop(t + 2.0);
        lfo.onended = () => {
          try { lfo.disconnect(); lg.disconnect(); } catch (_) {}
          releaseNode();
        };
      }
      g3.gain.setValueAtTime(0.001, t);
      g3.gain.linearRampToValueAtTime(sfxGain() * 0.12, t + 0.6);
      g3.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      o3.start(t);
      stopOsc(o3, g3, t + 2.0);
    }
  }

  function sfx_boss_phase(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 能量积聚 → 爆发
    const { osc, gain } = makeOsc(c, 'sawtooth', 60, sfxGain() * 0.25);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.5);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.8);
    gain.gain.setValueAtTime(sfxGain() * 0.1, t);
    gain.gain.linearRampToValueAtTime(sfxGain() * 0.35, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    osc.start(t);
    stopOsc(osc, gain, t + 1.0);

    // 冲击波噪声
    if (trackNode()) {
      const filter = makeFilter(c, 'lowpass', 500, 1);
      filter.frequency.setValueAtTime(500, t + 0.45);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.9);
      const { src, gain: ng } = makeNoise(c, filter);
      filter.connect(c.destination);
      ng.gain.setValueAtTime(0.001, t + 0.45);
      ng.gain.linearRampToValueAtTime(sfxGain() * 0.25, t + 0.5);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      src.start(t + 0.45);
      src.stop(t + 1.0);
      src.onended = () => {
        try { src.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  function sfx_danger_warning(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 警报双频交替
    const { osc, gain } = makeOsc(c, 'square', 200, sfxGain() * 0.2);
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.2;
      osc.frequency.setValueAtTime(200, t + offset);
      osc.frequency.setValueAtTime(300, t + offset + 0.1);
    }
    gain.gain.setValueAtTime(sfxGain() * 0.2, t);
    gain.gain.setValueAtTime(sfxGain() * 0.2, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.start(t);
    stopOsc(osc, gain, t + 0.6);
  }

  function sfx_death(c) {
    if (!trackNode()) return;
    const t = c.currentTime;
    // 低频坍缩
    const { osc, gain } = makeOsc(c, 'sawtooth', 200, sfxGain() * 0.3);
    osc.frequency.exponentialRampToValueAtTime(20, t + 1.8);
    gain.gain.setValueAtTime(sfxGain() * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    osc.start(t);
    stopOsc(osc, gain, t + 2.0);

    // 虚空回响
    if (trackNode()) {
      const delay = c.createDelay(1.0);
      delay.delayTime.value = 0.3;
      const fb = makeGain(c, 0.4);
      const { osc: o2, gain: g2 } = makeOsc(c, 'sine', 100, sfxGain() * 0.1);
      o2.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(g2);
      g2.connect(c.destination);
      o2.frequency.exponentialRampToValueAtTime(30, t + 1.5);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      o2.start(t);
      o2.stop(t + 2.0);
      o2.onended = () => {
        try { o2.disconnect(); g2.disconnect(); delay.disconnect(); fb.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
  }

  // ═══════════════════════════════════════════════════
  //  音效实现 —— 环境氛围
  // ═══════════════════════════════════════════════════

  function sfx_ambient_void(c) {
    // 持续的极低频虚空嗡鸣（作为环境层，不计入节流）
    if (!trackNode()) return;
    const t = c.currentTime;
    const { osc, gain } = makeOsc(c, 'sawtooth', 40, sfxGain() * 0.08);
    // LFO 缓慢频率震荡
    if (trackNode()) {
      const lfo = c.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.2;
      const lg = makeGain(c, 10);
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + 8.0);
      lfo.onended = () => {
        try { lfo.disconnect(); lg.disconnect(); } catch (_) {}
        releaseNode();
      };
    }
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(sfxGain() * 0.08, t + 1.0);
    gain.gain.setValueAtTime(sfxGain() * 0.08, t + 6.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 8.0);
    osc.start(t);
    stopOsc(osc, gain, t + 8.0);
  }

  // ═══════════════════════════════════════════════════
  //  动态参数化音效
  // ═══════════════════════════════════════════════════

  function sfx_combo_hit(c, params) {
    const combo = (params && params.comboCount) || 1;
    if (!trackNode()) return;
    const t = c.currentTime;

    if (combo < 5) {
      // 1-4: 单音
      const freq = 300 + combo * 30;
      const { osc, gain } = makeOsc(c, 'sawtooth', freq, sfxGain() * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      stopOsc(osc, gain, t + 0.12);
    } else if (combo < 10) {
      // 5-9: 双音叠加
      const base = 300 + combo * 20;
      const { osc, gain } = makeOsc(c, 'sawtooth', base, sfxGain() * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      stopOsc(osc, gain, t + 0.18);
      if (trackNode()) {
        const { osc: o2, gain: g2 } = makeOsc(c, 'sine', base * 1.5, sfxGain() * 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o2.start(t);
        stopOsc(o2, g2, t + 0.15);
      }
    } else if (combo < 20) {
      // 10-19: 三音和弦
      const base = 350 + combo * 10;
      [1, 1.25, 1.5].forEach((mult, i) => {
        if (i > 0 && !trackNode()) return;
        const { osc, gain } = makeOsc(c, 'sine', base * mult, sfxGain() * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        stopOsc(osc, gain, t + 0.25);
      });
    } else if (combo < 50) {
      // 20-49: 华丽琶音+混响
      const base = 400;
      const multiples = [1, 1.25, 1.5, 2.0];
      multiples.forEach((mult, i) => {
        if (i > 0 && !trackNode()) return;
        const offset = i * 0.04;
        const { osc, gain } = makeOsc(c, 'sine', base * mult, sfxGain() * 0.1);
        gain.gain.setValueAtTime(sfxGain() * 0.1, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.3);
        osc.start(t + offset);
        stopOsc(osc, gain, t + offset + 0.35);
      });
    } else {
      // 50+: 全频爆发
      [200, 400, 600, 800, 1200].forEach((freq, i) => {
        if (i > 0 && !trackNode()) return;
        const { osc, gain } = makeOsc(c, 'sine', freq, sfxGain() * 0.08);
        gain.gain.setValueAtTime(sfxGain() * 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        stopOsc(osc, gain, t + 0.5);
      });
    }
  }

  function sfx_heartbeat(c, params) {
    const hp = (params && params.hpPercent !== undefined) ? params.hpPercent : 1.0;
    if (hp > 0.3) return; // 仅在30%以下触发
    if (!trackNode()) return;
    const t = c.currentTime;

    // 心跳频率随血量加速
    const beatRate = hp <= 0.1 ? 0.16 : hp <= 0.2 ? 0.28 : 0.4;

    // 双脉冲心跳 lub-dub
    const { osc: o1, gain: g1 } = makeOsc(c, 'sine', 60, sfxGain() * 0.25);
    g1.gain.setValueAtTime(sfxGain() * 0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o1.start(t);
    stopOsc(o1, g1, t + 0.1);

    if (trackNode()) {
      const { osc: o2, gain: g2 } = makeOsc(c, 'sine', 50, sfxGain() * 0.2);
      g2.gain.setValueAtTime(sfxGain() * 0.2, t + beatRate * 0.4);
      g2.gain.exponentialRampToValueAtTime(0.001, t + beatRate * 0.4 + 0.06);
      o2.start(t + beatRate * 0.4);
      stopOsc(o2, g2, t + beatRate * 0.4 + 0.08);
    }
  }

  function sfx_footstep(c, params) {
    const surface = (params && params.surface) || 'stone';
    if (!trackNode()) return;
    const t = c.currentTime;

    if (surface === 'stone') {
      const { osc, gain } = makeOsc(c, 'triangle', 120, sfxGain() * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.start(t);
      stopOsc(osc, gain, t + 0.08);
    } else if (surface === 'metal') {
      const { osc, gain } = makeOsc(c, 'square', 400, sfxGain() * 0.08);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      stopOsc(osc, gain, t + 0.1);
    } else {
      // void surface
      const { osc, gain } = makeOsc(c, 'sine', 80, sfxGain() * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      stopOsc(osc, gain, t + 0.12);
    }
  }

  // ═══════════════════════════════════════════════════
  //  BGM 系统 —— 程序化循环音乐
  // ═══════════════════════════════════════════════════

  let bgmLoop = null; // setInterval ID
  let bgmType = null; // 当前 BGM 类型

  function stopAllBgmNodes() {
    if (bgmNodes) {
      bgmNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (_) {}
      });
      bgmNodes = null;
    }
    if (bgmLoop) {
      clearInterval(bgmLoop);
      bgmLoop = null;
    }
    bgmType = null;
  }

  /** 探索 BGM —— 缓慢脉动 + 虚空氛围 */
  function startBgmExplore() {
    const c = getCtx();
    const masterGain = makeGain(c, bgmGain());
    masterGain.connect(c.destination);
    const nodes = [masterGain];

    // 低频脉动基底
    const bass = c.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = 55;
    const bassGain = makeGain(c, 0.15);
    bass.connect(bassGain);
    bassGain.connect(masterGain);
    bass.start();
    nodes.push(bass, bassGain);

    // LFO 调制低频
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = makeGain(c, 8);
    lfo.connect(lfoGain);
    lfoGain.connect(bass.frequency);
    lfo.start();
    nodes.push(lfo, lfoGain);

    // 氛围 pad
    const pad = c.createOscillator();
    pad.type = 'sine';
    pad.frequency.value = 110;
    const padGain = makeGain(c, 0.06);
    const padFilter = makeFilter(c, 'lowpass', 200, 1);
    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(masterGain);
    pad.start();
    nodes.push(pad, padGain, padFilter);

    // 随机星空叮咚（每 3-6 秒一个音符）
    const starInterval = setInterval(() => {
      if (muted || bgmType !== 'explore') return;
      const freq = 400 + Math.random() * 800;
      const t = c.currentTime;
      const { osc, gain } = makeOsc(c, 'sine', freq, bgmGain() * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      osc.start(t);
      try { osc.stop(t + 1.6); } catch (_) {}
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
    }, 3000 + Math.random() * 3000);

    bgmNodes = nodes;
    bgmLoop = starInterval;
    bgmType = 'explore';
  }

  /** 战斗 BGM —— 紧张节奏 + 低频鼓点 */
  function startBgmCombat() {
    const c = getCtx();
    const masterGain = makeGain(c, bgmGain());
    masterGain.connect(c.destination);
    const nodes = [masterGain];

    // 低频脉冲节奏（模拟鼓点）
    const bpm = 140;
    const beatInterval = 60000 / bpm;

    let beatCount = 0;
    const drumLoop = setInterval(() => {
      if (muted || bgmType !== 'combat') return;
      const t = c.currentTime;
      beatCount++;

      // Kick —— 每拍
      const kick = c.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(150, t);
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      const kickG = makeGain(c, bgmGain() * 0.25);
      kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      kick.connect(kickG);
      kickG.connect(masterGain);
      kick.start(t);
      try { kick.stop(t + 0.2); } catch (_) {}
      kick.onended = () => { try { kick.disconnect(); kickG.disconnect(); } catch (_) {} };

      // Snare/hi-hat —— 反拍（偶数拍）
      if (beatCount % 2 === 0) {
        const filter = makeFilter(c, 'highpass', 2000, 0.5);
        const noise = c.createBufferSource();
        noise.buffer = getNoiseBuffer(c);
        const ng = makeGain(c, bgmGain() * 0.08);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        noise.connect(filter);
        filter.connect(ng);
        ng.connect(masterGain);
        noise.start(t);
        try { noise.stop(t + 0.08); } catch (_) {}
        noise.onended = () => { try { noise.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {} };
      }
    }, beatInterval);

    // 紧张的持续低频嗡鸣
    const drone = c.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.value = 73.4; // D2
    const droneG = makeGain(c, 0.08);
    const droneFilter = makeFilter(c, 'lowpass', 150, 2);
    drone.connect(droneFilter);
    droneFilter.connect(droneG);
    droneG.connect(masterGain);
    drone.start();
    nodes.push(drone, droneG, droneFilter);

    bgmNodes = nodes;
    bgmLoop = drumLoop;
    bgmType = 'combat';
  }

  /** Boss 战 BGM —— 史诗压迫 + 多层叠加 */
  function startBgmBoss() {
    const c = getCtx();
    const masterGain = makeGain(c, bgmGain());
    masterGain.connect(c.destination);
    const nodes = [masterGain];

    // 超低频 rumble
    const rumble = c.createOscillator();
    rumble.type = 'sawtooth';
    rumble.frequency.value = 35;
    const rumbleG = makeGain(c, 0.12);
    rumble.connect(rumbleG);
    rumbleG.connect(masterGain);
    rumble.start();
    nodes.push(rumble, rumbleG);

    // LFO 压迫感
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5;
    const lfoG = makeGain(c, 5);
    lfo.connect(lfoG);
    lfoG.connect(rumble.frequency);
    lfo.start();
    nodes.push(lfo, lfoG);

    // 中频紧张 pad
    const pad = c.createOscillator();
    pad.type = 'sawtooth';
    pad.frequency.value = 110;
    const padG = makeGain(c, 0.06);
    const padFilter = makeFilter(c, 'bandpass', 200, 3);
    pad.connect(padFilter);
    padFilter.connect(padG);
    padG.connect(masterGain);
    pad.start();
    nodes.push(pad, padG, padFilter);

    // 鼓点节奏 —— 更快更重
    const bpm = 160;
    const beatInterval = 60000 / bpm;
    let beatCount = 0;
    const drumLoop = setInterval(() => {
      if (muted || bgmType !== 'boss') return;
      const t = c.currentTime;
      beatCount++;

      // 重 Kick
      const kick = c.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(180, t);
      kick.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      const kickG = makeGain(c, bgmGain() * 0.35);
      kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      kick.connect(kickG);
      kickG.connect(masterGain);
      kick.start(t);
      try { kick.stop(t + 0.2); } catch (_) {}
      kick.onended = () => { try { kick.disconnect(); kickG.disconnect(); } catch (_) {} };

      // 每4拍一个重低频冲击
      if (beatCount % 4 === 0) {
        const impact = c.createOscillator();
        impact.type = 'sawtooth';
        impact.frequency.setValueAtTime(60, t);
        impact.frequency.exponentialRampToValueAtTime(25, t + 0.4);
        const impG = makeGain(c, bgmGain() * 0.2);
        impG.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        impact.connect(impG);
        impG.connect(masterGain);
        impact.start(t);
        try { impact.stop(t + 0.55); } catch (_) {}
        impact.onended = () => { try { impact.disconnect(); impG.disconnect(); } catch (_) {} };
      }

      // 反拍 hi-hat
      if (beatCount % 2 === 0) {
        const filter = makeFilter(c, 'highpass', 3000, 0.5);
        const noise = c.createBufferSource();
        noise.buffer = getNoiseBuffer(c);
        const ng = makeGain(c, bgmGain() * 0.06);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        noise.connect(filter);
        filter.connect(ng);
        ng.connect(masterGain);
        noise.start(t);
        try { noise.stop(t + 0.05); } catch (_) {}
        noise.onended = () => { try { noise.disconnect(); ng.disconnect(); filter.disconnect(); } catch (_) {} };
      }
    }, beatInterval);

    bgmNodes = nodes;
    bgmLoop = drumLoop;
    bgmType = 'boss';
  }

  // ═══════════════════════════════════════════════════
  //  音效路由表
  // ═══════════════════════════════════════════════════

  const sfxMap = {
    // UI
    click: sfx_click,
    hover: sfx_hover,
    confirm: sfx_confirm,
    cancel: sfx_cancel,
    // 战斗
    attack_light: sfx_attack_light,
    attack_heavy: sfx_attack_heavy,
    crit: sfx_crit,
    hit_flesh: sfx_hit_flesh,
    hit_metal: sfx_hit_metal,
    dodge: sfx_dodge,
    parry: sfx_parry,
    block: sfx_block,
    skill_cast: sfx_skill_cast,
    // 元素
    elem_fire: sfx_elem_fire,
    elem_ice: sfx_elem_ice,
    elem_lightning: sfx_elem_lightning,
    elem_void: sfx_elem_void,
    elem_reaction: sfx_elem_reaction,
    // 游戏事件
    levelup: sfx_levelup,
    item_pickup: sfx_item_pickup,
    item_equip: sfx_item_equip,
    coin_drop: sfx_coin_drop,
    coin_pickup: sfx_coin_pickup,
    chest_open: sfx_chest_open,
    door_open: sfx_door_open,
    // Boss/危险
    boss_intro: sfx_boss_intro,
    boss_phase: sfx_boss_phase,
    danger_warning: sfx_danger_warning,
    death: sfx_death,
    // 环境
    ambient_void: sfx_ambient_void,
    // 动态参数化
    combo_hit: sfx_combo_hit,
    heartbeat: sfx_heartbeat,
    footstep: sfx_footstep,
  };

  const bgmMap = {
    explore: startBgmExplore,
    combat: startBgmCombat,
    boss: startBgmBoss,
  };

  // ═══════════════════════════════════════════════════
  //  公共 API
  // ═══════════════════════════════════════════════════

  // sfxMap 别名 —— 支持架构文档中 "sfx_" 前缀的调用方式
  // 例如 play('sfx_attack_light') 和 play('attack_light') 都能匹配
  function resolveSfx(name) {
    if (sfxMap[name]) return sfxMap[name];
    // 去掉 sfx_ 前缀再匹配
    if (name.startsWith('sfx_')) {
      const stripped = name.slice(4);
      if (sfxMap[stripped]) return sfxMap[stripped];
    }
    return null;
  }

  loadSettings();

  return {
    /**
     * 初始化 AudioManager
     * @param {Object} [config] - 初始化配置
     * @param {number} [config.masterVolume=0.7] - 主音量
     * @param {number} [config.sfxVolume=0.8] - 音效音量
     * @param {number} [config.bgmVolume=0.5] - BGM音量
     * @param {number} [config.throttleMs=120] - 节流间隔(ms)
     */
    init(config) {
      if (config) {
        if (config.masterVolume !== undefined) volumes.master = config.masterVolume;
        if (config.sfxVolume !== undefined) volumes.sfx = config.sfxVolume;
        if (config.bgmVolume !== undefined) volumes.bgm = config.bgmVolume;
        if (config.throttleMs !== undefined) THROTTLE_MS = config.throttleMs;
      }
      getCtx();
    },

    /**
     * 播放音效 —— 支持 sfx_前缀 和 无前缀 两种 sfxId
     * @param {string} sfxId - 音效ID（见 sfxMap，支持 "attack_light" 或 "sfx_attack_light"）
     * @param {Object} [options] - 播放选项
     * @param {number} [options.volume=1.0] - 音量倍率 0~2
     * @param {number} [options.pitch=1.0] - 音高倍率（保留，当前未实现全局 pitch）
     * @param {boolean} [options.force=false] - 是否强制播放（跳过节流）
     * @param {Object} [options.params] - 动态参数（用于 combo_hit/heartbeat/footstep）
     */
    play(sfxId, options) {
      if (muted) return;
      const opts = options || {};
      if (!opts.force && throttled(sfxId)) return;
      const fn = resolveSfx(sfxId);
      if (!fn) return;
      // 临时覆盖增益倍率
      const origSfxVol = volumes.sfx;
      if (opts.volume !== undefined) {
        volumes.sfx = origSfxVol * Math.max(0, Math.min(2, opts.volume));
      }
      try {
        const c = getCtx();
        if (opts.params) {
          fn(c, opts.params);
        } else {
          fn(c);
        }
      } catch (_) {}
      // 恢复
      volumes.sfx = origSfxVol;
    },

    /**
     * 快捷音效方法 —— 架构文档 sfx.xxx() 接口
     */
    sfx: {
      attack()       { AudioManager.play('attack_light'); },
      hit()          { AudioManager.play('hit_flesh'); },
      crit()         { AudioManager.play('crit'); },
      dodge()        { AudioManager.play('dodge'); },
      block()        { AudioManager.play('block'); },
      parry()        { AudioManager.play('parry'); },
      pickup(quality){ AudioManager.play(quality === 'coin' ? 'coin_pickup' : 'item_pickup'); },
      levelUp()      { AudioManager.play('levelup'); },
      enemyDeath()   { AudioManager.play('death'); },
      playerHurt()   { AudioManager.play('hit_flesh', { volume: 1.2 }); },
    },

    /**
     * 动态 BGM 播放（淡入 + 交叉淡化 + 循环）
     * @param {string} trackId - 曲目ID: 'bgm_explore'/'bgm_combat'/'bgm_boss'/'explore'/'combat'/'boss'
     * @param {Object} [options] - 播放选项
     * @param {number} [options.fadeIn=1.0] - 淡入时长(秒)
     * @param {number} [options.crossfade=0.5] - 交叉淡化时长(秒)
     * @param {boolean} [options.loop=true] - 是否循环
     */
    playDynamic(trackId, options) {
      // 规范化 trackId：去掉 bgm_ 前缀
      let type = trackId;
      if (type.startsWith('bgm_')) type = type.slice(4);
      // 映射别名
      const aliasMap = {
        explore_1: 'explore', explore_2: 'explore', explore_3: 'explore',
        explore_4: 'explore', explore_5: 'explore',
        title: 'explore', shop: 'explore',
        death: 'explore', victory: 'explore',
      };
      type = aliasMap[type] || type;

      if (!bgmMap[type]) return;
      if (bgmType === type) return; // 已在播放

      // 交叉淡化：先淡出当前，再启动新曲目
      stopAllBgmNodes();
      if (muted) { bgmType = type; return; }
      const startFn = bgmMap[type];
      if (startFn) {
        try { startFn(); } catch (_) {}
      }
    },

    /**
     * 播放 BGM（简化接口，playDynamic 的别名）
     * @param {string} type - 'explore' | 'combat' | 'boss'
     */
    playBGM(type) {
      this.playDynamic(type);
    },

    /** 停止 BGM */
    stopBGM() {
      stopAllBgmNodes();
    },

    /**
     * 切换游戏状态（自动切换 BGM）
     * @param {string} state - 'explore' | 'combat' | 'boss'
     */
    setState(state) {
      currentState = state;
      this.playDynamic(state);
    },

    /** 获取当前状态 */
    getState() {
      return currentState;
    },

    /**
     * 切换静音 → 返回新的静音状态 boolean
     * 触发事件: 'audio:muteChanged'（通过 EventBus，若已集成）
     */
    toggleMute() {
      muted = !muted;
      if (muted) {
        stopAllBgmNodes();
      } else {
        // 恢复时重新播放当前状态的 BGM
        const startFn = bgmMap[currentState];
        if (startFn) {
          try { startFn(); } catch (_) {}
        }
      }
      saveSettings();
      return muted;
    },

    /** 查询静音状态 */
    isMuted() {
      return muted;
    },

    /**
     * 设置音量
     * @param {string} channel - 'master' | 'sfx' | 'bgm'
     * @param {number} volume - 0 到 1
     */
    setVolume(channel, volume) {
      const v = Math.max(0, Math.min(1, volume));
      if (volumes[channel] !== undefined) {
        volumes[channel] = v;
        saveSettings();
      }
    },

    /** 获取音量 */
    getVolume(channel) {
      return volumes[channel] !== undefined ? volumes[channel] : 1;
    },

    /**
     * 获取完整音频状态 —— 架构文档 getAudioState() 接口
     * @returns {{muted: boolean, masterVolume: number, sfxVolume: number, bgmVolume: number}}
     */
    getAudioState() {
      return {
        muted,
        masterVolume: volumes.master,
        sfxVolume: volumes.sfx,
        bgmVolume: volumes.bgm,
      };
    },

    /** 销毁释放所有资源 */
    destroy() {
      stopAllBgmNodes();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (ctx) {
        try { ctx.close(); } catch (_) {}
        ctx = null;
      }
      activeNodes = 0;
    },
  };
})();

// ES Module 导出（架构文档要求 export const AudioManager）
// 同时保留全局变量以兼容非模块环境
if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
}
