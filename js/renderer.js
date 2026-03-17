/**
 * ═══════════════════════════════════════════════════════════════
 *  🎨 Void Abyss — Renderer
 *  四层 Canvas 分层渲染:
 *    L0 背景(低频) → L1 实体(每帧) → L2 特效(每帧) → L3 HUD(每帧)
 *  960×640 逻辑分辨率, CSS 响应式缩放
 * ═══════════════════════════════════════════════════════════════
 */

import { Camera } from './camera.js';
import { EventBus } from './event-bus.js';
import { SpriteRenderer } from './sprites.js';

// ─── 内部状态 ───
let _container = null;
let _width = 960;
let _height = 640;

// 四层 Canvas 与 context
const _layers = {
  bg: { canvas: null, ctx: null },       // L0 背景
  entity: { canvas: null, ctx: null },    // L1 实体
  fx: { canvas: null, ctx: null },        // L2 特效
  hud: { canvas: null, ctx: null }        // L3 HUD
};

let _initialized = false;

// 过渡动画状态
let _transitionActive = false;
let _transitionType = null;     // 'fadeIn' | 'fadeOut'
let _transitionDuration = 0;
let _transitionElapsed = 0;
let _transitionResolve = null;

// 背景脏标记（低频刷新）
let _bgDirty = true;

export const Renderer = {
  /**
   * 初始化渲染器
   * @param {Object} config
   * @param {HTMLElement} config.container - Canvas 容器
   * @param {number} [config.width=960] - 逻辑分辨率宽
   * @param {number} [config.height=640] - 逻辑分辨率高
   * @returns {{bgCtx, entityCtx, fxCtx, hudCtx}} 四层 context
   */
  init(config = {}) {
    _container = config.container;
    _width = config.width || 960;
    _height = config.height || 640;

    if (!_container) {
      console.error('[Renderer] No container element provided');
      return null;
    }

    // 获取或创建四层 Canvas
    const layerNames = ['bg', 'entity', 'fx', 'hud'];
    const canvasIds = ['canvas-bg', 'canvas-entity', 'canvas-fx', 'canvas-hud'];

    for (let i = 0; i < layerNames.length; i++) {
      const name = layerNames[i];
      let canvas = _container.querySelector(`#${canvasIds[i]}`);

      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = canvasIds[i];
        canvas.classList.add('game-canvas');
        canvas.style.zIndex = String(i);
        _container.appendChild(canvas);
      }

      canvas.width = _width;
      canvas.height = _height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`[Renderer] Failed to get 2D context for layer ${name}`);
        return null;
      }

      // 关闭抗锯齿以获得像素风格
      ctx.imageSmoothingEnabled = false;

      _layers[name] = { canvas, ctx };
    }

    // 监听窗口大小变化
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    _bgDirty = true;
    _initialized = true;

    return {
      bgCtx: _layers.bg.ctx,
      entityCtx: _layers.entity.ctx,
      fxCtx: _layers.fx.ctx,
      hudCtx: _layers.hud.ctx
    };
  },

  /**
   * 主渲染（每帧调用）
   * 清除→背景→地牢→实体→特效→HUD→过渡
   */
  draw() {
    if (!_initialized) return;

    // 清除每帧刷新的层
    _layers.entity.ctx.clearRect(0, 0, _width, _height);
    _layers.fx.ctx.clearRect(0, 0, _width, _height);
    _layers.hud.ctx.clearRect(0, 0, _width, _height);

    // 背景层只在脏标记时刷新
    if (_bgDirty) {
      this._drawBackground();
      _bgDirty = false;
    }

    // 过渡遮罩绘制在 HUD 层
    if (_transitionActive) {
      this._drawTransition();
    }
  },

  /**
   * 绘制单个实体（使用程序化精灵系统）
   * @param {CanvasRenderingContext2D} ctx - 目标 context（通常是 entity 层）
   * @param {Object} entity - 实体对象
   */
  drawEntity(ctx, entity) {
    if (!entity || !Camera.initialized) return;

    // 视口裁剪（精灵比碰撞盒大，增大裁剪范围）
    const maxDim = Math.max(entity.width || 32, entity.height || 32);
    if (!Camera.isInView(entity.x, entity.y, maxDim * 2)) return;

    const screen = Camera.worldToScreen(entity.x, entity.y);

    // 更新精灵帧计数
    SpriteRenderer.tick();

    // 委托给精灵渲染系统
    SpriteRenderer.drawEntity(ctx, entity, screen.x, screen.y);
  },

  /**
   * 绘制房间
   * @param {CanvasRenderingContext2D} ctx - 目标 context
   * @param {Object} room - 房间数据 { bounds, tiles, doors, type, cleared }
   */
  drawRoom(ctx, room) {
    if (!room || !Camera.initialized) return;

    const bounds = room.bounds;
    const tl = Camera.worldToScreen(bounds.left, bounds.top);
    const br = Camera.worldToScreen(bounds.right, bounds.bottom);
    const w = br.x - tl.x;
    const h = br.y - tl.y;

    ctx.save();

    // 地板
    ctx.fillStyle = '#0d0d22';
    ctx.fillRect(tl.x, tl.y, w, h);

    // 地板网格线（棋盘格效果）
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 64;
    const startWorldX = Math.ceil(bounds.left / gridSize) * gridSize;
    const startWorldY = Math.ceil(bounds.top / gridSize) * gridSize;

    for (let wx = startWorldX; wx < bounds.right; wx += gridSize) {
      const sx = Camera.worldToScreen(wx, 0).x;
      if (sx >= tl.x && sx <= br.x) {
        ctx.beginPath();
        ctx.moveTo(sx, tl.y);
        ctx.lineTo(sx, br.y);
        ctx.stroke();
      }
    }
    for (let wy = startWorldY; wy < bounds.bottom; wy += gridSize) {
      const sy = Camera.worldToScreen(0, wy).y;
      if (sy >= tl.y && sy <= br.y) {
        ctx.beginPath();
        ctx.moveTo(tl.x, sy);
        ctx.lineTo(br.x, sy);
        ctx.stroke();
      }
    }

    // 墙壁
    const wallThickness = 8;
    ctx.fillStyle = '#1a1a3a';
    // 上墙
    ctx.fillRect(tl.x, tl.y - wallThickness, w, wallThickness);
    // 下墙
    ctx.fillRect(tl.x, br.y, w, wallThickness);
    // 左墙
    ctx.fillRect(tl.x - wallThickness, tl.y - wallThickness, wallThickness, h + wallThickness * 2);
    // 右墙
    ctx.fillRect(br.x, tl.y - wallThickness, wallThickness, h + wallThickness * 2);

    // 墙壁发光边缘
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, w, h);

    // 绘制门
    if (room.doors) {
      for (let i = 0; i < room.doors.length; i++) {
        const door = room.doors[i];
        const doorScreen = Camera.worldToScreen(door.x, door.y);

        if (room.cleared) {
          // ── 已解锁门：脉冲发光 + 呼吸动画 ──
          const pulse = Math.sin(performance.now() * 0.004) * 0.3 + 0.7;
          const breathe = Math.sin(performance.now() * 0.003) * 2;

          // 外层光晕（大范围柔和发光）
          ctx.save();
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 20 * pulse;
          ctx.fillStyle = `rgba(168, 85, 247, ${0.2 * pulse})`;
          ctx.beginPath();
          ctx.arc(doorScreen.x, doorScreen.y + breathe, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();

          // 门体
          ctx.fillStyle = `rgba(107, 63, 160, ${0.7 + pulse * 0.3})`;
          ctx.fillRect(doorScreen.x - 16, doorScreen.y - 16 + breathe, 32, 32);

          // 内层发光
          ctx.save();
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 12;
          ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + pulse * 0.3})`;
          ctx.fillRect(doorScreen.x - 12, doorScreen.y - 12 + breathe, 24, 24);
          ctx.shadowBlur = 0;
          ctx.restore();

          // 门中心明亮核心
          ctx.fillStyle = `rgba(192, 132, 252, ${0.6 * pulse})`;
          ctx.fillRect(doorScreen.x - 6, doorScreen.y - 6 + breathe, 12, 12);

          // ── 方向箭头提示（向门方向的三角形） ──
          const arrowBob = Math.sin(performance.now() * 0.005) * 4;
          ctx.save();
          ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + pulse * 0.3})`;
          // 上箭头
          ctx.beginPath();
          ctx.moveTo(doorScreen.x, doorScreen.y - 26 + breathe - arrowBob);
          ctx.lineTo(doorScreen.x - 6, doorScreen.y - 20 + breathe - arrowBob);
          ctx.lineTo(doorScreen.x + 6, doorScreen.y - 20 + breathe - arrowBob);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          // ── 未解锁门：暗淡显示 ──
          ctx.fillStyle = '#333355';
          ctx.fillRect(doorScreen.x - 16, doorScreen.y - 16, 32, 32);
          // 微弱的锁定指示
          ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(doorScreen.x - 14, doorScreen.y - 14, 28, 28);
        }
      }
    }

    ctx.restore();
  },

  /**
   * 绘制小地图
   * @param {CanvasRenderingContext2D} ctx - 目标 context（通常是 HUD 层）
   * @param {Object} mapData - 地图数据 { rooms[], connections[], currentRoomId }
   * @param {number} x - 小地图左上角 X
   * @param {number} y - 小地图左上角 Y
   * @param {number} size - 小地图尺寸
   */
  drawMinimap(ctx, mapData, x, y, size) {
    if (!mapData || !mapData.rooms) return;

    ctx.save();

    // 小地图背景
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, size, size);
    ctx.strokeRect(x, y, size, size);

    const rooms = mapData.rooms;
    if (rooms.length === 0) { ctx.restore(); return; }

    // 计算缩放比
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (r.mapX < minX) minX = r.mapX;
      if (r.mapY < minY) minY = r.mapY;
      if (r.mapX > maxX) maxX = r.mapX;
      if (r.mapY > maxY) maxY = r.mapY;
    }
    const range = Math.max(maxX - minX, maxY - minY, 1);
    const scale = (size - 20) / range;
    const offsetX = x + 10;
    const offsetY = y + 10;

    // 绘制房间
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (!r.explored) continue;

      const rx = offsetX + (r.mapX - minX) * scale;
      const ry = offsetY + (r.mapY - minY) * scale;
      const rs = Math.max(8, scale * 0.6);

      if (r.id === mapData.currentRoomId) {
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 6;
      } else if (r.type === 'boss') {
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 0;
      } else if (r.type === 'shop') {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 0;
      } else if (r.cleared) {
        ctx.fillStyle = '#4ade80';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(rx - rs / 2, ry - rs / 2, rs, rs);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  /**
   * 过渡动画
   * @param {'fadeIn'|'fadeOut'} type - 过渡类型
   * @param {number} duration - 持续时间(秒)
   * @returns {Promise} 过渡完成的 Promise
   */
  transition(type, duration) {
    return new Promise(resolve => {
      _transitionActive = true;
      _transitionType = type;
      _transitionDuration = duration;
      _transitionElapsed = 0;
      _transitionResolve = resolve;
    });
  },

  /**
   * 更新过渡计时（由 engine._update 调用）
   * @param {number} dt
   */
  updateTransition(dt) {
    if (!_transitionActive) return;
    _transitionElapsed += dt;
    if (_transitionElapsed >= _transitionDuration) {
      _transitionActive = false;
      if (_transitionResolve) {
        _transitionResolve();
        _transitionResolve = null;
      }
    }
  },

  /** 响应式处理 */
  handleResize() {
    if (!_container) return;
    // CSS 控制缩放，Canvas 逻辑分辨率不变
    // 此处可选发送事件通知 UI 层调整
    EventBus.emit('renderer:resize', {
      containerWidth: _container.clientWidth,
      containerHeight: _container.clientHeight,
      logicWidth: _width,
      logicHeight: _height
    });
  },

  /** 标记背景需要重绘 */
  markBgDirty() {
    _bgDirty = true;
  },

  /** 获取各层 context */
  getContext(layer) {
    return _layers[layer] ? _layers[layer].ctx : null;
  },

  /** 获取逻辑分辨率 */
  get width() { return _width; },
  get height() { return _height; },
  get initialized() { return _initialized; },

  // ─── 内部方法 ───

  /** 绘制背景（星空+深渊底色） */
  _drawBackground() {
    const ctx = _layers.bg.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, _width, _height);

    // 深渊渐变底色
    const grad = ctx.createRadialGradient(
      _width / 2, _height / 2, 0,
      _width / 2, _height / 2, _width * 0.7
    );
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(0.5, '#050510');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, _width, _height);

    // 星空粒子（静态绘制到背景层）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 150; i++) {
      const sx = Math.random() * _width;
      const sy = Math.random() * _height;
      const sr = 0.5 + Math.random() * 1.5;
      const alpha = 0.1 + Math.random() * 0.4;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /** 绘制过渡遮罩 */
  _drawTransition() {
    const ctx = _layers.hud.ctx;
    if (!ctx) return;

    let alpha = 0;
    const progress = _transitionElapsed / _transitionDuration;

    if (_transitionType === 'fadeOut') {
      // 渐暗（黑幕渐入）
      alpha = Math.min(1, progress);
    } else {
      // 渐亮（黑幕渐出）
      alpha = Math.max(0, 1 - progress);
    }

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, _width, _height);
    ctx.restore();
  },

  /** 根据实体类型获取颜色 */
  _getEntityColor(entity) {
    switch (entity.type) {
      case 'player': return '#a855f7';
      case 'enemy': return '#ef4444';
      case 'elite': return '#fbbf24';
      case 'boss': return '#ff4444';
      case 'projectile': return '#60a5fa';
      case 'item': return '#4ade80';
      case 'npc': return '#38bdf8';
      default: return '#9ca3af';
    }
  }
};
