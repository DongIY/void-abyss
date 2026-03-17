/**
 * ═══════════════════════════════════════════════════════════════
 *  🔧 Void Abyss — Utils
 *  工具函数库 — 数学/随机/对象池/向量/颜色/通用
 * ═══════════════════════════════════════════════════════════════
 */

// ─── 数学工具 ───

/** 将值限制在 [min, max] 范围内 */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** 线性插值 a→b，t ∈ [0,1] */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 两点间欧氏距离 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 两点间角度（弧度） */
export function angle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** 范围内随机浮点数 [min, max) */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/** 范围内随机整数 [min, max]（含两端） */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── 种子随机数 ───

/**
 * 种子随机数生成器（Mulberry32）
 * @param {number} seed - 种子值
 * @returns {Function} 返回 [0, 1) 的随机数函数
 */
export function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── 对象池 ───

/**
 * 通用对象池 — 避免频繁 GC
 */
export class ObjectPool {
  /**
   * @param {Function} factory - 创建新对象的工厂函数
   * @param {Function} [reset] - 重置对象的函数（可选）
   * @param {number} [initialSize=0] - 预分配数量
   */
  constructor(factory, reset, initialSize = 0) {
    this._factory = factory;
    this._reset = reset || null;
    this._pool = [];
    // 预分配
    for (let i = 0; i < initialSize; i++) {
      this._pool.push(this._factory());
    }
  }

  /**
   * 从池中获取对象
   * @returns {*} 池中对象或新建对象
   */
  get() {
    if (this._pool.length > 0) {
      return this._pool.pop();
    }
    return this._factory();
  }

  /**
   * 归还对象到池中
   * @param {*} obj - 要归还的对象
   */
  release(obj) {
    if (this._reset) {
      this._reset(obj);
    }
    this._pool.push(obj);
  }

  /** 清空池 */
  clear() {
    this._pool.length = 0;
  }

  /** 当前池中可用数量 */
  get size() {
    return this._pool.length;
  }
}

// ─── 向量工具 ───

/** 归一化二维向量，返回 {x, y} */
export function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/** 二维向量点积 */
export function dot(x1, y1, x2, y2) {
  return x1 * x2 + y1 * y2;
}

/** 二维向量反射（沿法线 nx,ny 反射入射向量 dx,dy） */
export function reflect(dx, dy, nx, ny) {
  const d = 2 * (dx * nx + dy * ny);
  return { x: dx - d * nx, y: dy - d * ny };
}

// ─── 颜色工具 ───

/**
 * 十六进制颜色转 RGBA 字符串
 * @param {string} hex - 十六进制色值（如 '#ff6b35'）
 * @param {number} [alpha=1] - 透明度 0~1
 * @returns {string} rgba 字符串
 */
export function hexToRGBA(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 颜色线性插值
 * @param {string} colorA - 起始色 hex
 * @param {string} colorB - 结束色 hex
 * @param {number} t - 插值系数 [0,1]
 * @returns {string} 结果色 hex
 */
export function lerpColor(colorA, colorB, t) {
  const a = colorA.replace('#', '');
  const b = colorB.replace('#', '');
  const rA = parseInt(a.substring(0, 2), 16);
  const gA = parseInt(a.substring(2, 4), 16);
  const bA = parseInt(a.substring(4, 6), 16);
  const rB = parseInt(b.substring(0, 2), 16);
  const gB = parseInt(b.substring(2, 4), 16);
  const bB = parseInt(b.substring(4, 6), 16);
  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const bV = Math.round(bA + (bB - bA) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bV.toString(16).padStart(2, '0')}`;
}

// ─── 通用工具 ───

/**
 * 防抖
 * @param {Function} fn - 目标函数
 * @param {number} delay - 延迟毫秒
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 节流
 * @param {Function} fn - 目标函数
 * @param {number} interval - 最小间隔毫秒
 * @returns {Function}
 */
export function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = performance.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/** 生成唯一 ID（简单自增+随机后缀） */
let _idCounter = 0;
export function generateId(prefix = 'e') {
  return `${prefix}_${++_idCounter}_${(Math.random() * 0xFFFF | 0).toString(16)}`;
}

/**
 * 深拷贝（JSON 安全的简单实现）
 * @param {*} obj - 要拷贝的对象
 * @returns {*}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  const clone = {};
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    clone[keys[i]] = deepClone(obj[keys[i]]);
  }
  return clone;
}
