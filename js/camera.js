/**
 * ═══════════════════════════════════════════════════════════════
 *  📷 Void Abyss — Camera System ⚠️ P0
 *  视口跟随 / 坐标转换 / 边界钳制 / 屏幕震动
 *  v5.0 教训: 必须含安全检查防黑屏，必须在渲染管线最前端执行
 * ═══════════════════════════════════════════════════════════════
 */

import { clamp, lerp as lerpVal } from './utils.js';
import { EventBus } from './event-bus.js';

// ─── 内部状态 ───
let _initialized = false;

// 相机实际位置（世界坐标中心）
let _x = 0;
let _y = 0;

// 视口尺寸
let _viewWidth = 960;
let _viewHeight = 640;
let _halfW = 480;
let _halfH = 320;

// 跟随
let _lerpFactor = 0.1;
let _target = null; // { x, y } 跟随目标

// 边界
let _bounds = null; // { left, top, right, bottom } 当前房间范围

// 震动
let _shakeIntensity = 0;
let _shakeDuration = 0;
let _shakeElapsed = 0;
let _shakeOffsetX = 0;
let _shakeOffsetY = 0;

// ─── 工具 ───

/** 简单伪随机用于震动偏移（无需加密级别） */
function shakeRand() {
  return (Math.random() - 0.5) * 2;
}

export const Camera = {
  /** 当前相机世界坐标 X（含震动偏移） */
  get x() { return _x + _shakeOffsetX; },
  /** 当前相机世界坐标 Y（含震动偏移） */
  get y() { return _y + _shakeOffsetY; },

  /** 纯净相机位置（不含震动，用于逻辑判定） */
  get rawX() { return _x; },
  get rawY() { return _y; },

  get viewWidth() { return _viewWidth; },
  get viewHeight() { return _viewHeight; },

  /**
   * 初始化相机
   * @param {Object} config
   * @param {number} [config.viewWidth=960] - 视口宽
   * @param {number} [config.viewHeight=640] - 视口高
   * @param {number} [config.lerpFactor=0.1] - 插值系数 (0.05~0.2)
   * @param {{x:number, y:number}} config.initialTarget - 初始跟随目标
   * @returns {boolean} 初始化是否成功
   */
  init(config = {}) {
    _viewWidth = config.viewWidth || 960;
    _viewHeight = config.viewHeight || 640;
    _halfW = _viewWidth / 2;
    _halfH = _viewHeight / 2;
    _lerpFactor = config.lerpFactor || 0.1;

    // 安全检查：initialTarget 必须存在
    if (config.initialTarget && typeof config.initialTarget.x === 'number' && typeof config.initialTarget.y === 'number') {
      _target = config.initialTarget;
      _x = _target.x;
      _y = _target.y;
    } else {
      // 降级：以视口中心作为初始位置
      console.warn('[Camera] No valid initialTarget provided, defaulting to (0,0)');
      _x = 0;
      _y = 0;
      _target = { x: 0, y: 0 };
    }

    // 重置震动
    _shakeIntensity = 0;
    _shakeDuration = 0;
    _shakeElapsed = 0;
    _shakeOffsetX = 0;
    _shakeOffsetY = 0;

    _bounds = null;
    _initialized = true;

    return true;
  },

  /**
   * 每帧更新相机
   * 顺序: lerp 跟随 → 边界钳制 → 震动叠加
   * ⚠️ 必须在渲染前调用
   * @param {number} dt - 帧间隔（秒）
   */
  update(dt) {
    if (!_initialized) return;

    // 1. Lerp 跟随目标
    if (_target) {
      // 帧率无关的 lerp: factor 调整为 1 - (1-lerp)^(dt*60)
      const adjustedLerp = 1 - Math.pow(1 - _lerpFactor, dt * 60);
      _x = lerpVal(_x, _target.x, adjustedLerp);
      _y = lerpVal(_y, _target.y, adjustedLerp);
    }

    // 2. 边界钳制
    if (_bounds) {
      const boundsW = _bounds.right - _bounds.left;
      const boundsH = _bounds.bottom - _bounds.top;

      if (boundsW <= _viewWidth) {
        // 房间宽度小于视口 → 居中
        _x = (_bounds.left + _bounds.right) / 2;
      } else {
        _x = clamp(_x, _bounds.left + _halfW, _bounds.right - _halfW);
      }

      if (boundsH <= _viewHeight) {
        // 房间高度小于视口 → 居中
        _y = (_bounds.top + _bounds.bottom) / 2;
      } else {
        _y = clamp(_y, _bounds.top + _halfH, _bounds.bottom - _halfH);
      }
    }

    // 3. 震动更新
    if (_shakeDuration > 0) {
      _shakeElapsed += dt;
      if (_shakeElapsed >= _shakeDuration) {
        // 震动结束
        _shakeIntensity = 0;
        _shakeDuration = 0;
        _shakeElapsed = 0;
        _shakeOffsetX = 0;
        _shakeOffsetY = 0;
      } else {
        // 衰减
        const progress = _shakeElapsed / _shakeDuration;
        const amplitude = _shakeIntensity * (1 - progress);
        _shakeOffsetX = shakeRand() * amplitude;
        _shakeOffsetY = shakeRand() * amplitude;
      }
    }
  },

  /**
   * 世界坐标 → 屏幕坐标
   * @param {number} worldX
   * @param {number} worldY
   * @returns {{x: number, y: number}} 屏幕坐标
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x + _halfW,
      y: worldY - this.y + _halfH
    };
  },

  /**
   * 屏幕坐标 → 世界坐标
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{x: number, y: number}} 世界坐标
   */
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x - _halfW,
      y: screenY + this.y - _halfH
    };
  },

  /**
   * 屏幕震动
   * @param {number} intensity - 震动强度(px)
   * @param {number} [duration=0.3] - 持续时间(秒)
   */
  shake(intensity, duration = 0.3) {
    // 叠加逻辑：取更大的强度，刷新持续时间
    if (intensity > _shakeIntensity) {
      _shakeIntensity = intensity;
    }
    _shakeDuration = duration;
    _shakeElapsed = 0;
  },

  /**
   * 设置跟随目标
   * @param {{x: number, y: number}} target - 通常是玩家实体
   */
  setTarget(target) {
    if (target && typeof target.x === 'number' && typeof target.y === 'number') {
      _target = target;
    }
  },

  /**
   * 设置相机边界（当前房间范围）
   * @param {{left: number, top: number, right: number, bottom: number}} bounds
   */
  setBounds(bounds) {
    if (bounds && typeof bounds.left === 'number') {
      _bounds = bounds;
    } else {
      _bounds = null;
    }
  },

  /**
   * 瞬移到指定位置（房间切换用，无 lerp）
   * @param {number} x - 世界坐标 X
   * @param {number} y - 世界坐标 Y
   */
  snapTo(x, y) {
    _x = x;
    _y = y;
    // 清除震动
    _shakeOffsetX = 0;
    _shakeOffsetY = 0;
    _shakeIntensity = 0;
    _shakeDuration = 0;
    _shakeElapsed = 0;
  },

  /**
   * 判断世界坐标点是否在视口内
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} [margin=50] - 额外边距（裁剪缓冲）
   * @returns {boolean}
   */
  isInView(worldX, worldY, margin = 50) {
    const screen = this.worldToScreen(worldX, worldY);
    return screen.x >= -margin &&
           screen.x <= _viewWidth + margin &&
           screen.y >= -margin &&
           screen.y <= _viewHeight + margin;
  },

  /** 相机是否已初始化 */
  get initialized() {
    return _initialized;
  },

  /** 重置相机状态（用于新局开始） */
  reset() {
    _initialized = false;
    _x = 0;
    _y = 0;
    _target = null;
    _bounds = null;
    _shakeIntensity = 0;
    _shakeDuration = 0;
    _shakeElapsed = 0;
    _shakeOffsetX = 0;
    _shakeOffsetY = 0;
  }
};
