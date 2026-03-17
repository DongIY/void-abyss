/**
 * ═══════════════════════════════════════════════════════════════
 *  🖥️ Void Abyss — UIManager
 *  HUD(Canvas) / 菜单-弹窗(DOM) / 天赋卡片 / 背包 / Boss介绍 / 结算
 *  伤害浮字 + 浮动提示(Canvas, 对象池) / Combo 显示
 *  严格遵循 tech-architecture.md §4.10 接口契约
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { ObjectPool } from './utils.js';

// ─── 内部状态 ───
let _hudCtx = null;      // canvas-hud 的 2D context
let _uiContainer = null;  // DOM #ui-container
let _currentScreen = 'title';
let _initialized = false;

const W = 960, H = 640;

// ─── 伤害浮字对象池 ───
const _dmgPool = new ObjectPool(
  () => ({ x: 0, y: 0, value: 0, type: 'normal', color: '#fff', alpha: 1, scale: 1, vy: -60, life: 0, maxLife: 0.8 }),
  (o) => { o.alpha = 1; o.scale = 1; o.vy = -60; o.life = 0; o.maxLife = 0.8; },
  30
);
const _activeDmg = [];

// ─── 浮字提示对象池 ───
const _txtPool = new ObjectPool(
  () => ({ text: '', color: '#fff', x: 0, y: 0, alpha: 1, scale: 1, vy: -40, life: 0, maxLife: 1.0 }),
  (o) => { o.alpha = 1; o.scale = 1; o.vy = -40; o.life = 0; o.maxLife = 1.0; },
  20
);
const _activeTxt = [];

// ─── Combo 状态 ───
let _comboTier = '';
let _comboCount = 0;
let _comboAlpha = 0;
let _comboScale = 1;
let _comboTimer = 0;

// ─── 低血量效果 ───
let _lowHpActive = false;
let _lowHpPulse = 0;

// ─── HUD 缓存数据 ───
let _hud = {
  hp: 100, maxHp: 100,
  mp: 50, maxMp: 50,
  sta: 100, maxSta: 100,
  level: 1, exp: 0, expToNext: 15,
  layer: 1, roomInfo: '',
  gold: 0, kills: 0,
  combo: 0, comboTier: '',
  skills: [],
  potionCount: 0,
  fps: 60
};

// ─── 天赋选择数据 ───
let _talentChoices = null;
let _talentResolve = null;

// ─── Boss 介绍 ───
let _bossIntroResolve = null;

// ─── Combo 颜色映射 ───
const COMBO_COLORS = {
  'NICE':         '#e2e8f0',
  'GREAT':        '#4ade80',
  'AMAZING':      '#60a5fa',
  'LEGENDARY':    '#fbbf24',
  'VOID MASTER':  '#a855f7'
};

// ─── 伤害类型颜色映射 ───
const DMG_COLORS = {
  normal:    '#ffffff',
  crit:      '#fbbf24',
  heal:      '#4ade80',
  element:   '#a855f7',
  exp:       '#c084fc',
  gold:      '#fbbf24'
};

// ═══════════════════════════════════════
//  公开 API
// ═══════════════════════════════════════

export const UIManager = {

  /**
   * 初始化 UIManager
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas - canvas-hud 元素
   * @param {HTMLElement} config.uiContainer - #ui-container DOM
   */
  init(config = {}) {
    _hudCtx = config.canvas ? config.canvas.getContext('2d') : null;
    _uiContainer = config.uiContainer || document.getElementById('ui-container');

    if (!_hudCtx) {
      // 回退：尝试直接获取
      const c = document.getElementById('canvas-hud');
      if (c) _hudCtx = c.getContext('2d');
    }
    if (!_uiContainer) {
      _uiContainer = document.getElementById('ui-container');
    }

    _initialized = true;
    this._bindDOMEvents();
    this._subscribeEvents();
    this.showScreen('title');
    console.log('[UI] ✅ UIManager initialized');
  },

  // ─── 界面切换 ───

  /**
   * 切换显示界面
   * @param {string} screenId
   * @param {*} [data]
   */
  showScreen(screenId, data) {
    _currentScreen = screenId;

    // 隐藏所有 DOM 界面
    _hideAll();

    switch (screenId) {
      case 'title':
        _showEl('menu-main');
        break;
      case 'character_select':
        _showEl('menu-character');
        break;
      case 'game':
        // 所有 DOM 隐藏，Canvas HUD 接管
        break;
      case 'pause':
        _showEl('popup-pause');
        break;
      case 'inventory':
        this._renderInventory(data);
        _showEl('inventory-container');
        break;
      case 'talent_select':
        this._renderTalentSelect(data);
        _showEl('talent-select-container');
        break;
      case 'map':
        _showEl('map-overlay');
        break;
      case 'shop':
        this._renderShop(data);
        _showEl('shop-container');
        break;
      case 'death':
        this.showResultScreen(data || { outcome: 'death' });
        break;
      case 'victory':
        this.showResultScreen(data || { outcome: 'victory' });
        break;
      case 'boss_intro':
        _showEl('boss-intro-container');
        break;
      case 'meta_upgrade':
        this._renderMetaUpgrade(data);
        _showEl('meta-upgrade-container');
        break;
      default:
        break;
    }

    EventBus.emit('ui:screenChanged', { screenId });
  },

  // ─── Canvas HUD ───

  /**
   * 每帧更新 HUD 数据
   * @param {Object} hudData
   */
  updateHUD(hudData) {
    if (hudData) Object.assign(_hud, hudData);
  },

  // ─── 伤害浮字 ───

  /**
   * 显示伤害浮字
   * @param {Object} config - {x, y, value, type, color?}
   */
  showDamageNumber(config) {
    const d = _dmgPool.get();
    d.x = config.x || W / 2;
    d.y = config.y || H / 2;
    d.value = config.value || 0;
    d.type = config.type || 'normal';
    d.color = config.color || DMG_COLORS[d.type] || '#fff';
    d.alpha = 1;
    d.life = 0;
    d.vy = -60 - Math.random() * 20;
    // 暴击特殊效果
    if (d.type === 'crit') {
      d.scale = 1.6;
      d.maxLife = 1.0;
    } else {
      d.scale = 1.0;
      d.maxLife = 0.8;
    }
    // 随机 X 偏移
    d.x += (Math.random() - 0.5) * 30;
    _activeDmg.push(d);
  },

  // ─── 升级 ───

  /**
   * 升级特效 → 自动触发 talent_select
   * @param {number} newLevel
   * @param {Object} statGains
   */
  showLevelUp(newLevel, statGains) {
    // 全屏 "LEVEL UP!" 浮字
    this.showFloatingText('LEVEL UP!', '#fbbf24', W / 2, H / 2 - 40, 1.5, 1.8);
    // 天赋选择将由 talent:choiceReady 事件触发
  },

  // ─── Boss 登场 ───

  /**
   * Boss 登场过场（2s暗化+打字效果）
   * @param {Object} bossInfo - {name, title, element, layer}
   * @returns {Promise}
   */
  showBossIntro(bossInfo) {
    return new Promise((resolve) => {
      _bossIntroResolve = resolve;
      const container = document.getElementById('boss-intro-container');
      if (!container) { resolve(); return; }

      const nameEl = container.querySelector('.boss-name');
      const titleEl = container.querySelector('.boss-title');
      if (nameEl) nameEl.textContent = '';
      if (titleEl) titleEl.textContent = '';

      // 元素颜色
      const elemColors = {
        void: '#a855f7', fire: '#ef4444', ice: '#38bdf8', lightning: '#facc15'
      };
      const color = elemColors[bossInfo.element] || '#a855f7';
      if (nameEl) nameEl.style.color = color;

      this.showScreen('boss_intro');

      // 打字机效果 — Boss 名字
      const name = bossInfo.name || 'UNKNOWN';
      const title = bossInfo.title || '';
      let idx = 0;

      const typeTimer = setInterval(() => {
        if (idx < name.length) {
          if (nameEl) nameEl.textContent += name[idx];
          idx++;
        } else {
          clearInterval(typeTimer);
          // 显示称号
          if (titleEl) {
            titleEl.textContent = title;
            titleEl.classList.add('boss-title-reveal');
          }
        }
      }, 80);

      // 2秒后自动 resolve
      setTimeout(() => {
        this.showScreen('game');
        if (_bossIntroResolve) {
          _bossIntroResolve();
          _bossIntroResolve = null;
        }
      }, 2000);
    });
  },

  // ─── 浮字提示 ───

  /**
   * 显示浮字提示
   * @param {string} text
   * @param {string} color
   * @param {number} x
   * @param {number} y
   * @param {number} [duration=1.0]
   * @param {number} [scale=1.0]
   */
  showFloatingText(text, color, x, y, duration = 1.0, scale = 1.0) {
    const t = _txtPool.get();
    t.text = text;
    t.color = color || '#fff';
    t.x = x;
    t.y = y;
    t.alpha = 1;
    t.scale = scale;
    t.vy = -40;
    t.life = 0;
    t.maxLife = duration;
    _activeTxt.push(t);
  },

  // ─── 结算面板 ───

  /**
   * 显示结算面板
   * @param {Object} result - {outcome, shards, kills, maxCombo, layerReached, timeElapsed, unlocks}
   */
  showResultScreen(result) {
    const popup = document.getElementById('popup-result');
    const titleEl = document.getElementById('result-title');
    const statsEl = document.getElementById('result-stats');

    if (!popup) return;

    const isDeath = result.outcome === 'death';
    if (titleEl) {
      titleEl.textContent = isDeath ? '深渊坠落' : '✦ 深渊征服 ✦';
      titleEl.style.color = isDeath ? '#ef4444' : '#fbbf24';
    }

    if (statsEl) {
      const time = result.timeElapsed || 0;
      const min = Math.floor(time / 60);
      const sec = Math.floor(time % 60);
      statsEl.innerHTML = `
        <div class="result-row"><span>深渊碎片</span><span class="result-value gold">💎 ${result.shards || 0}</span></div>
        <div class="result-row"><span>击杀数</span><span class="result-value">💀 ${result.kills || 0}</span></div>
        <div class="result-row"><span>最大连击</span><span class="result-value">${result.maxCombo || 0}</span></div>
        <div class="result-row"><span>到达层数</span><span class="result-value">Layer ${result.layerReached || 1}</span></div>
        <div class="result-row"><span>存活时间</span><span class="result-value">⏱️ ${min}:${String(sec).padStart(2, '0')}</span></div>
        ${result.unlocks ? `<div class="result-row unlock"><span>🔓 解锁</span><span class="result-value">${result.unlocks}</span></div>` : ''}
      `;
    }

    _showEl('popup-result');
  },

  // ─── Combo ───

  /**
   * 显示 Combo 阶梯
   * @param {string} tier - NICE/GREAT/AMAZING/LEGENDARY/VOID MASTER
   * @param {number} count
   */
  showComboTier(tier, count) {
    _comboTier = tier;
    _comboCount = count;
    _comboAlpha = 1.0;
    _comboScale = 1.3;
    _comboTimer = 2.0;
    // 通知 fx.js 高 combo 震动
    if (count >= 30) {
      EventBus.emit('fx:comboShake', { tier, count });
    }
  },

  // ─── 每帧更新 ───

  /**
   * 每帧更新（由 engine 调用）
   * @param {number} dt
   */
  update(dt) {
    if (!_initialized || !_hudCtx) return;
    if (_currentScreen !== 'game' && _currentScreen !== 'playing') {
      // 非游戏画面时不绘制 HUD
      return;
    }

    const ctx = _hudCtx;

    // ── 绘制 HP/MP/STA 条 ──
    _drawBars(ctx);

    // ── 等级 + EXP ──
    _drawLevel(ctx);

    // ── 右上信息 ──
    _drawRightInfo(ctx);

    // ── 技能栏 ──
    _drawSkillBar(ctx);

    // ── Combo 显示 ──
    _drawCombo(ctx, dt);

    // ── 低血量脉动 ──
    if (_lowHpActive) {
      _lowHpPulse += dt * 3;
      const a = 0.1 + Math.sin(_lowHpPulse) * 0.08;
      ctx.save();
      ctx.fillStyle = `rgba(220, 38, 38, ${a})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ── 更新浮字 ──
    _updateDamageNumbers(ctx, dt);
    _updateFloatingTexts(ctx, dt);

    // ── FPS ──
    ctx.save();
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${_hud.fps || 60}`, 10, H - 10);
    ctx.restore();
  },

  // ═══ 内部方法 ═══

  /** 绑定 DOM 事件 */
  _bindDOMEvents() {
    // 开始按钮 → 角色选择
    _on('btn-start', 'click', () => {
      this.showScreen('character_select');
    });

    // 返回主菜单
    _on('btn-back-to-menu', 'click', () => {
      this.showScreen('title');
    });

    // 角色卡片点击
    document.querySelectorAll('.character-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('locked')) return;
        const charId = card.dataset.character;
        this.showScreen('game');
        EventBus.emit('game:characterSelected', { characterId: charId });
      });
    });

    // 暂停按钮
    _on('btn-resume', 'click', () => {
      this.showScreen('game');
      EventBus.emit('game:resume', {});
    });
    _on('btn-restart', 'click', () => {
      this.showScreen('game');
      EventBus.emit('game:restart', {});
    });
    _on('btn-quit', 'click', () => {
      this.showScreen('title');
      EventBus.emit('game:quit', {});
    });

    // 结算按钮
    _on('btn-retry', 'click', () => {
      EventBus.emit('game:restart', {});
    });
    _on('btn-result-menu', 'click', () => {
      this.showScreen('title');
    });

    // 操作说明
    _on('btn-how-to-play', 'click', () => {
      _showEl('popup-controls');
    });
    _on('btn-close-controls', 'click', () => {
      _hideEl('popup-controls');
    });

    // Meta 升级
    _on('btn-meta-upgrade', 'click', () => {
      EventBus.emit('meta:open', {});
    });
    _on('btn-back-from-meta', 'click', () => {
      this.showScreen('title');
    });

    // 移动端触控按钮
    this._initTouchControls();
  },

  /** 初始化移动端虚拟摇杆和按钮 */
  _initTouchControls() {
    // 检测触摸设备
    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const touchEl = document.getElementById('touch-controls');
    if (!isTouchDevice || !touchEl) return;
    touchEl.style.display = 'flex';

    const base = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');
    if (!base || !thumb) return;

    let _touching = false;
    let _centerX = 0, _centerY = 0;
    const maxRadius = 36;

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      _touching = true;
      const rect = base.getBoundingClientRect();
      _centerX = rect.left + rect.width / 2;
      _centerY = rect.top + rect.height / 2;
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!_touching) return;
      const touch = e.touches[0];
      let dx = touch.clientX - _centerX;
      let dy = touch.clientY - _centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
      // 发射虚拟输入
      EventBus.emit('touch:joystick', { x: dx / maxRadius, y: dy / maxRadius });
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!_touching) return;
      _touching = false;
      thumb.style.transform = 'translate(0,0)';
      EventBus.emit('touch:joystick', { x: 0, y: 0 });
    });

    // 动作按钮
    const btnMap = {
      'btn-touch-attack': 'touch:attack',
      'btn-touch-skill': 'touch:skill',
      'btn-touch-dodge': 'touch:dodge',
      'btn-touch-block': 'touch:block'
    };

    for (const [btnId, eventName] of Object.entries(btnMap)) {
      const btn = document.getElementById(btnId);
      if (!btn) continue;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        EventBus.emit(eventName, { pressed: true });
      }, { passive: false });
      btn.addEventListener('touchend', () => {
        EventBus.emit(eventName, { pressed: false });
      });
    }
  },

  /** 订阅 EventBus 事件 */
  _subscribeEvents() {
    EventBus.on('combat:hit', (data) => {
      if (!data || !data.result) return;
      const r = data.result;
      this.showDamageNumber({
        x: data.target ? data.target.x : W / 2,
        y: data.target ? data.target.y : H / 2,
        value: r.damage || 0,
        type: 'normal'
      });
    });

    EventBus.on('combat:crit', (data) => {
      this.showDamageNumber({
        x: data.target ? data.target.x : W / 2,
        y: data.target ? data.target.y : H / 2,
        value: data.damage || 0,
        type: 'crit'
      });
    });

    EventBus.on('combat:kill', (data) => {
      const v = data.victim || {};
      this.showFloatingText(`+${data.loot?.exp || 0} EXP`, '#c084fc', v.x || W / 2, (v.y || H / 2) - 20, 1.0, 1.0);
      this.showFloatingText(`+${data.loot?.gold || 0} G`, '#fbbf24', v.x || W / 2, (v.y || H / 2) - 40, 1.0, 0.9);
    });

    EventBus.on('combat:reaction', (data) => {
      const r = data.reaction || {};
      this.showFloatingText(
        r.displayName || r.name || 'REACTION',
        '#a855f7',
        data.position?.x || W / 2,
        data.position?.y || H / 2,
        1.2, 1.4
      );
    });

    EventBus.on('combat:comboTier', (data) => {
      this.showComboTier(data.tier, data.count);
    });

    EventBus.on('combat:block', () => {
      this.showFloatingText('BLOCK!', '#60a5fa', W / 2, H / 2 - 60, 0.8, 1.2);
    });

    EventBus.on('combat:perfectParry', (data) => {
      this.showFloatingText('PERFECT PARRY!', '#fbbf24', W / 2, H / 2 - 60, 1.2, 1.6);
    });

    EventBus.on('player:levelUp', (data) => {
      this.showLevelUp(data.newLevel, data.statGains);
    });

    EventBus.on('player:lowHP', (data) => {
      _lowHpActive = data.ratio < 0.3;
    });

    EventBus.on('player:statsChanged', (data) => {
      if (data && data.stats) {
        _hud.hp = data.stats.hp;
        _hud.maxHp = data.stats.maxHp;
        _hud.mp = data.stats.mp;
        _hud.maxMp = data.stats.maxMp;
        _hud.sta = data.stats.sta;
        _hud.maxSta = data.stats.maxSta;
      }
    });

    EventBus.on('item:acquired', (data) => {
      const item = data.itemData || {};
      const qualityColors = {
        common: '#9ca3af', uncommon: '#4ade80', rare: '#60a5fa',
        epic: '#a855f7', legendary: '#fbbf24'
      };
      this.showFloatingText(
        item.name || 'ITEM',
        qualityColors[item.quality] || '#9ca3af',
        W / 2, H / 2 - 30, 1.0, 1.1
      );
    });

    EventBus.on('item:synergy', (data) => {
      this.showFloatingText('SYNERGY!', '#fbbf24', W / 2, H / 2 - 50, 1.5, 1.6);
    });

    EventBus.on('talent:choiceReady', (data) => {
      _talentChoices = data.choices || [];
      this.showScreen('talent_select', _talentChoices);
    });

    EventBus.on('dungeon:roomEnter', (data) => {
      _hud.roomInfo = `Room ${data.roomId || '?'} [${data.roomType || 'normal'}]`;
    });

    EventBus.on('dungeon:roomCleared', () => {
      this.showFloatingText('ROOM CLEARED', '#4ade80', W / 2, H / 2 - 60, 1.5, 1.4);
    });

    EventBus.on('game:end', (data) => {
      const reason = data.reason || 'death';
      this.showScreen(reason, data.result);
    });
  },

  /** 渲染天赋选择卡片 */
  _renderTalentSelect(choices) {
    const container = document.getElementById('talent-select-container');
    if (!container) return;
    const cardsEl = container.querySelector('.talent-cards');
    if (!cardsEl) return;

    cardsEl.innerHTML = '';
    const c = choices || _talentChoices || [];

    const routeColors = {
      strength: '#ef4444', agility: '#4ade80', void: '#a855f7', universal: '#e2e8f0'
    };

    c.forEach((talent, i) => {
      const card = document.createElement('div');
      card.className = 'talent-card';
      card.style.borderColor = routeColors[talent.route] || '#a855f7';
      card.style.animationDelay = `${i * 0.1}s`;
      card.innerHTML = `
        <div class="talent-tier" style="color:${routeColors[talent.route] || '#a855f7'}">T${talent.tier || 1}</div>
        <div class="talent-name">${talent.name || '未知天赋'}</div>
        <div class="talent-desc">${talent.description || ''}</div>
        <div class="talent-route" style="color:${routeColors[talent.route] || '#a855f7'}">${talent.route || ''}</div>
      `;
      card.addEventListener('click', () => {
        EventBus.emit('talent:selected', { talentId: talent.talentId });
        this.showScreen('game');
        EventBus.emit('game:resume', {});
      });
      cardsEl.appendChild(card);
    });
  },

  /** 渲染背包界面 */
  _renderInventory(data) {
    const container = document.getElementById('inventory-container');
    if (!container) return;
    const gridEl = container.querySelector('.inventory-grid');
    const equipEl = container.querySelector('.equipment-slots');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    const inv = data || { items: [], maxSlots: 12, equipment: {}, activeSynergies: [] };

    for (let i = 0; i < (inv.maxSlots || 12); i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      const item = inv.items ? inv.items[i] : null;
      if (item) {
        const qualityColors = {
          common: '#9ca3af', uncommon: '#4ade80', rare: '#60a5fa',
          epic: '#a855f7', legendary: '#fbbf24'
        };
        slot.style.borderColor = qualityColors[item.quality] || '#9ca3af';
        slot.innerHTML = `<div class="inv-item-icon">${item.icon || '?'}</div><div class="inv-item-name">${item.name || ''}</div>`;
      }
      gridEl.appendChild(slot);
    }

    // 装备栏
    if (equipEl) {
      equipEl.innerHTML = '';
      const slots = ['weapon', 'armor', 'accessory1', 'accessory2'];
      slots.forEach(s => {
        const el = document.createElement('div');
        el.className = 'equip-slot';
        el.innerHTML = `<div class="equip-label">${s}</div>`;
        const eq = inv.equipment ? inv.equipment[s] : null;
        if (eq) {
          el.innerHTML += `<div class="equip-item">${eq.name || s}</div>`;
        }
        equipEl.appendChild(el);
      });
    }
  },

  /** 渲染商店 */
  _renderShop(data) {
    const container = document.getElementById('shop-container');
    if (!container) return;
    const itemsEl = container.querySelector('.shop-items');
    if (!itemsEl) return;

    itemsEl.innerHTML = '';
    const goods = (data && data.items) || [];
    goods.forEach(item => {
      const el = document.createElement('div');
      el.className = 'shop-item';
      el.innerHTML = `
        <div class="shop-item-name">${item.name || '?'}</div>
        <div class="shop-item-price">🪙 ${item.price || 0}</div>
      `;
      el.addEventListener('click', () => {
        EventBus.emit('shop:buy', { itemId: item.itemId });
      });
      itemsEl.appendChild(el);
    });
  },

  /** 渲染 Meta 升级面板 */
  _renderMetaUpgrade(data) {
    const grid = document.getElementById('meta-upgrade-grid');
    const shardEl = document.getElementById('meta-shard-count');
    const summaryEl = document.getElementById('meta-stats-summary');
    if (!grid) return;

    const progress = data || {};
    const shards = progress.totalShards || 0;
    const upgrades = progress.permanentUpgrades || {};

    if (shardEl) shardEl.textContent = shards;

    const UPGRADE_DEFS = [
      { id: 'hp_boost', name: '生命强化', icon: '❤️', maxLv: 10, baseCost: 10, costScale: 1.5, effect: '+5% 最大生命', perLevel: '+5%' },
      { id: 'atk_boost', name: '力量强化', icon: '⚔️', maxLv: 10, baseCost: 10, costScale: 1.5, effect: '+3 基础攻击力', perLevel: '+3' },
      { id: 'def_boost', name: '护甲强化', icon: '🛡️', maxLv: 10, baseCost: 10, costScale: 1.5, effect: '+2 基础防御力', perLevel: '+2' },
      { id: 'crit_boost', name: '暴击强化', icon: '💥', maxLv: 5, baseCost: 20, costScale: 2, effect: '+2% 暴击率', perLevel: '+2%' },
      { id: 'luck_boost', name: '幸运强化', icon: '🍀', maxLv: 5, baseCost: 25, costScale: 2, effect: '掉落品质提升', perLevel: '+等级' },
      { id: 'sta_boost', name: '耐力强化', icon: '⚡', maxLv: 5, baseCost: 15, costScale: 1.5, effect: '+10 最大耐力', perLevel: '+10' }
    ];

    grid.innerHTML = '';
    UPGRADE_DEFS.forEach(def => {
      const currentLv = upgrades[def.id] || 0;
      const isMaxed = currentLv >= def.maxLv;
      const cost = isMaxed ? 0 : Math.floor(def.baseCost * Math.pow(def.costScale, currentLv));
      const canAfford = shards >= cost;

      const card = document.createElement('div');
      card.className = `meta-upgrade-card${isMaxed ? ' maxed' : ''}`;
      card.innerHTML = `
        <div class="meta-upgrade-icon">${def.icon}</div>
        <div class="meta-upgrade-name">${def.name}</div>
        <div class="meta-upgrade-level">Lv.${currentLv} / ${def.maxLv}</div>
        <div class="meta-upgrade-effect">${def.effect}</div>
        ${isMaxed ? '<div class="meta-upgrade-cost" style="color:#4ade80;border-color:rgba(74,222,128,0.3);">MAX</div>' :
          `<div class="meta-upgrade-cost${canAfford ? '' : ' insufficient'}">💎 ${cost}</div>`
        }
      `;

      if (!isMaxed) {
        card.addEventListener('click', () => {
          if (!canAfford) return;
          EventBus.emit('meta:purchase', { upgradeId: def.id, cost });
        });
      }

      grid.appendChild(card);
    });

    // 统计概要
    if (summaryEl) {
      const totalRuns = progress.totalRuns || 0;
      const bestLayer = progress.bestLayer || 0;
      const totalKills = progress.totalKills || 0;
      summaryEl.innerHTML = `
        <span class="stat-label">总冒险次数:</span> ${totalRuns} &nbsp;&nbsp;
        <span class="stat-label">最深层:</span> Layer ${bestLayer} &nbsp;&nbsp;
        <span class="stat-label">总击杀:</span> ${totalKills}
      `;
    }
  }
};

// ═══════════════════════════════════════
//  私有绘制函数
// ═══════════════════════════════════════

function _drawBars(ctx) {
  const barX = 12, barY = 12, barW = 180, barH = 16, gap = 4;

  ctx.save();
  ctx.font = 'bold 11px monospace';

  // HP
  const hpRatio = Math.max(0, _hud.hp / (_hud.maxHp || 1));
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = hpRatio > 0.3 ? '#ef4444' : '#dc2626';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.ceil(_hud.hp)}/${_hud.maxHp}`, barX + 4, barY + 12);

  // MP
  const mpY = barY + barH + gap;
  const mpRatio = Math.max(0, _hud.mp / (_hud.maxMp || 1));
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(barX, mpY, barW, barH);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(barX, mpY, barW * mpRatio, barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(barX, mpY, barW, barH);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`MP ${Math.ceil(_hud.mp)}/${_hud.maxMp}`, barX + 4, mpY + 12);

  // STA (小条)
  const staY = mpY + barH + gap;
  const staW = barW * 0.6;
  const staH = barH * 0.65;
  const staRatio = Math.max(0, _hud.sta / (_hud.maxSta || 1));
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(barX, staY, staW, staH);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(barX, staY, staW * staRatio, staH);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.strokeRect(barX, staY, staW, staH);

  ctx.restore();
}

function _drawLevel(ctx) {
  const lvX = 12, lvY = 72;
  ctx.save();
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'left';
  ctx.fillText(`LV.${_hud.level}`, lvX, lvY);

  // EXP 进度条
  const expRatio = _hud.expToNext > 0 ? Math.min(1, _hud.exp / _hud.expToNext) : 0;
  const expX = lvX + 52, expW = 120, expH = 6;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(expX, lvY - 9, expW, expH);
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(expX, lvY - 9, expW * expRatio, expH);
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
  ctx.strokeRect(expX, lvY - 9, expW, expH);

  ctx.restore();
}

function _drawRightInfo(ctx) {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px monospace';

  // Layer
  ctx.fillStyle = '#c084fc';
  ctx.fillText(`Layer ${_hud.layer}`, W - 14, 22);

  // Room
  ctx.font = '11px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(_hud.roomInfo || '', W - 14, 38);

  // Gold
  ctx.font = '13px monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`🪙 ${_hud.gold}`, W - 14, 56);

  // Kills
  ctx.fillStyle = '#ef4444';
  ctx.fillText(`💀 ${_hud.kills}`, W - 14, 74);

  ctx.restore();
}

function _drawSkillBar(ctx) {
  const barW = 280, barH = 40;
  const bx = (W - barW) / 2, by = H - barH - 10;
  const slotW = 60, slotH = 36, gap = 8;
  const keys = ['Q', 'J', 'K', 'L'];
  const labels = ['道具', '攻击', '技能1', '技能2'];

  ctx.save();
  ctx.textAlign = 'center';

  for (let i = 0; i < 4; i++) {
    const sx = bx + i * (slotW + gap);
    const sy = by;

    // 背景
    ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
    ctx.fillRect(sx, sy, slotW, slotH);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.strokeRect(sx, sy, slotW, slotH);

    // 按键提示
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#a855f7';
    ctx.fillText(keys[i], sx + slotW / 2, sy + 13);

    // 名称
    ctx.font = '9px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(labels[i], sx + slotW / 2, sy + 28);
  }

  ctx.restore();
}

function _drawCombo(ctx, dt) {
  if (_comboTimer <= 0 || _comboCount === 0) return;

  _comboTimer -= dt;
  _comboAlpha = Math.min(1, _comboTimer / 0.5);
  _comboScale = 1 + Math.max(0, (_comboScale - 1) * 0.92); // 缓动回 1

  ctx.save();
  ctx.globalAlpha = _comboAlpha;
  ctx.textAlign = 'right';

  // Combo 数字
  ctx.font = `bold ${Math.floor(28 * _comboScale)}px monospace`;
  ctx.fillStyle = COMBO_COLORS[_comboTier] || '#e2e8f0';
  ctx.fillText(`${_comboCount}`, W - 20, H / 2 + 20);

  // Combo 阶梯文字
  if (_comboTier) {
    ctx.font = `bold ${Math.floor(16 * _comboScale)}px monospace`;
    ctx.fillText(_comboTier, W - 20, H / 2 + 44);

    // 发光效果
    ctx.shadowColor = COMBO_COLORS[_comboTier] || '#a855f7';
    ctx.shadowBlur = 12;
    ctx.fillText(_comboTier, W - 20, H / 2 + 44);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function _updateDamageNumbers(ctx, dt) {
  ctx.save();
  ctx.textAlign = 'center';

  for (let i = _activeDmg.length - 1; i >= 0; i--) {
    const d = _activeDmg[i];
    d.life += dt;
    d.y += d.vy * dt;
    d.vy *= 0.96; // 减速
    d.alpha = 1 - (d.life / d.maxLife);

    // 暴击缩放渐回
    if (d.type === 'crit') {
      d.scale = 1.0 + 0.6 * Math.max(0, 1 - d.life * 3);
    }

    if (d.life >= d.maxLife) {
      _activeDmg.splice(i, 1);
      _dmgPool.release(d);
      continue;
    }

    ctx.globalAlpha = Math.max(0, d.alpha);
    const fontSize = Math.floor(14 * d.scale);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = d.color;

    // 描边
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeText(String(Math.round(d.value)), d.x, d.y);
    ctx.fillText(String(Math.round(d.value)), d.x, d.y);
  }

  ctx.restore();
}

function _updateFloatingTexts(ctx, dt) {
  ctx.save();
  ctx.textAlign = 'center';

  for (let i = _activeTxt.length - 1; i >= 0; i--) {
    const t = _activeTxt[i];
    t.life += dt;
    t.y += t.vy * dt;
    t.vy *= 0.95;
    t.alpha = 1 - (t.life / t.maxLife);
    t.scale = Math.max(t.scale * 0.995, 0.8);

    if (t.life >= t.maxLife) {
      _activeTxt.splice(i, 1);
      _txtPool.release(t);
      continue;
    }

    ctx.globalAlpha = Math.max(0, t.alpha);
    const fontSize = Math.floor(18 * t.scale);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = t.color;

    // 描边
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
  }

  ctx.restore();
}

// ═══════════════════════════════════════
//  DOM 工具
// ═══════════════════════════════════════

/** 所有可隐藏的 DOM 面板 ID */
const _SCREEN_IDS = [
  'menu-main', 'menu-character', 'popup-pause', 'popup-controls',
  'popup-result', 'talent-select-container', 'inventory-container',
  'boss-intro-container', 'shop-container', 'map-overlay',
  'meta-upgrade-container'
];

function _hideAll() {
  _SCREEN_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function _showEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function _hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function _on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}
