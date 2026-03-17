/**
 * ═══════════════════════════════════════════════════════════════
 *  🤖 Void Abyss — AIController
 *  FSM 状态机 / 巡逻 / 追击 / Boss 三阶段模式 / 自定义行为
 *  决策间隔 100ms（非每帧），同屏 15 敌可控
 *  原则："聪明但不作弊" — AI 只用玩家也能获取的信息
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { distance, normalize, randomRange, randomInt, generateId } from './utils.js';

// ─── AI 状态常量 ───
const STATE = {
  IDLE:    'idle',
  PATROL:  'patrol',
  CHASE:   'chase',
  ATTACK:  'attack',
  FLEE:    'flee',
  STUN:    'stun',
  DEAD:    'dead'
};

// ─── 内部存储 ───
const _aiStates = {};       // entityId → AIState
const _customBehaviors = {}; // behaviorName → fn(entity, player, dt)

let _config = {
  updateInterval: 100,   // 决策间隔 ms
  detectionRange: 200,   // 默认索敌范围 px
  attackRange: 50        // 默认攻击范围 px
};

let _decisionAccum = 0;  // 决策计时累积 (ms)

// ─── AIState 工厂 ───

function createAIState(entityId, overrides = {}) {
  return {
    entityId,
    state: STATE.IDLE,
    prevState: STATE.IDLE,       // 眩晕恢复用
    target: null,                // 追击/攻击目标 {x, y}
    stateTime: 0,                // 当前状态持续时间 (s)

    // 巡逻路点
    patrolTarget: null,          // {x, y}
    patrolWaitTime: 0,           // 到达路点后等待时间

    // 攻击相关
    attackTimer: 0,              // 攻击冷却计时
    attackPhase: 'ready',        // ready | windup | active | cooldown
    windupTime: 0,               // 蓄力计时

    // 敌人数据缓存
    detectionRange: overrides.detectionRange || _config.detectionRange,
    attackRange: overrides.attackRange || _config.attackRange,
    attackCooldown: overrides.attackCooldown || 1.0,
    attackType: overrides.attackType || 'melee',

    // 移动意图（每帧使用）
    moveX: 0,
    moveY: 0,
    moveSpeed: overrides.moveSpeed || 100,

    // Boss 专用
    isBoss: overrides.isBoss || false,
    isElite: overrides.isElite || false,
    bossPhase: 0,
    bossSkillTimer: 0,
    bossPattern: null,

    // 眩晕
    stunDuration: 0
  };
}

// ─── 状态转换逻辑 ───

function evaluateTransition(aiState, entity, player) {
  const s = aiState;

  // 死亡优先
  if (entity.stats && entity.stats.hp <= 0) {
    return STATE.DEAD;
  }

  // 眩晕优先
  if (s.state === STATE.STUN) {
    if (s.stunDuration <= 0) {
      return s.prevState || STATE.IDLE;
    }
    return STATE.STUN;
  }

  // 死亡状态锁定
  if (s.state === STATE.DEAD) return STATE.DEAD;

  // 计算距离
  if (!player || !player.alive) return s.state === STATE.IDLE ? STATE.IDLE : STATE.PATROL;
  const dist = distance(entity.x, entity.y, player.x, player.y);

  // 逃跑判定：HP < 20% 且非Boss/精英
  if (entity.stats && !s.isBoss && !s.isElite) {
    const hpRatio = entity.stats.hp / entity.stats.maxHp;
    if (hpRatio < 0.2) {
      return STATE.FLEE;
    }
    // 从逃跑中恢复：HP > 30%
    if (s.state === STATE.FLEE && hpRatio > 0.3) {
      return STATE.CHASE;
    }
  }

  // 继续逃跑
  if (s.state === STATE.FLEE) {
    if (entity.stats) {
      const hpRatio = entity.stats.hp / entity.stats.maxHp;
      if (hpRatio < 0.2) return STATE.FLEE;
    }
  }

  // 攻击范围内 → attack
  if (dist <= s.attackRange) {
    return STATE.ATTACK;
  }

  // 索敌范围内 → chase
  if (dist <= s.detectionRange) {
    return STATE.CHASE;
  }

  // 脱离索敌范围
  if (s.state === STATE.CHASE) {
    return STATE.PATROL;
  }

  // idle → 检测到玩家 → chase（已在上方处理）
  // 默认保持当前状态或巡逻
  if (s.state === STATE.IDLE && s.stateTime > randomRange(1.5, 3.0)) {
    return STATE.PATROL;
  }

  return s.state;
}

// ─── 状态行为执行 ───

function executeState(aiState, entity, player, dt) {
  const s = aiState;
  s.stateTime += dt;

  switch (s.state) {
    case STATE.IDLE:
      executeIdle(s, entity, dt);
      break;
    case STATE.PATROL:
      executePatrol(s, entity, dt);
      break;
    case STATE.CHASE:
      executeChase(s, entity, player, dt);
      break;
    case STATE.ATTACK:
      executeAttack(s, entity, player, dt);
      break;
    case STATE.FLEE:
      executeFlee(s, entity, player, dt);
      break;
    case STATE.STUN:
      executeStun(s, entity, dt);
      break;
    case STATE.DEAD:
      s.moveX = 0;
      s.moveY = 0;
      break;
  }
}

/** IDLE: 原地待命，随机小幅移动 */
function executeIdle(s, entity, dt) {
  // 小幅随机移动（抖动感）
  if (Math.random() < 0.02) {
    s.moveX = randomRange(-0.3, 0.3);
    s.moveY = randomRange(-0.3, 0.3);
  } else {
    s.moveX *= 0.9;
    s.moveY *= 0.9;
  }
}

/** PATROL: 在房间内巡逻，随机路点 */
function executePatrol(s, entity, dt) {
  // 生成/更新巡逻目标
  if (!s.patrolTarget || s.patrolWaitTime > 0) {
    s.patrolWaitTime -= dt;
    if (s.patrolWaitTime > 0) {
      s.moveX = 0;
      s.moveY = 0;
      return;
    }
    // 在实体周围 80-150px 范围内随机选点
    const angle = randomRange(0, Math.PI * 2);
    const dist = randomRange(80, 150);
    s.patrolTarget = {
      x: entity.x + Math.cos(angle) * dist,
      y: entity.y + Math.sin(angle) * dist
    };
  }

  // 向巡逻点移动
  const dx = s.patrolTarget.x - entity.x;
  const dy = s.patrolTarget.y - entity.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) {
    // 到达路点，等待一段时间
    s.patrolTarget = null;
    s.patrolWaitTime = randomRange(1.0, 2.5);
    s.moveX = 0;
    s.moveY = 0;
  } else {
    const n = normalize(dx, dy);
    s.moveX = n.x * 0.5; // 巡逻速度为半速
    s.moveY = n.y * 0.5;
  }
}

/** CHASE: 发现玩家，追击 */
function executeChase(s, entity, player, dt) {
  if (!player) return;
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const n = normalize(dx, dy);

  // 远程敌人保持一定距离
  if (s.attackType === 'ranged') {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const preferredDist = s.detectionRange * 0.6;
    if (dist < preferredDist) {
      // 后退
      s.moveX = -n.x * 0.4;
      s.moveY = -n.y * 0.4;
    } else {
      s.moveX = n.x;
      s.moveY = n.y;
    }
  } else {
    s.moveX = n.x;
    s.moveY = n.y;
  }

  s.target = { x: player.x, y: player.y };
}

/** ATTACK: 进入攻击范围，执行攻击逻辑 */
function executeAttack(s, entity, player, dt) {
  if (!player) {
    s.moveX = 0;
    s.moveY = 0;
    return;
  }

  // 面朝玩家但停止移动（近战），远程可微移
  if (s.attackType === 'melee') {
    s.moveX = 0;
    s.moveY = 0;
  } else {
    // 远程/AOE 保持距离，轻微游走
    const dx = player.x - entity.x;
    const dy = player.y - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < s.attackRange * 0.5) {
      const n = normalize(-dx, -dy);
      s.moveX = n.x * 0.3;
      s.moveY = n.y * 0.3;
    } else {
      s.moveX = 0;
      s.moveY = 0;
    }
  }

  // 攻击状态机
  s.attackTimer -= dt;

  switch (s.attackPhase) {
    case 'ready':
      if (s.attackTimer <= 0) {
        // 开始蓄力
        s.attackPhase = 'windup';
        s.windupTime = _getWindupTime(s.attackType);
        s.attackTimer = s.windupTime;
        EventBus.emit('ai:attackWindup', {
          entityId: s.entityId,
          attackType: s.attackType,
          windupTime: s.windupTime
        });
      }
      break;

    case 'windup':
      if (s.attackTimer <= 0) {
        // 释放攻击
        s.attackPhase = 'active';
        s.attackTimer = 0.15; // 攻击判定持续
        EventBus.emit('ai:attack', {
          entityId: s.entityId,
          targetX: player.x,
          targetY: player.y,
          attackType: s.attackType
        });
      }
      break;

    case 'active':
      if (s.attackTimer <= 0) {
        // 进入冷却
        s.attackPhase = 'cooldown';
        s.attackTimer = _getCooldownTime(s);
      }
      break;

    case 'cooldown':
      if (s.attackTimer <= 0) {
        s.attackPhase = 'ready';
        s.attackTimer = 0;
      }
      break;
  }
}

/** FLEE: 远离玩家 */
function executeFlee(s, entity, player, dt) {
  if (!player) {
    s.moveX = 0;
    s.moveY = 0;
    return;
  }
  const dx = entity.x - player.x;
  const dy = entity.y - player.y;
  const n = normalize(dx, dy);
  s.moveX = n.x;
  s.moveY = n.y;
}

/** STUN: 被眩晕 */
function executeStun(s, entity, dt) {
  s.stunDuration -= dt;
  s.moveX = 0;
  s.moveY = 0;
}

// ─── 攻击参数工具 ───

function _getWindupTime(attackType) {
  switch (attackType) {
    case 'melee':  return 0.5;   // 近战 0.5s 预备
    case 'ranged': return 0.3;   // 远程 0.3s 预备
    case 'aoe':    return 1.0;   // AOE 1.0s 蓄力
    default:       return 0.5;
  }
}

function _getCooldownTime(s) {
  switch (s.attackType) {
    case 'melee':  return s.attackCooldown || 0.5;
    case 'ranged': return s.attackCooldown || randomRange(1.0, 2.0);
    case 'aoe':    return s.attackCooldown || 2.0;
    default:       return s.attackCooldown || 1.0;
  }
}

// ═══════════════════════════════════════════
//  Boss AI — 三阶段专用处理
// ═══════════════════════════════════════════

/**
 * Boss 通用三阶段行为
 * Phase 1 (HP > 66%): 基础 pattern，间歇长
 * Phase 2 (HP 33%-66%): 解锁新技能，攻击加速，召唤小怪
 * Phase 3 (HP < 33%): 狂暴模式，全技能释放，极短间歇
 */
function executeBossAI(aiState, entity, player, dt, bossPhase, bossConfig) {
  const s = aiState;
  if (!player || !player.alive) {
    s.moveX = 0;
    s.moveY = 0;
    return { entityId: s.entityId, action: 'idle' };
  }

  s.bossSkillTimer -= dt;
  const dist = distance(entity.x, entity.y, player.x, player.y);
  const bossId = bossConfig?.id || 'generic';

  // 根据 Boss ID 分派行为
  switch (bossId) {
    case 'boss_euler':
      return _bossEuler(s, entity, player, dt, bossPhase, dist);
    case 'boss_prism':
      return _bossPrism(s, entity, player, dt, bossPhase, dist);
    case 'boss_nyx':
      return _bossNyx(s, entity, player, dt, bossPhase, dist);
    case 'boss_chronos':
      return _bossChronos(s, entity, player, dt, bossPhase, dist);
    case 'boss_ophelia':
      return _bossOphelia(s, entity, player, dt, bossPhase, dist);
    default:
      return _bossGeneric(s, entity, player, dt, bossPhase, dist);
  }
}

// ── Layer 1 Boss: 欧拉 — 近战重击型 ──
function _bossEuler(s, entity, player, dt, phase, dist) {
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const n = normalize(dx, dy);

  if (phase >= 3) {
    // P3: 全攻击加速 — 冷却减半，移速加快
    s.moveX = n.x * 1.3;
    s.moveY = n.y * 1.3;
    if (s.bossSkillTimer <= 0) {
      s.bossSkillTimer = 1.2;
      return { entityId: s.entityId, action: 'attack', skillId: 'euler_heavy_strike', targetX: player.x, targetY: player.y };
    }
  } else if (phase >= 2) {
    // P2: 分裂 2 分身（HP30%）
    s.moveX = n.x * 0.9;
    s.moveY = n.y * 0.9;
    if (s.bossSkillTimer <= 0) {
      s.bossSkillTimer = 3.0;
      // 交替：重击 / 分裂
      if (Math.random() < 0.4) {
        return { entityId: s.entityId, action: 'special', skillId: 'euler_split', targetX: entity.x, targetY: entity.y };
      }
      return { entityId: s.entityId, action: 'attack', skillId: 'euler_heavy_strike', targetX: player.x, targetY: player.y };
    }
  } else {
    // P1: 慢速重击
    s.moveX = n.x * 0.7;
    s.moveY = n.y * 0.7;
    if (s.bossSkillTimer <= 0 && dist < 80) {
      s.bossSkillTimer = 2.5;
      return { entityId: s.entityId, action: 'attack', skillId: 'euler_heavy_strike', targetX: player.x, targetY: player.y };
    }
  }

  return { entityId: s.entityId, action: 'move', targetX: player.x, targetY: player.y };
}

// ── Layer 2 Boss: 普利兹 — 远程弹幕型 ──
function _bossPrism(s, entity, player, dt, phase, dist) {
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const n = normalize(dx, dy);

  // 保持中距离
  const preferredDist = 180;
  if (dist < preferredDist * 0.6) {
    s.moveX = -n.x * 0.6;
    s.moveY = -n.y * 0.6;
  } else if (dist > preferredDist * 1.2) {
    s.moveX = n.x * 0.6;
    s.moveY = n.y * 0.6;
  } else {
    // 横向移动
    s.moveX = -n.y * 0.4;
    s.moveY = n.x * 0.4;
  }

  if (s.bossSkillTimer <= 0) {
    if (phase >= 3) {
      // P3: 全屏弹幕 8方向
      s.bossSkillTimer = 2.0;
      return { entityId: s.entityId, action: 'special', skillId: 'prism_barrage_8dir', targetX: entity.x, targetY: entity.y };
    } else if (phase >= 2) {
      // P2: 召唤蛛群 或 单体射击
      s.bossSkillTimer = 2.5;
      if (Math.random() < 0.35) {
        return { entityId: s.entityId, action: 'special', skillId: 'prism_summon_spiders', targetX: entity.x, targetY: entity.y };
      }
      return { entityId: s.entityId, action: 'attack', skillId: 'prism_bolt', targetX: player.x, targetY: player.y };
    } else {
      // P1: 单体远程
      s.bossSkillTimer = 2.0;
      return { entityId: s.entityId, action: 'attack', skillId: 'prism_bolt', targetX: player.x, targetY: player.y };
    }
  }

  return { entityId: s.entityId, action: 'move', targetX: player.x, targetY: player.y };
}

// ── Layer 3 Boss: 尼克斯 — 元素轮换型 ──
function _bossNyx(s, entity, player, dt, phase, dist) {
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const n = normalize(dx, dy);

  // 中远距离游走
  const preferredDist = 160;
  if (dist < preferredDist * 0.5) {
    s.moveX = -n.x * 0.5;
    s.moveY = -n.y * 0.5;
  } else if (dist > preferredDist * 1.3) {
    s.moveX = n.x * 0.7;
    s.moveY = n.y * 0.7;
  } else {
    // 圆周游走
    const t = performance.now() * 0.001;
    s.moveX = Math.cos(t * 1.5) * 0.5;
    s.moveY = Math.sin(t * 1.5) * 0.5;
  }

  const elements = ['fire', 'ice', 'lightning'];

  if (s.bossSkillTimer <= 0) {
    if (phase >= 3) {
      // P3: 三元素轮换 + 元素柱
      s.bossSkillTimer = 1.8;
      const elem = elements[randomInt(0, 2)];
      if (Math.random() < 0.3) {
        return { entityId: s.entityId, action: 'special', skillId: 'nyx_element_pillar', targetX: player.x, targetY: player.y, element: elem };
      }
      return { entityId: s.entityId, action: 'attack', skillId: 'nyx_element_attack', targetX: player.x, targetY: player.y, element: elem };
    } else if (phase >= 2) {
      // P2: 双元素轮换
      s.bossSkillTimer = 2.2;
      const elem = elements[randomInt(0, 1)];
      return { entityId: s.entityId, action: 'attack', skillId: 'nyx_element_attack', targetX: player.x, targetY: player.y, element: elem };
    } else {
      // P1: 单元素攻击
      s.bossSkillTimer = 2.5;
      return { entityId: s.entityId, action: 'attack', skillId: 'nyx_element_attack', targetX: player.x, targetY: player.y, element: 'fire' };
    }
  }

  return { entityId: s.entityId, action: 'move', targetX: player.x, targetY: player.y };
}

// ── Layer 4 Boss: 克罗诺斯 — 近战+范围型 ──
function _bossChronos(s, entity, player, dt, phase, dist) {
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const n = normalize(dx, dy);

  // 积极追近
  s.moveX = n.x * 0.8;
  s.moveY = n.y * 0.8;

  if (s.bossSkillTimer <= 0) {
    if (phase >= 3) {
      // P3: 陨石随机落点×5
      s.bossSkillTimer = 2.5;
      if (Math.random() < 0.4) {
        return { entityId: s.entityId, action: 'special', skillId: 'chronos_meteor', targetX: player.x, targetY: player.y, count: 5 };
      }
      return { entityId: s.entityId, action: 'attack', skillId: 'chronos_hammer', targetX: player.x, targetY: player.y };
    } else if (phase >= 2) {
      // P2: 激光扫射旋转
      s.bossSkillTimer = 3.0;
      if (Math.random() < 0.4) {
        return { entityId: s.entityId, action: 'special', skillId: 'chronos_laser_sweep', targetX: entity.x, targetY: entity.y };
      }
      return { entityId: s.entityId, action: 'attack', skillId: 'chronos_hammer', targetX: player.x, targetY: player.y };
    } else {
      // P1: 近战锤击
      s.bossSkillTimer = 2.0;
      if (dist < 100) {
        return { entityId: s.entityId, action: 'attack', skillId: 'chronos_hammer', targetX: player.x, targetY: player.y };
      }
    }
  }

  return { entityId: s.entityId, action: 'move', targetX: player.x, targetY: player.y };
}

// ── Layer 5 Boss: 奥菲利亚 — 全能型 ──
function _bossOphelia(s, entity, player, dt, phase, dist) {
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const n = normalize(dx, dy);

  // 复杂移动 pattern — 远近交替
  const t = performance.now() * 0.001;
  const movePhase = Math.sin(t * 0.5);
  if (movePhase > 0) {
    s.moveX = n.x * 0.6;
    s.moveY = n.y * 0.6;
  } else {
    s.moveX = -n.x * 0.3 + Math.cos(t * 2) * 0.4;
    s.moveY = -n.y * 0.3 + Math.sin(t * 2) * 0.4;
  }

  if (s.bossSkillTimer <= 0) {
    if (phase >= 3) {
      // P3: 空间扭曲 — 全屏随机伤害区域
      s.bossSkillTimer = 2.0;
      const roll = Math.random();
      if (roll < 0.3) {
        return { entityId: s.entityId, action: 'special', skillId: 'ophelia_spatial_warp', targetX: randomRange(100, 860), targetY: randomRange(100, 540) };
      } else if (roll < 0.6) {
        return { entityId: s.entityId, action: 'special', skillId: 'ophelia_blackhole', targetX: player.x, targetY: player.y };
      }
      return { entityId: s.entityId, action: 'attack', skillId: 'ophelia_void_blast', targetX: player.x, targetY: player.y };
    } else if (phase >= 2) {
      // P2: 黑洞吸引（中心点持续拉扯）
      s.bossSkillTimer = 3.5;
      if (Math.random() < 0.4) {
        return { entityId: s.entityId, action: 'special', skillId: 'ophelia_blackhole', targetX: (entity.x + player.x) / 2, targetY: (entity.y + player.y) / 2 };
      }
      return { entityId: s.entityId, action: 'attack', skillId: 'ophelia_void_blast', targetX: player.x, targetY: player.y };
    } else {
      // P1: 常规混合
      s.bossSkillTimer = 2.5;
      return { entityId: s.entityId, action: 'attack', skillId: 'ophelia_void_blast', targetX: player.x, targetY: player.y };
    }
  }

  return { entityId: s.entityId, action: 'move', targetX: player.x, targetY: player.y };
}

// ── 通用 Boss 行为（回退） ──
function _bossGeneric(s, entity, player, dt, phase, dist) {
  const dx = player.x - entity.x;
  const dy = player.y - entity.y;
  const n = normalize(dx, dy);

  s.moveX = n.x * (phase >= 3 ? 1.2 : phase >= 2 ? 0.9 : 0.7);
  s.moveY = n.y * (phase >= 3 ? 1.2 : phase >= 2 ? 0.9 : 0.7);

  if (s.bossSkillTimer <= 0 && dist < 120) {
    s.bossSkillTimer = phase >= 3 ? 1.5 : phase >= 2 ? 2.5 : 3.0;
    return { entityId: s.entityId, action: 'attack', skillId: 'boss_generic_attack', targetX: player.x, targetY: player.y };
  }

  return { entityId: s.entityId, action: 'move', targetX: player.x, targetY: player.y };
}

// ═══════════════════════════════════════════
//  导出 AIController
// ═══════════════════════════════════════════

export const AIController = {
  /**
   * 初始化 AI 系统
   * @param {Object} [config]
   * @param {number} [config.updateInterval=100] - 决策间隔 ms
   * @param {number} [config.detectionRange=200] - 默认索敌范围 px
   * @param {number} [config.attackRange=50] - 默认攻击范围 px
   */
  init(config = {}) {
    _config.updateInterval = config.updateInterval ?? 100;
    _config.detectionRange = config.detectionRange ?? 200;
    _config.attackRange = config.attackRange ?? 50;
    _decisionAccum = 0;

    // 清空状态
    const keys = Object.keys(_aiStates);
    for (let i = 0; i < keys.length; i++) {
      delete _aiStates[keys[i]];
    }

    // 监听敌人创建/移除事件
    EventBus.on('entity:enemyCreated', (data) => {
      if (data && data.enemy) {
        const e = data.enemy;
        _aiStates[e.id] = createAIState(e.id, {
          detectionRange: e.detectionRange || _config.detectionRange,
          attackRange: e.attackRange || _config.attackRange,
          attackCooldown: e.attackCooldown || 1.0,
          attackType: e.attackType || 'melee',
          moveSpeed: e.stats?.spd || 100,
          isBoss: e.isBoss || false,
          isElite: e.isElite || false
        });
      }
    });

    EventBus.on('entity:removed', (data) => {
      if (data && data.entityId && _aiStates[data.entityId]) {
        delete _aiStates[data.entityId];
      }
    });

    console.log(`[AI] ✅ Initialized — interval:${_config.updateInterval}ms, detection:${_config.detectionRange}px, attack:${_config.attackRange}px`);
  },

  /**
   * 更新所有敌人 AI
   * @param {number} dt - 帧间隔（秒）
   * @param {Array} enemies - 敌人实体数组
   * @param {Object} player - 玩家实体
   * @returns {Array<{entityId, action, targetX, targetY, skillId}>} AI 行为指令列表
   */
  update(dt, enemies, player) {
    const actions = [];
    if (!enemies || enemies.length === 0) return actions;

    // 累积决策时间
    _decisionAccum += dt * 1000;
    const shouldDecide = _decisionAccum >= _config.updateInterval;
    if (shouldDecide) {
      _decisionAccum -= _config.updateInterval;
      // 防止累积过多
      if (_decisionAccum > _config.updateInterval * 2) {
        _decisionAccum = 0;
      }
    }

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy || !enemy.alive) continue;

      let s = _aiStates[enemy.id];
      if (!s) {
        // 动态注册
        s = createAIState(enemy.id, {
          detectionRange: enemy.detectionRange || _config.detectionRange,
          attackRange: enemy.attackRange || _config.attackRange,
          attackCooldown: enemy.attackCooldown || 1.0,
          attackType: enemy.attackType || 'melee',
          moveSpeed: enemy.stats?.spd || 100,
          isBoss: enemy.isBoss || false,
          isElite: enemy.isElite || false
        });
        _aiStates[enemy.id] = s;
      }

      // Boss 专用 AI
      if (s.isBoss) {
        // 自动判断 Boss 阶段
        if (enemy.stats) {
          const hpRatio = enemy.stats.hp / enemy.stats.maxHp;
          if (hpRatio > 0.66) s.bossPhase = 1;
          else if (hpRatio > 0.33) s.bossPhase = 2;
          else s.bossPhase = 3;
        }

        if (shouldDecide) {
          const bossAction = executeBossAI(s, enemy, player, dt, s.bossPhase, enemy.bossConfig || { id: enemy.enemyId });
          if (bossAction) actions.push(bossAction);
        }

        // 每帧更新 Boss 移动位置
        if (s.moveX !== 0 || s.moveY !== 0) {
          enemy.x += s.moveX * s.moveSpeed * dt;
          enemy.y += s.moveY * s.moveSpeed * dt;
        }
        continue;
      }

      // 每 100ms 做一次决策
      if (shouldDecide) {
        const newState = evaluateTransition(s, enemy, player);
        if (newState !== s.state) {
          const oldState = s.state;
          if (newState === STATE.STUN) {
            s.prevState = oldState;
          }
          s.state = newState;
          s.stateTime = 0;
          s.attackPhase = 'ready';
          s.attackTimer = 0;
        }
      }

      // 每帧执行当前状态行为（移动/攻击动画等）
      executeState(s, enemy, player, dt);

      // 检查自定义行为
      if (enemy.customBehavior && _customBehaviors[enemy.customBehavior]) {
        const result = _customBehaviors[enemy.customBehavior](enemy, player, dt);
        if (result) {
          actions.push(result);
          continue;
        }
      }

      // 应用移动意图到实体位置
      if (s.moveX !== 0 || s.moveY !== 0) {
        enemy.x += s.moveX * s.moveSpeed * dt;
        enemy.y += s.moveY * s.moveSpeed * dt;
      }

      // 收集本帧行为
      if (s.state === STATE.ATTACK && s.attackPhase === 'active') {
        actions.push({
          entityId: enemy.id,
          action: 'attack',
          targetX: player ? player.x : enemy.x,
          targetY: player ? player.y : enemy.y,
          skillId: s.attackType === 'ranged' ? 'ranged_shot' : s.attackType === 'aoe' ? 'aoe_blast' : 'melee_strike'
        });
      }
    }

    return actions;
  },

  /**
   * 设置单个敌人 AI 状态
   * @param {string} entityId - 实体 ID
   * @param {string} state - 目标状态
   * @param {Object} [params] - 附加参数 (如 stunDuration)
   */
  setState(entityId, state, params = {}) {
    let s = _aiStates[entityId];
    if (!s) {
      s = createAIState(entityId);
      _aiStates[entityId] = s;
    }

    if (state === STATE.STUN) {
      s.prevState = s.state;
      s.stunDuration = params.duration || 1.0;
    }

    s.state = state;
    s.stateTime = 0;

    if (params.target) s.target = params.target;
  },

  /**
   * 获取 AI 状态
   * @param {string} entityId - 实体 ID
   * @returns {{state, target, stateTime}|null}
   */
  getState(entityId) {
    const s = _aiStates[entityId];
    if (!s) return null;
    return {
      state: s.state,
      target: s.target,
      stateTime: s.stateTime,
      attackPhase: s.attackPhase,
      bossPhase: s.bossPhase
    };
  },

  /**
   * Boss 专用 AI 更新（外部手动调用）
   * @param {string} entityId - Boss 实体 ID
   * @param {number} bossPhase - 当前阶段 (1-3)
   * @param {Object} bossConfig - Boss 配置 { id, phases[], ... }
   * @returns {Object|null} AIAction
   */
  updateBossAI(entityId, bossPhase, bossConfig) {
    const s = _aiStates[entityId];
    if (!s) return null;
    s.bossPhase = bossPhase;
    s.isBoss = true;
    if (bossConfig) {
      s.bossPattern = bossConfig;
    }
    // 实际行为在 update() 中执行
    return null;
  },

  /**
   * 注册自定义行为
   * @param {string} behaviorName - 行为名称
   * @param {Function} behaviorFn - fn(entity, player, dt) → {action, targetX, targetY, skillId}|null
   */
  registerBehavior(behaviorName, behaviorFn) {
    if (typeof behaviorFn !== 'function') {
      console.warn(`[AI] registerBehavior: "${behaviorName}" is not a function`);
      return;
    }
    _customBehaviors[behaviorName] = behaviorFn;
    console.log(`[AI] 📝 Registered behavior: "${behaviorName}"`);
  },

  // ─── 辅助方法 ───

  /** 获取所有 AI 状态（调试用） */
  _getAll() {
    return _aiStates;
  },

  /** 获取状态常量 */
  STATES: STATE
};
