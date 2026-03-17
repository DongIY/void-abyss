/**
 * ═══════════════════════════════════════════════════════════════
 *  ✨ Void Abyss — FXManager
 *  粒子引擎 / 预设特效 / 屏幕震动 / 慢动作 / 星空背景
 *  绘制在 L2(canvas-fx) 层, 使用对象池管理粒子避免 GC
 * ═══════════════════════════════════════════════════════════════
 */

import { Camera } from './camera.js';
import { EventBus } from './event-bus.js';
import { ObjectPool, randomRange, randomInt, hexToRGBA, clamp, lerp } from './utils.js';

// ─── 颜色常量 ───
const COLORS = {
  void: '#a855f7',
  fire: '#ef4444',
  fireOrange: '#ff6b35',
  ice: '#38bdf8',
  iceWhite: '#e0f2fe',
  lightning: '#facc15',
  critGold: '#fbbf24',
  heal: '#4ade80',
  white: '#ffffff'
};

// ─── 内部状态 ───
let _ctx = null;           // L2 特效层 context
let _maxParticles = 500;
let _initialized = false;

// 粒子存储
const _particles = [];
let _activeCount = 0;

// FPS 降级
let _fpsLow = false;
let _fpsSampleTimer = 0;
let _fpsSamples = [];

// 慢动作状态
let _slowMotionActive = false;
let _slowMotionScale = 1.0;
let _slowMotionDuration = 0;
let _slowMotionElapsed = 0;

// 低血量暗角效果
let _lowHpActive = false;
let _lowHpRatio = 1.0;
let _lowHpPulseTimer = 0;

// 持续特效 (portal 等)
const _persistentEffects = [];

// 星空系统
let _starCtx = null;
const _stars = [];
let _starsDirty = true;

// ─── 粒子对象池 ───
const _particlePool = new ObjectPool(
  () => ({
    x: 0, y: 0,
    vx: 0, vy: 0,
    life: 0, maxLife: 1,
    size: 4, startSize: 4, endSize: 0,
    color: '#ffffff',
    alpha: 1, startAlpha: 1, endAlpha: 0,
    gravity: 0,
    shape: 'circle',
    rotation: 0, rotationSpeed: 0,
    active: false,
    isScreenSpace: false
  }),
  (p) => {
    p.active = false;
    p.isScreenSpace = false;
    p.gravity = 0;
    p.rotation = 0;
    p.rotationSpeed = 0;
  },
  100 // 预分配 100 个
);

// ─── 工具函数 ───

function pickColor(color) {
  if (Array.isArray(color)) {
    return color[randomInt(0, color.length - 1)];
  }
  return color;
}

function rangeVal(range) {
  if (Array.isArray(range)) return randomRange(range[0], range[1]);
  return range;
}

/** 回收最旧粒子（life 最接近 maxLife） */
function recycleOldest() {
  let oldestIdx = -1;
  let maxProgress = -1;
  for (let i = 0; i < _particles.length; i++) {
    if (!_particles[i].active) continue;
    const progress = _particles[i].life / _particles[i].maxLife;
    if (progress > maxProgress) {
      maxProgress = progress;
      oldestIdx = i;
    }
  }
  if (oldestIdx >= 0) {
    _particles[oldestIdx].active = false;
    _particlePool.release(_particles[oldestIdx]);
    _particles.splice(oldestIdx, 1);
    _activeCount--;
  }
}

// ─── FXManager ───

export const FXManager = {
  /**
   * 初始化特效管理器
   * @param {Object} config
   * @param {CanvasRenderingContext2D} config.ctx - L2 特效层 context
   * @param {number} [config.maxParticles=500]
   */
  init(config = {}) {
    _ctx = config.ctx;
    _maxParticles = config.maxParticles || 500;
    _initialized = true;

    // 清理旧状态
    _particles.length = 0;
    _activeCount = 0;
    _persistentEffects.length = 0;
    _lowHpActive = false;
    _lowHpRatio = 1.0;
    _slowMotionActive = false;
    _slowMotionScale = 1.0;
    _fpsSamples.length = 0;
    _fpsLow = false;

    // 订阅 EventBus 事件
    this._subscribeEvents();

    return true;
  },

  /**
   * 播放预设特效
   * @param {string} effectType
   * @param {number} x - 世界坐标 X
   * @param {number} y - 世界坐标 Y
   * @param {Object} [options] - 额外参数
   */
  playEffect(effectType, x, y, options = {}) {
    if (!_initialized) return;

    const presets = {
      'attack_arc': () => this._effectAttackArc(x, y, options),
      'hit_burst': () => this._effectHitBurst(x, y, options),
      'crit_burst': () => this._effectCritBurst(x, y, options),
      'dodge_shadow': () => this._effectDodgeShadow(x, y, options),
      'block_spark': () => this._effectBlockSpark(x, y, options),
      'level_up': () => this._effectLevelUp(x, y, options),
      'death_dissolve': () => this._effectDeathDissolve(x, y, options),
      'enemy_death_burst': () => this._effectEnemyDeathBurst(x, y, options),
      'portal': () => this._effectPortal(x, y, options),
      'item_pickup': () => this._effectItemPickup(x, y, options),
      'element_reaction_fire': () => this._effectElementFire(x, y, options),
      'element_reaction_ice': () => this._effectElementIce(x, y, options),
      'element_reaction_lightning': () => this._effectElementLightning(x, y, options),
      'element_reaction_void': () => this._effectElementVoid(x, y, options),
      'combo_tier_nice': () => this._effectComboTier(x, y, 'nice', options),
      'combo_tier_great': () => this._effectComboTier(x, y, 'great', options),
      'combo_tier_amazing': () => this._effectComboTier(x, y, 'amazing', options),
      'combo_tier_legendary': () => this._effectComboTier(x, y, 'legendary', options),
      'combo_tier_void_master': () => this._effectComboTier(x, y, 'void_master', options),
      'synergy_activate': () => this._effectSynergyActivate(x, y, options),
      'low_hp_vignette': () => this._startLowHpVignette(options),
      'boss_entrance': () => this._effectBossEntrance(x, y, options)
    };

    const fn = presets[effectType];
    if (fn) fn();
  },

  /**
   * 自定义粒子生成
   * @param {Object} config
   */
  spawnParticles(config = {}) {
    if (!_initialized) return;

    const {
      x = 0, y = 0,
      count = 10,
      color = COLORS.void,
      speed = [50, 150],
      life = [0.3, 1.0],
      size = [2, 6],
      spread = Math.PI * 2,
      direction = 0,
      gravity = 0,
      fadeOut = true,
      shrink = true,
      shape = 'circle',
      isScreenSpace = false
    } = config;

    const spawnCount = _fpsLow ? Math.ceil(count * 0.6) : count;

    for (let i = 0; i < spawnCount; i++) {
      // 粒子上限检查
      if (_activeCount >= _maxParticles) {
        recycleOldest();
      }

      const p = _particlePool.get();
      p.x = x;
      p.y = y;

      const angle = direction + (Math.random() - 0.5) * spread;
      const spd = rangeVal(speed);
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;

      p.life = 0;
      p.maxLife = rangeVal(life);

      const sz = rangeVal(size);
      p.size = sz;
      p.startSize = sz;
      p.endSize = shrink ? 0 : sz;

      p.color = pickColor(color);
      p.alpha = 1;
      p.startAlpha = 1;
      p.endAlpha = fadeOut ? 0 : 1;

      p.gravity = gravity;
      p.shape = shape;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 4;
      p.active = true;
      p.isScreenSpace = isScreenSpace;

      _particles.push(p);
      _activeCount++;
    }
  },

  /**
   * 屏幕震动 — 委托 Camera.shake
   * @param {number} intensity - 震动强度(px)
   * @param {number} [duration=0.3]
   */
  screenShake(intensity, duration = 0.3) {
    Camera.shake(intensity, duration);
  },

  /**
   * 慢动作
   * @param {number} timeScale - 时间缩放 (0.1 ~ 1.0)
   * @param {number} duration - 持续秒数
   */
  slowMotion(timeScale, duration) {
    _slowMotionActive = true;
    _slowMotionScale = timeScale;
    _slowMotionDuration = duration;
    _slowMotionElapsed = 0;
    EventBus.emit('fx:timeScale', { timeScale });
  },

  /**
   * 每帧更新
   * @param {number} dt - 帧间隔(秒)
   */
  update(dt) {
    if (!_initialized) return;

    // FPS 监控
    this._updateFPSMonitor(dt);

    // 慢动作计时
    if (_slowMotionActive) {
      _slowMotionElapsed += dt;
      if (_slowMotionElapsed >= _slowMotionDuration) {
        _slowMotionActive = false;
        _slowMotionScale = 1.0;
        EventBus.emit('fx:timeScale', { timeScale: 1.0 });
      }
    }

    // 低血量脉动
    if (_lowHpActive) {
      _lowHpPulseTimer += dt;
    }

    // 更新粒子
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      if (!p.active) continue;

      p.life += dt;

      if (p.life >= p.maxLife) {
        p.active = false;
        _particlePool.release(p);
        _particles.splice(i, 1);
        _activeCount--;
        continue;
      }

      const t = p.life / p.maxLife;

      // 物理更新
      p.vy += p.gravity * dt * 60;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 大小插值
      p.size = lerp(p.startSize, p.endSize, t);

      // 透明度插值
      p.alpha = lerp(p.startAlpha, p.endAlpha, t);

      // 旋转
      p.rotation += p.rotationSpeed * dt;
    }

    // 持续特效更新
    for (let i = _persistentEffects.length - 1; i >= 0; i--) {
      const eff = _persistentEffects[i];
      eff.elapsed += dt;
      if (eff.duration > 0 && eff.elapsed >= eff.duration) {
        _persistentEffects.splice(i, 1);
        continue;
      }
      if (eff.update) eff.update(dt, eff);
    }

    // 星空更新
    this._updateStarfield(dt);
  },

  /**
   * 每帧绘制
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!_initialized) return;
    const drawCtx = ctx || _ctx;
    if (!drawCtx) return;

    // 绘制粒子
    for (let i = 0; i < _particles.length; i++) {
      const p = _particles[i];
      if (!p.active) continue;
      if (p.alpha <= 0 || p.size <= 0) continue;

      let sx, sy;
      if (p.isScreenSpace) {
        sx = p.x;
        sy = p.y;
      } else {
        // 视口裁剪
        if (!Camera.isInView(p.x, p.y, 50)) continue;
        const screen = Camera.worldToScreen(p.x, p.y);
        sx = screen.x;
        sy = screen.y;
      }

      drawCtx.save();
      drawCtx.globalAlpha = clamp(p.alpha, 0, 1);
      drawCtx.fillStyle = p.color;
      drawCtx.translate(sx, sy);
      drawCtx.rotate(p.rotation);

      switch (p.shape) {
        case 'square':
          drawCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case 'triangle':
          drawCtx.beginPath();
          drawCtx.moveTo(0, -p.size);
          drawCtx.lineTo(-p.size * 0.866, p.size * 0.5);
          drawCtx.lineTo(p.size * 0.866, p.size * 0.5);
          drawCtx.closePath();
          drawCtx.fill();
          break;
        case 'star':
          this._drawStar(drawCtx, 0, 0, 5, p.size, p.size * 0.5);
          break;
        default: // circle
          drawCtx.beginPath();
          drawCtx.arc(0, 0, p.size, 0, Math.PI * 2);
          drawCtx.fill();
          break;
      }
      drawCtx.restore();
    }

    // 持续特效绘制
    for (let i = 0; i < _persistentEffects.length; i++) {
      const eff = _persistentEffects[i];
      if (eff.draw) eff.draw(drawCtx, eff);
    }

    // 低血量暗角
    if (_lowHpActive) {
      this._drawLowHpVignette(drawCtx);
    }
  },

  /** 获取当前活跃粒子数量 */
  getActiveParticleCount() {
    return _activeCount;
  },

  /**
   * 初始化星空背景 (L0 bg 层)
   * @param {CanvasRenderingContext2D} ctx - 背景层 context
   * @param {number} [starCount=200]
   */
  initStarfield(ctx, starCount = 200) {
    _starCtx = ctx;
    _stars.length = 0;
    for (let i = 0; i < starCount; i++) {
      _stars.push({
        x: Math.random() * 960,
        y: Math.random() * 640,
        radius: 0.3 + Math.random() * 1.5,
        baseAlpha: 0.1 + Math.random() * 0.5,
        alpha: 0.3,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2.0,
        driftX: (Math.random() - 0.5) * 3,
        driftY: (Math.random() - 0.5) * 1.5
      });
    }
    _starsDirty = true;
  },

  // ═══════════════════════════════════════════
  //  预设特效实现
  // ═══════════════════════════════════════════

  /** 挥砍弧光 */
  _effectAttackArc(x, y, opts) {
    const dir = opts.direction || 0;
    const elemColors = {
      void: [COLORS.void, '#c084fc', COLORS.white],
      fire: [COLORS.fire, COLORS.fireOrange, COLORS.white],
      ice: [COLORS.ice, COLORS.iceWhite, COLORS.white],
      lightning: [COLORS.lightning, '#fde68a', COLORS.white],
      none: ['#94a3b8', '#e2e8f0', COLORS.white]
    };
    const colors = elemColors[opts.element] || elemColors.void;
    // 主弧光
    this.spawnParticles({
      x, y,
      count: randomInt(18, 28),
      color: colors,
      speed: [100, 240],
      life: [0.08, 0.22],
      size: [2, 6],
      spread: Math.PI * 0.5,
      direction: dir,
      fadeOut: true,
      shrink: true,
      shape: 'circle'
    });
    // 弧线拖影（较大较慢的粒子）
    this.spawnParticles({
      x, y,
      count: randomInt(5, 8),
      color: [colors[0], COLORS.white],
      speed: [60, 120],
      life: [0.15, 0.35],
      size: [4, 8],
      spread: Math.PI * 0.35,
      direction: dir,
      fadeOut: true,
      shrink: true,
      shape: 'square'
    });
  },

  /** 命中爆发 */
  _effectHitBurst(x, y, opts) {
    this.spawnParticles({
      x, y,
      count: randomInt(20, 30),
      color: [COLORS.white, '#c084fc', COLORS.void],
      speed: [60, 180],
      life: [0.15, 0.35],
      size: [2, 5],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true,
      gravity: 80
    });
  },

  /** 暴击大型爆发 */
  _effectCritBurst(x, y, opts) {
    // 金色主爆发
    this.spawnParticles({
      x, y,
      count: randomInt(30, 45),
      color: [COLORS.critGold, '#fde68a', COLORS.white],
      speed: [100, 280],
      life: [0.2, 0.55],
      size: [3, 8],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true,
      shape: 'star'
    });
    // 紫色次爆发
    this.spawnParticles({
      x, y,
      count: randomInt(10, 15),
      color: [COLORS.void, '#c084fc'],
      speed: [40, 120],
      life: [0.3, 0.5],
      size: [2, 4],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true
    });
  },

  /** 闪避残影 */
  _effectDodgeShadow(x, y, opts) {
    const dir = opts.direction || 0;
    for (let i = 0; i < 3; i++) {
      const offsetDist = (i + 1) * 12;
      const sx = x - Math.cos(dir) * offsetDist;
      const sy = y - Math.sin(dir) * offsetDist;
      _persistentEffects.push({
        type: 'dodge_shadow',
        x: sx, y: sy,
        alpha: 0.6 - i * 0.15,
        width: opts.width || 32,
        height: opts.height || 32,
        color: opts.color || COLORS.void,
        elapsed: 0,
        duration: 0.3,
        frameDelay: i * 0.04,
        draw(ctx, eff) {
          if (eff.elapsed < eff.frameDelay) return;
          const localAlpha = eff.alpha * (1 - (eff.elapsed - eff.frameDelay) / (eff.duration - eff.frameDelay));
          if (localAlpha <= 0) return;
          if (!Camera.isInView(eff.x, eff.y, 50)) return;
          const screen = Camera.worldToScreen(eff.x, eff.y);
          ctx.save();
          ctx.globalAlpha = clamp(localAlpha, 0, 1);
          ctx.fillStyle = eff.color;
          ctx.fillRect(screen.x - eff.width / 2, screen.y - eff.height / 2, eff.width, eff.height);
          ctx.restore();
        }
      });
    }
  },

  /** 格挡火花 */
  _effectBlockSpark(x, y, opts) {
    const cnt = opts.large ? randomInt(20, 30) : randomInt(10, 15);
    this.spawnParticles({
      x, y,
      count: cnt,
      color: [COLORS.critGold, '#fde68a', COLORS.white],
      speed: [100, 250],
      life: [0.1, 0.25],
      size: [1, 4],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true,
      gravity: 150,
      shape: 'square'
    });
  },

  /** 升级光柱 */
  _effectLevelUp(x, y, opts) {
    // 底→顶光柱（持续特效）
    _persistentEffects.push({
      type: 'level_up_pillar',
      x, y,
      elapsed: 0,
      duration: 1.5,
      draw(ctx, eff) {
        const t = eff.elapsed / eff.duration;
        const pillarH = 200 * Math.min(t * 3, 1);
        const alpha = t < 0.8 ? 0.6 : 0.6 * (1 - (t - 0.8) / 0.2);
        if (!Camera.isInView(eff.x, eff.y, 200)) return;
        const screen = Camera.worldToScreen(eff.x, eff.y);
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        const grad = ctx.createLinearGradient(screen.x, screen.y, screen.x, screen.y - pillarH);
        grad.addColorStop(0, 'rgba(168,85,247,0.8)');
        grad.addColorStop(0.5, 'rgba(192,132,252,0.4)');
        grad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(screen.x - 15, screen.y - pillarH, 30, pillarH);
        ctx.restore();
      }
    });
    // 螺旋粒子
    const spiralCount = randomInt(30, 50);
    for (let i = 0; i < spiralCount; i++) {
      const angle = (i / spiralCount) * Math.PI * 6;
      const delay = (i / spiralCount) * 1.0;
      const radius = 20 + (i / spiralCount) * 10;
      const px = x + Math.cos(angle) * radius;
      const py = y;
      this.spawnParticles({
        x: px, y: py,
        count: 1,
        color: [COLORS.void, '#c084fc', COLORS.white],
        speed: [10, 40],
        life: [0.8, 1.5],
        size: [2, 5],
        spread: 0.5,
        direction: -Math.PI / 2,
        fadeOut: true,
        shrink: true,
        gravity: -60
      });
    }
  },

  /** 死亡分解 */
  _effectDeathDissolve(x, y, opts) {
    this.spawnParticles({
      x, y,
      count: randomInt(50, 70),
      color: [COLORS.void, '#7c3aed', '#c084fc', COLORS.white],
      speed: [20, 100],
      life: [1.0, 2.5],
      size: [2, 6],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: false,
      gravity: -15,
      shape: 'square'
    });
  },

  /** 敌人死亡爆发（高打击感快速爆发） */
  _effectEnemyDeathBurst(x, y, opts) {
    const elemColors = {
      void: [COLORS.void, '#c084fc', COLORS.white],
      fire: [COLORS.fire, COLORS.fireOrange, COLORS.critGold],
      ice: [COLORS.ice, COLORS.iceWhite, COLORS.white],
      lightning: [COLORS.lightning, '#fde68a', COLORS.white],
      none: ['#ef4444', '#fca5a5', COLORS.white]
    };
    const colors = elemColors[opts.element] || elemColors.none;

    // 主爆发：大量快速扩散粒子
    this.spawnParticles({
      x, y,
      count: randomInt(25, 40),
      color: colors,
      speed: [120, 300],
      life: [0.15, 0.45],
      size: [3, 7],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true,
      shape: 'circle'
    });

    // 方形碎片（像素碎裂感）
    this.spawnParticles({
      x, y,
      count: randomInt(8, 14),
      color: colors,
      speed: [60, 160],
      life: [0.3, 0.7],
      size: [3, 6],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: false,
      gravity: 120,
      shape: 'square'
    });

    // 白色闪光核心
    _persistentEffects.push({
      type: 'death_flash',
      x, y,
      elapsed: 0,
      duration: 0.12,
      draw(ctx, eff) {
        const alpha = 0.8 * (1 - eff.elapsed / eff.duration);
        if (!Camera.isInView(eff.x, eff.y, 60)) return;
        const screen = Camera.worldToScreen(eff.x, eff.y);
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.fillStyle = COLORS.white;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 20 * (1 - eff.elapsed / eff.duration), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // 击杀震屏
    this.screenShake(5, 0.15);
  },

  /** 传送门漩涡（持续） */
  _effectPortal(x, y, opts) {
    const portalId = `portal_${x}_${y}`;
    // 持续生成粒子
    _persistentEffects.push({
      type: 'portal',
      id: portalId,
      x, y,
      elapsed: 0,
      duration: opts.duration || 0, // 0 = 永续
      spawnTimer: 0,
      update(dt, eff) {
        eff.spawnTimer += dt;
        if (eff.spawnTimer >= 0.05) {
          eff.spawnTimer = 0;
          const angle = eff.elapsed * 4;
          const radius = 30 + Math.sin(eff.elapsed * 2) * 10;
          FXManager.spawnParticles({
            x: eff.x + Math.cos(angle) * radius,
            y: eff.y + Math.sin(angle) * radius,
            count: 2,
            color: [COLORS.void, '#7c3aed'],
            speed: [5, 20],
            life: [0.3, 0.8],
            size: [2, 4],
            spread: Math.PI,
            direction: angle + Math.PI,
            fadeOut: true,
            shrink: true
          });
        }
      },
      draw(ctx, eff) {
        if (!Camera.isInView(eff.x, eff.y, 80)) return;
        const screen = Camera.worldToScreen(eff.x, eff.y);
        ctx.save();
        const pulse = 0.6 + Math.sin(eff.elapsed * 3) * 0.2;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = COLORS.void;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.void;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    });
  },

  /** 道具飞向角色 */
  _effectItemPickup(x, y, opts) {
    const targetX = opts.targetX || x;
    const targetY = opts.targetY || y - 30;
    this.spawnParticles({
      x, y,
      count: randomInt(8, 12),
      color: [COLORS.heal, COLORS.white, '#86efac'],
      speed: [30, 80],
      life: [0.2, 0.4],
      size: [2, 4],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true
    });
  },

  /** 火焰爆发 */
  _effectElementFire(x, y, opts) {
    this.spawnParticles({
      x, y,
      count: randomInt(50, 80),
      color: [COLORS.fire, COLORS.fireOrange, '#fca5a5', COLORS.critGold],
      speed: [80, 250],
      life: [0.4, 1.1],
      size: [3, 8],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true,
      gravity: -40
    });
    this.screenShake(6, 0.3);
  },

  /** 冰冻区域 */
  _effectElementIce(x, y, opts) {
    this.spawnParticles({
      x, y,
      count: randomInt(40, 60),
      color: [COLORS.ice, COLORS.iceWhite, '#7dd3fc', COLORS.white],
      speed: [40, 150],
      life: [0.5, 1.1],
      size: [2, 7],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: false,
      gravity: 20,
      shape: 'square'
    });
    this.screenShake(4, 0.25);
  },

  /** 雷电链 */
  _effectElementLightning(x, y, opts) {
    this.spawnParticles({
      x, y,
      count: randomInt(30, 50),
      color: [COLORS.lightning, '#fde68a', COLORS.white],
      speed: [120, 350],
      life: [0.1, 0.5],
      size: [1, 5],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true
    });
    // 闪光效果
    _persistentEffects.push({
      type: 'lightning_flash',
      x, y,
      elapsed: 0,
      duration: 0.15,
      draw(ctx, eff) {
        const alpha = 0.3 * (1 - eff.elapsed / eff.duration);
        ctx.save();
        ctx.fillStyle = `rgba(250,204,21,${alpha})`;
        ctx.fillRect(0, 0, 960, 640);
        ctx.restore();
      }
    });
    this.screenShake(5, 0.2);
  },

  /** 虚空吸引 */
  _effectElementVoid(x, y, opts) {
    // 向心粒子
    const count = randomInt(50, 80);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const toCenter = Math.atan2(y - py, x - px);
      this.spawnParticles({
        x: px, y: py,
        count: 1,
        color: [COLORS.void, '#7c3aed', '#c084fc'],
        speed: [60, 150],
        life: [0.5, 1.1],
        size: [2, 6],
        spread: 0.4,
        direction: toCenter,
        fadeOut: true,
        shrink: true
      });
    }
    this.screenShake(4, 0.3);
  },

  /** Combo 阶梯特效 */
  _effectComboTier(x, y, tier, opts) {
    const configs = {
      nice: { count: 10, colors: [COLORS.heal, COLORS.white], speed: [30, 80], life: [0.3, 0.5], size: [2, 4] },
      great: { count: 20, colors: [COLORS.ice, COLORS.white, '#a5f3fc'], speed: [50, 120], life: [0.3, 0.7], size: [2, 5] },
      amazing: { count: 30, colors: [COLORS.void, '#c084fc', COLORS.critGold], speed: [60, 160], life: [0.5, 1.0], size: [3, 6] },
      legendary: { count: 50, colors: [COLORS.critGold, '#fde68a', COLORS.void, COLORS.white], speed: [80, 220], life: [0.5, 1.5], size: [3, 7] },
      void_master: { count: 80, colors: [COLORS.void, '#7c3aed', '#c084fc', COLORS.white, COLORS.critGold], speed: [100, 300], life: [0.8, 2.0], size: [3, 8] }
    };
    const cfg = configs[tier] || configs.nice;

    // Combo 特效是屏幕空间的（居中显示）
    this.spawnParticles({
      x: 480, y: 320,
      count: cfg.count,
      color: cfg.colors,
      speed: cfg.speed,
      life: cfg.life,
      size: cfg.size,
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true,
      isScreenSpace: true
    });

    if (tier === 'legendary' || tier === 'void_master') {
      this.screenShake(tier === 'void_master' ? 8 : 5, 0.4);
    }
  },

  /** Synergy 激活光波 */
  _effectSynergyActivate(x, y, opts) {
    // 环形扩散粒子
    this.spawnParticles({
      x, y,
      count: randomInt(30, 40),
      color: [COLORS.void, COLORS.critGold, '#c084fc', COLORS.white],
      speed: [80, 200],
      life: [0.5, 1.0],
      size: [3, 6],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: true
    });
    // 光波环
    _persistentEffects.push({
      type: 'synergy_wave',
      x, y,
      elapsed: 0,
      duration: 1.0,
      draw(ctx, eff) {
        const t = eff.elapsed / eff.duration;
        const radius = t * 120;
        const alpha = 0.6 * (1 - t);
        if (!Camera.isInView(eff.x, eff.y, 150)) return;
        const screen = Camera.worldToScreen(eff.x, eff.y);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = COLORS.critGold;
        ctx.lineWidth = 3 * (1 - t);
        ctx.shadowColor = COLORS.critGold;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    });
    this.screenShake(4, 0.3);
  },

  /** 启动低血量暗角 */
  _startLowHpVignette(opts) {
    _lowHpActive = true;
    _lowHpRatio = opts.ratio !== undefined ? opts.ratio : 0.3;
    _lowHpPulseTimer = 0;
  },

  /** 停止低血量暗角 */
  _stopLowHpVignette() {
    _lowHpActive = false;
  },

  /** Boss 登场特效 */
  _effectBossEntrance(x, y, opts) {
    // 暗化效果
    _persistentEffects.push({
      type: 'boss_darken',
      elapsed: 0,
      duration: 2.0,
      draw(ctx, eff) {
        const t = eff.elapsed / eff.duration;
        let alpha;
        if (t < 0.3) {
          alpha = (t / 0.3) * 0.6;
        } else if (t < 0.7) {
          alpha = 0.6;
        } else {
          alpha = 0.6 * (1 - (t - 0.7) / 0.3);
        }
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${clamp(alpha, 0, 1)})`;
        ctx.fillRect(0, 0, 960, 640);
        ctx.restore();
      }
    });
    // 能量波
    this.spawnParticles({
      x, y,
      count: randomInt(50, 60),
      color: [COLORS.fire, COLORS.void, '#7c3aed'],
      speed: [30, 120],
      life: [1.0, 2.0],
      size: [3, 8],
      spread: Math.PI * 2,
      fadeOut: true,
      shrink: false,
      gravity: -10
    });
    this.screenShake(6, 1.0);
  },

  // ═══════════════════════════════════════════
  //  内部辅助
  // ═══════════════════════════════════════════

  /** 绘制五角星 */
  _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
  },

  /** 绘制低血量暗角 */
  _drawLowHpVignette(ctx) {
    const intensity = clamp(1 - _lowHpRatio, 0, 1);
    const pulse = Math.sin(_lowHpPulseTimer * 4) * 0.15 + 0.85;
    const alpha = intensity * 0.5 * pulse;
    if (alpha <= 0.01) return;

    ctx.save();
    const grad = ctx.createRadialGradient(480, 320, 150, 480, 320, 500);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, `rgba(220,38,38,${alpha * 0.3})`);
    grad.addColorStop(1, `rgba(220,38,38,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, 640);
    ctx.restore();
  },

  /** FPS 监控 — 检测低帧率自动降级 */
  _updateFPSMonitor(dt) {
    _fpsSampleTimer += dt;
    if (dt > 0) _fpsSamples.push(1 / dt);
    if (_fpsSampleTimer >= 1.0) {
      _fpsSampleTimer = 0;
      if (_fpsSamples.length > 0) {
        const avg = _fpsSamples.reduce((a, b) => a + b, 0) / _fpsSamples.length;
        _fpsLow = avg < 50;
      }
      _fpsSamples.length = 0;
    }
  },

  /** 星空更新 */
  _updateStarfield(dt) {
    if (!_starCtx || _stars.length === 0) return;

    let dirty = false;
    for (let i = 0; i < _stars.length; i++) {
      const star = _stars[i];
      star.phase += star.twinkleSpeed * dt;
      star.alpha = star.baseAlpha + Math.sin(star.phase) * star.baseAlpha * 0.4;

      star.x += star.driftX * dt;
      star.y += star.driftY * dt;

      // 环绕
      if (star.x < 0) star.x += 960;
      if (star.x > 960) star.x -= 960;
      if (star.y < 0) star.y += 640;
      if (star.y > 640) star.y -= 640;

      dirty = true;
    }

    if (dirty) {
      _starsDirty = true;
    }
  },

  /** 绘制星空（在 bg 层调用） */
  drawStarfield() {
    if (!_starCtx || _stars.length === 0) return;
    if (!_starsDirty) return;

    const ctx = _starCtx;
    // 只清除并重绘星空部分（不清空整个背景 — 由 Renderer 管理）
    for (let i = 0; i < _stars.length; i++) {
      const star = _stars[i];
      ctx.save();
      ctx.globalAlpha = clamp(star.alpha, 0, 1);
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    _starsDirty = false;
  },

  /** 订阅 EventBus 事件 */
  _subscribeEvents() {
    EventBus.on('combat:hit', (data) => {
      if (data && data.target) {
        this.playEffect('hit_burst', data.target.x, data.target.y, data);
        // 每次命中轻微震屏增强打击感
        this.screenShake(2, 0.08);
      }
    });

    EventBus.on('combat:crit', (data) => {
      if (data && data.target) {
        this.playEffect('crit_burst', data.target.x, data.target.y, data);
        this.screenShake(6, 0.25);
        // 暴击慢动作 — 极短
        this.slowMotion(0.4, 0.06);
      }
    });

    EventBus.on('combat:kill', (data) => {
      if (data && data.victim) {
        // 使用新的高打击感爆发特效替代慢速分解
        this.playEffect('enemy_death_burst', data.victim.x, data.victim.y, {
          element: data.victim.element || 'none'
        });
        // 同时保留分解效果（少量）
        this.playEffect('death_dissolve', data.victim.x, data.victim.y, data);
        // 击杀慢动作
        this.slowMotion(0.3, 0.08);
      }
    });

    EventBus.on('combat:reaction', (data) => {
      if (!data || !data.position) return;
      const { x, y } = data.position;
      const reaction = data.reaction;
      if (reaction && reaction.element) {
        const elementMap = {
          fire: 'element_reaction_fire',
          ice: 'element_reaction_ice',
          lightning: 'element_reaction_lightning',
          void: 'element_reaction_void'
        };
        const effectName = elementMap[reaction.element] || 'element_reaction_void';
        this.playEffect(effectName, x, y, data);
      } else {
        this.playEffect('element_reaction_void', x, y, data);
      }
    });

    EventBus.on('combat:block', (data) => {
      if (data && data.blocker) {
        this.playEffect('block_spark', data.blocker.x, data.blocker.y, data);
      }
    });

    EventBus.on('combat:perfectParry', (data) => {
      if (data && data.blocker) {
        this.playEffect('block_spark', data.blocker.x, data.blocker.y, { ...data, large: true });
        this.screenShake(3, 0.15);
        this.slowMotion(0.3, 0.1);
      }
    });

    EventBus.on('combat:comboTier', (data) => {
      if (!data || !data.tier) return;
      const tierMap = {
        'NICE': 'combo_tier_nice',
        'GREAT': 'combo_tier_great',
        'AMAZING': 'combo_tier_amazing',
        'LEGENDARY': 'combo_tier_legendary',
        'VOID MASTER': 'combo_tier_void_master'
      };
      const effectName = tierMap[data.tier] || 'combo_tier_nice';
      this.playEffect(effectName, 0, 0, data);
    });

    EventBus.on('player:levelUp', (data) => {
      if (data && data.x !== undefined) {
        this.playEffect('level_up', data.x, data.y, data);
      }
    });

    EventBus.on('player:lowHP', (data) => {
      if (data && data.ratio !== undefined) {
        if (data.ratio < 0.3) {
          this.playEffect('low_hp_vignette', 0, 0, { ratio: data.ratio });
        } else {
          this._stopLowHpVignette();
        }
      }
    });

    EventBus.on('item:acquired', (data) => {
      if (data && data.x !== undefined) {
        this.playEffect('item_pickup', data.x, data.y, data);
      }
    });

    EventBus.on('item:synergy', (data) => {
      if (data && data.x !== undefined) {
        this.playEffect('synergy_activate', data.x, data.y, data);
      }
    });

    EventBus.on('dungeon:roomCleared', () => {
      this.slowMotion(0.5, 0.5);
    });
  }
};
