/**
 * ═══════════════════════════════════════════════════════════════
 *  🎮 Void Abyss — Entity Manager
 *  Player / Enemy / Projectile 生命周期管理
 *  玩家状态机: idle→moving→attacking→dodging→blocking→hurt→dead
 *  闪避: Space 0.3s 无敌帧 1.5s 冷却 25 STA
 *  格挡: Shift 持续 消耗 STA 完美格挡窗口 0.2s
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { generateId, clamp, distance, normalize } from './utils.js';
import { expToNextLevel, LEVEL_UP_GAINS } from './data/levels.js';

// ─── 常量 ───
const DODGE_DURATION = 0.3;         // 闪避持续时间（秒）
const DODGE_COOLDOWN = 1.5;         // 闪避冷却
const DODGE_STA_COST = 25;          // 闪避耐力消耗
const DODGE_SPEED_MULT = 3.0;       // 闪避移动速度倍率
const BLOCK_STA_DRAIN = 15;         // 格挡每秒耐力消耗
const PERFECT_BLOCK_WINDOW = 0.2;   // 完美格挡窗口（秒）
const STA_REGEN_RATE = 15;          // 耐力回复/秒
const MP_REGEN_RATE = 2;            // MP 回复/秒
const IFRAME_DURATION = 0.5;        // 受伤后无敌帧（秒）
const ATTACK_DURATION = 0.3;        // 攻击动画时长
const HURT_DURATION = 0.2;          // 受伤硬直时长

// ─── 内部状态 ───
let _entities = [];     // 所有实体
let _player = null;     // 玩家引用
let _nextId = 0;

// ─── 角色基础属性表 ───
const CHARACTER_BASES = {
  voidwalker: {
    hp: 90, maxHp: 90, mp: 70, maxMp: 70, sta: 100, maxSta: 100,
    atk: 8, def: 4, crit: 0.05, critDmg: 1.5, spd: 200, aspd: 0.6, elem: 15,
    element: 'void', width: 24, height: 24
  },
  abyssal_knight: {
    hp: 130, maxHp: 130, mp: 30, maxMp: 30, sta: 120, maxSta: 120,
    atk: 13, def: 8, crit: 0.05, critDmg: 1.5, spd: 180, aspd: 0.6, elem: 0,
    element: 'none', width: 28, height: 28
  },
  shadow_hunter: {
    hp: 80, maxHp: 80, mp: 50, maxMp: 50, sta: 100, maxSta: 100,
    atk: 11, def: 3, crit: 0.15, critDmg: 1.5, spd: 220, aspd: 0.5, elem: 0,
    element: 'none', width: 22, height: 22
  }
};

// ─── 敌人基础属性（第1层基准） ───
const ENEMY_BASES = {
  void_wisp: {
    hp: 20, atk: 4, def: 1, spd: 120,
    width: 18, height: 18, colliderType: 'circle', radius: 9,
    expReward: 5, goldReward: [1, 3],
    element: 'void'
  },
  rift_bat: {
    hp: 15, atk: 6, def: 0, spd: 250,
    width: 16, height: 16, colliderType: 'circle', radius: 8,
    expReward: 6, goldReward: [2, 4],
    element: null
  },
  abyss_spider: {
    hp: 30, atk: 5, def: 3, spd: 80,
    width: 24, height: 24, colliderType: 'aabb', radius: 12,
    expReward: 8, goldReward: [2, 5],
    element: null
  },
  shadow_sentinel: {
    hp: 45, atk: 8, def: 5, spd: 130,
    width: 26, height: 26, colliderType: 'aabb', radius: 13,
    expReward: 12, goldReward: [3, 6],
    element: null
  },
  crystal_golem: {
    hp: 60, atk: 7, def: 8, spd: 60,
    width: 32, height: 32, colliderType: 'aabb', radius: 16,
    expReward: 15, goldReward: [4, 8],
    element: 'ice'
  },
  void_mage: {
    hp: 35, atk: 10, def: 2, spd: 100,
    width: 22, height: 22, colliderType: 'circle', radius: 11,
    expReward: 14, goldReward: [4, 7],
    element: 'void'
  },
  flame_wraith: {
    hp: 40, atk: 9, def: 3, spd: 140,
    width: 22, height: 22, colliderType: 'circle', radius: 11,
    expReward: 13, goldReward: [3, 7],
    element: 'fire'
  },
  ice_construct: {
    hp: 55, atk: 7, def: 6, spd: 70,
    width: 28, height: 28, colliderType: 'aabb', radius: 14,
    expReward: 14, goldReward: [4, 8],
    element: 'ice'
  },
  thunder_elemental: {
    hp: 38, atk: 11, def: 2, spd: 180,
    width: 20, height: 20, colliderType: 'circle', radius: 10,
    expReward: 15, goldReward: [4, 8],
    element: 'lightning'
  },
  chrono_shifter: {
    hp: 50, atk: 9, def: 4, spd: 160,
    width: 24, height: 24, colliderType: 'circle', radius: 12,
    expReward: 18, goldReward: [5, 10],
    element: 'void'
  },
  abyss_knight: {
    hp: 70, atk: 12, def: 7, spd: 110,
    width: 30, height: 30, colliderType: 'aabb', radius: 15,
    expReward: 22, goldReward: [6, 12],
    element: null
  },
  void_horror: {
    hp: 80, atk: 14, def: 5, spd: 90,
    width: 36, height: 36, colliderType: 'aabb', radius: 18,
    expReward: 25, goldReward: [8, 15],
    element: 'void'
  },
  reality_breaker: {
    hp: 65, atk: 13, def: 3, spd: 150,
    width: 24, height: 24, colliderType: 'circle', radius: 12,
    expReward: 20, goldReward: [6, 12],
    element: 'lightning'
  },
  doom_herald: {
    hp: 90, atk: 15, def: 6, spd: 100,
    width: 32, height: 32, colliderType: 'aabb', radius: 16,
    expReward: 28, goldReward: [8, 15],
    element: 'fire'
  },
  // Boss 数据
  boss_euler: {
    hp: 400, atk: 18, def: 12, spd: 110,
    width: 48, height: 48, colliderType: 'aabb', radius: 24,
    expReward: 100, goldReward: [30, 50],
    element: null,
    bossName: '星尘守卫·欧拉',
    bossNameEN: 'Stardust Guardian — Euler'
  },
  boss_prism: {
    hp: 600, atk: 22, def: 10, spd: 90,
    width: 44, height: 44, colliderType: 'circle', radius: 22,
    expReward: 150, goldReward: [50, 80],
    element: 'ice',
    bossName: '暗物质结晶体·普利兹',
    bossNameEN: 'Dark Matter Prism'
  },
  boss_nyx: {
    hp: 800, atk: 26, def: 14, spd: 130,
    width: 48, height: 48, colliderType: 'circle', radius: 24,
    expReward: 200, goldReward: [80, 120],
    element: 'void',
    bossName: '虚空撕裂者·尼克斯',
    bossNameEN: 'Void Ripper — Nyx'
  },
  boss_chronos: {
    hp: 1200, atk: 30, def: 18, spd: 100,
    width: 56, height: 56, colliderType: 'aabb', radius: 28,
    expReward: 300, goldReward: [120, 180],
    element: 'lightning',
    bossName: '时空领主·克罗诺斯',
    bossNameEN: 'Chrono Lord — Chronos'
  },
  boss_ophelia: {
    hp: 2000, atk: 35, def: 20, spd: 120,
    width: 64, height: 64, colliderType: 'circle', radius: 32,
    expReward: 500, goldReward: [200, 300],
    element: 'void',
    bossName: '深渊之心·虚无（奥菲利亚）',
    bossNameEN: 'Heart of Void — Ophelia'
  }
};

export const EntityManager = {
  /**
   * 重置实体系统
   */
  reset() {
    _entities = [];
    _player = null;
    _nextId = 0;
  },

  /**
   * 创建玩家
   * @param {Object} config
   * @param {string} config.characterId - 角色 ID
   * @param {number} config.x - 初始 X
   * @param {number} config.y - 初始 Y
   * @param {Object} [config.metaUpgrades] - 跨局升级
   * @returns {Object} PlayerEntity
   */
  createPlayer(config) {
    const base = CHARACTER_BASES[config.characterId] || CHARACTER_BASES.voidwalker;

    const player = {
      id: generateId('player'),
      type: 'player',
      x: config.x || 480,
      y: config.y || 320,
      width: base.width,
      height: base.height,
      colliderType: 'aabb',
      radius: base.width / 2,
      alive: true,
      facing: 0,
      characterId: config.characterId || 'voidwalker',
      state: 'idle',      // idle|moving|attacking|dodging|blocking|hurt|dead
      stateTimer: 0,

      stats: {
        hp: base.hp,
        maxHp: base.maxHp,
        mp: base.mp,
        maxMp: base.maxMp,
        sta: base.sta,
        maxSta: base.maxSta,
        atk: base.atk,
        def: base.def,
        crit: base.crit,
        critDmg: base.critDmg,
        spd: base.spd,
        aspd: base.aspd,
        elem: base.elem
      },

      element: base.element,
      level: 1,
      exp: 0,
      expToNext: expToNextLevel(1),
      gold: 0,
      kills: 0,

      // 战斗状态
      iFrames: 0,
      flashTimer: 0,
      attackCooldown: 0,
      dodgeCooldown: 0,
      dodgeDir: { x: 0, y: 0 },
      blockTimer: 0,         // 格挡持续时间（用于完美格挡窗口）
      _shield: 0,            // 护盾值

      // 天赋/被动标记
      _berserkerActive: false,
      _titanMight: false,
      _rapidFire: false,
      _noDodgeCooldown: false,
      _deathDance: false,
      _bladeStorm: false,
      _dodgeCritBoost: 0,
      _blockCostReduction: 0,
      _cheatDeath: false,
      _armorPen: 0,

      // 装备/天赋/buff
      inventory: [],
      talents: [],
      buffs: [],
      equipment: { weapon: null, armor: null, accessory1: null, accessory2: null }
    };

    // 应用跨局升级
    if (config.metaUpgrades) {
      for (const [key, level] of Object.entries(config.metaUpgrades)) {
        switch (key) {
          case 'hp': player.stats.maxHp += level * 5; player.stats.hp = player.stats.maxHp; break;
          case 'atk': player.stats.atk += level; break;
          case 'def': player.stats.def += level; break;
          case 'crit': player.stats.crit += level * 0.01; break;
        }
      }
    }

    _entities.push(player);
    _player = player;

    EventBus.emit('entity:playerCreated', { player });
    return player;
  },

  /**
   * 创建敌人
   * @param {Object} config
   * @param {string} config.enemyId - 敌人类型 ID
   * @param {number} config.x - 位置 X
   * @param {number} config.y - 位置 Y
   * @param {number} config.layer - 当前层级
   * @param {boolean} [config.isElite=false]
   * @param {boolean} [config.isBoss=false]
   * @returns {Object} EnemyEntity
   */
  createEnemy(config) {
    const base = ENEMY_BASES[config.enemyId];
    if (!base) {
      console.warn(`[Entity] Unknown enemy type: ${config.enemyId}`);
      return null;
    }

    const layerMult = [1.0, 1.5, 2.0, 2.6, 3.2][(config.layer || 1) - 1] || 1.0;
    const eliteMult = config.isElite ? 2.5 : 1.0;
    const bossMult = config.isBoss ? 1.0 : 1.0; // Boss 数据已含完整数值

    const enemy = {
      id: generateId('enemy'),
      type: config.isBoss ? 'boss' : (config.isElite ? 'elite' : 'enemy'),
      enemyId: config.enemyId,
      x: config.x,
      y: config.y,
      width: base.width * (config.isBoss ? 1 : (config.isElite ? 1.3 : 1)),
      height: base.height * (config.isBoss ? 1 : (config.isElite ? 1.3 : 1)),
      colliderType: base.colliderType,
      radius: base.radius * (config.isBoss ? 1 : (config.isElite ? 1.3 : 1)),
      alive: true,
      facing: Math.random() * Math.PI * 2,

      stats: {
        hp: Math.floor(base.hp * layerMult * eliteMult),
        maxHp: Math.floor(base.hp * layerMult * eliteMult),
        atk: Math.floor(base.atk * layerMult * eliteMult),
        def: Math.floor(base.def * layerMult * (config.isElite ? 1.5 : 1)),
        spd: base.spd
      },

      element: base.element,
      isElite: !!config.isElite,
      isBoss: !!config.isBoss,
      bossPhase: config.isBoss ? 1 : 0,
      bossName: base.bossName || null,

      // AI 状态
      aiState: 'idle',   // idle|patrol|chase|attack|flee
      aiTimer: 0,
      aiTargetX: 0,
      aiTargetY: 0,

      // 掉落
      expReward: Math.floor(base.expReward * layerMult),
      goldReward: base.goldReward,

      // 战斗
      iFrames: 0,
      flashTimer: 0,
      attackCooldown: 0
    };

    _entities.push(enemy);
    EventBus.emit('entity:enemyCreated', { enemy });
    return enemy;
  },

  /**
   * 每帧更新所有实体
   * @param {number} dt - 帧间隔(秒)
   */
  update(dt) {
    for (let i = _entities.length - 1; i >= 0; i--) {
      const entity = _entities[i];
      if (!entity.alive) continue;

      // 更新通用计时器
      if (entity.iFrames > 0) entity.iFrames -= dt;
      if (entity.flashTimer > 0) entity.flashTimer -= dt;
      if (entity.attackCooldown > 0) entity.attackCooldown -= dt;

      // 类型特定更新
      if (entity.type === 'player') {
        this._updatePlayer(entity, dt);
      } else if (entity.type === 'projectile') {
        this._updateProjectile(entity, dt);
      }
      // 敌人 AI 由 AIController 单独更新
    }
  },

  /**
   * 范围查询
   * @param {number} cx - 中心 X
   * @param {number} cy - 中心 Y
   * @param {number} radius - 半径
   * @param {Object} [filter] - 过滤器 {type?, alive?}
   * @returns {Object[]} 范围内的实体
   */
  getEntitiesInRange(cx, cy, radius, filter = {}) {
    const results = [];
    const rSq = radius * radius;
    const filterAlive = filter.alive !== undefined ? filter.alive : true;

    for (const entity of _entities) {
      if (filterAlive && !entity.alive) continue;
      if (filter.type && entity.type !== filter.type) continue;

      const dx = entity.x - cx;
      const dy = entity.y - cy;
      if (dx * dx + dy * dy <= rSq) {
        results.push(entity);
      }
    }

    return results;
  },

  /**
   * 获取玩家引用
   * @returns {Object|null}
   */
  getPlayer() {
    return _player;
  },

  /**
   * 创建投射物
   * @param {Object} config
   * @returns {Object} ProjectileEntity
   */
  createProjectile(config) {
    const proj = {
      id: generateId('proj'),
      type: 'projectile',
      x: config.x,
      y: config.y,
      width: config.width || 8,
      height: config.height || 8,
      colliderType: 'circle',
      radius: config.radius || 4,
      alive: true,
      facing: Math.atan2(config.dy, config.dx),

      dx: config.dx,
      dy: config.dy,
      speed: config.speed || 300,
      damage: config.damage || 5,
      owner: config.owner,       // 发射者 ID
      ownerType: config.ownerType || 'player',
      element: config.element || null,
      lifetime: config.lifetime || 3.0,
      _age: 0,
      piercing: config.piercing || false
    };

    _entities.push(proj);
    return proj;
  },

  /**
   * 存活敌人数量
   * @returns {number}
   */
  getAliveEnemyCount() {
    let count = 0;
    for (const e of _entities) {
      if ((e.type === 'enemy' || e.type === 'elite' || e.type === 'boss') && e.alive) {
        count++;
      }
    }
    return count;
  },

  /**
   * 移除实体
   * @param {string} entityId
   */
  removeEntity(entityId) {
    const idx = _entities.findIndex(e => e.id === entityId);
    if (idx !== -1) {
      const entity = _entities[idx];
      entity.alive = false;
      _entities.splice(idx, 1);
      EventBus.emit('entity:removed', { entityId });
    }
  },

  /**
   * 获取所有活跃实体
   * @returns {Object[]}
   */
  getAllEntities() {
    return _entities;
  },

  /**
   * 获取所有存活敌人
   * @returns {Object[]}
   */
  getAliveEnemies() {
    return _entities.filter(e =>
      (e.type === 'enemy' || e.type === 'elite' || e.type === 'boss') && e.alive
    );
  },

  /**
   * 为玩家增加经验值
   * @param {number} exp - 经验值
   */
  addPlayerExp(exp) {
    if (!_player || !_player.alive) return;

    _player.exp += exp;

    // 升级检测
    while (_player.exp >= _player.expToNext) {
      _player.exp -= _player.expToNext;
      _player.level++;

      // 属性增长
      _player.stats.maxHp += LEVEL_UP_GAINS.hp;
      _player.stats.hp = Math.min(_player.stats.hp + LEVEL_UP_GAINS.hp, _player.stats.maxHp);
      _player.stats.maxMp += LEVEL_UP_GAINS.mp;
      _player.stats.mp = Math.min(_player.stats.mp + LEVEL_UP_GAINS.mp, _player.stats.maxMp);
      _player.stats.atk += LEVEL_UP_GAINS.atk;
      _player.stats.def += LEVEL_UP_GAINS.def;
      _player.expToNext = expToNextLevel(_player.level);

      EventBus.emit('player:levelUp', {
        newLevel: _player.level,
        statGains: { ...LEVEL_UP_GAINS }
      });

      console.log(`[Entity] Player leveled up to ${_player.level}!`);
    }
  },

  // ─── 内部方法 ───

  /** 更新玩家状态 */
  _updatePlayer(player, dt) {
    // 状态机计时器
    if (player.stateTimer > 0) {
      player.stateTimer -= dt;
    }

    // 闪避冷却
    if (player.dodgeCooldown > 0) {
      player.dodgeCooldown -= dt;
    }

    // 状态机处理
    switch (player.state) {
      case 'idle':
      case 'moving':
        // 耐力回复
        if (player.stats.sta < player.stats.maxSta) {
          player.stats.sta = Math.min(player.stats.maxSta,
            player.stats.sta + STA_REGEN_RATE * dt);
        }
        // MP 回复
        if (player.stats.mp < player.stats.maxMp) {
          player.stats.mp = Math.min(player.stats.maxMp,
            player.stats.mp + MP_REGEN_RATE * dt);
        }
        break;

      case 'attacking':
        if (player.stateTimer <= 0) {
          player.state = 'idle';
        }
        break;

      case 'dodging':
        // 闪避移动
        if (player.stateTimer > 0) {
          const dodgeSpd = player.stats.spd * DODGE_SPEED_MULT * dt;
          player.x += player.dodgeDir.x * dodgeSpd;
          player.y += player.dodgeDir.y * dodgeSpd;
          player.iFrames = DODGE_DURATION; // 保持无敌
        } else {
          player.state = 'idle';
        }
        break;

      case 'blocking':
        // 格挡持续耐力消耗
        player.blockTimer += dt;
        let drainRate = BLOCK_STA_DRAIN;
        if (player._blockCostReduction) {
          drainRate *= (1 - player._blockCostReduction);
        }
        player.stats.sta -= drainRate * dt;
        if (player.stats.sta <= 0) {
          player.stats.sta = 0;
          player.state = 'idle';
          player.blockTimer = 0;
        }
        break;

      case 'hurt':
        if (player.stateTimer <= 0) {
          player.state = 'idle';
        }
        break;

      case 'dead':
        // 死亡状态不更新
        break;
    }

    // Buff 计时
    for (let i = player.buffs.length - 1; i >= 0; i--) {
      player.buffs[i].remaining -= dt;
      if (player.buffs[i].remaining <= 0) {
        player.buffs.splice(i, 1);
      }
    }
  },

  /** 更新投射物 */
  _updateProjectile(proj, dt) {
    proj._age += dt;

    // 超时销毁
    if (proj._age >= proj.lifetime) {
      proj.alive = false;
      return;
    }

    // 移动
    proj.x += proj.dx * proj.speed * dt;
    proj.y += proj.dy * proj.speed * dt;
  },

  // ─── 玩家动作 API（由 Engine 输入处理调用） ───

  /**
   * 玩家发起攻击
   * @returns {boolean} 是否成功发起
   */
  playerAttack() {
    if (!_player || !_player.alive) return false;
    if (_player.state === 'dodging' || _player.state === 'hurt' || _player.state === 'dead') return false;
    if (_player.attackCooldown > 0) return false;

    _player.state = 'attacking';
    let aspd = _player.stats.aspd;
    if (_player._rapidFire) aspd *= 0.85;
    _player.stateTimer = ATTACK_DURATION;
    _player.attackCooldown = aspd;

    return true;
  },

  /**
   * 玩家闪避
   * @param {number} dx - 闪避方向 X
   * @param {number} dy - 闪避方向 Y
   * @returns {boolean}
   */
  playerDodge(dx, dy) {
    if (!_player || !_player.alive) return false;
    if (_player.state === 'dodging' || _player.state === 'dead') return false;

    // 冷却检查（暗影大师跳过冷却）
    if (!_player._noDodgeCooldown && _player.dodgeCooldown > 0) return false;

    // 耐力检查
    if (_player.stats.sta < DODGE_STA_COST) return false;

    _player.stats.sta -= DODGE_STA_COST;
    _player.state = 'dodging';
    _player.stateTimer = DODGE_DURATION;
    _player.dodgeCooldown = DODGE_COOLDOWN;
    _player.iFrames = DODGE_DURATION;

    // 闪避方向（默认使用面朝方向）
    if (dx === 0 && dy === 0) {
      dx = Math.cos(_player.facing);
      dy = Math.sin(_player.facing);
    }
    const dir = normalize(dx, dy);
    _player.dodgeDir = dir;

    // 触发闪避相关被动
    EventBus.emit('player:dodge', { player: _player });

    return true;
  },

  /**
   * 玩家开始格挡
   */
  playerStartBlock() {
    if (!_player || !_player.alive) return false;
    if (_player.state === 'dodging' || _player.state === 'dead') return false;
    if (_player.stats.sta <= 0) return false;

    _player.state = 'blocking';
    _player.blockTimer = 0;
    return true;
  },

  /**
   * 玩家停止格挡
   */
  playerStopBlock() {
    if (!_player) return;
    if (_player.state === 'blocking') {
      _player.state = 'idle';
      _player.blockTimer = 0;
    }
  },

  /**
   * 检查玩家是否在完美格挡窗口
   * @returns {boolean}
   */
  isPlayerPerfectBlock() {
    if (!_player || _player.state !== 'blocking') return false;
    return _player.blockTimer <= PERFECT_BLOCK_WINDOW;
  },

  /**
   * 玩家受伤（设置硬直状态）
   */
  playerHurt() {
    if (!_player || !_player.alive) return;
    if (_player.state === 'dodging') return; // 闪避中不硬直

    _player.state = 'hurt';
    _player.stateTimer = HURT_DURATION;
    _player.iFrames = IFRAME_DURATION;
  },

  /**
   * 玩家死亡
   */
  playerDeath() {
    if (!_player) return;
    _player.alive = false;
    _player.state = 'dead';
    _player.stats.hp = 0;

    EventBus.emit('player:death', {
      stats: { ..._player.stats },
      runData: {
        level: _player.level,
        kills: _player.kills,
        gold: _player.gold
      }
    });
  },

  /**
   * 清除所有非玩家实体（房间切换用）
   */
  clearNonPlayerEntities() {
    _entities = _entities.filter(e => e.type === 'player');
  }
};
