/**
 * ═══════════════════════════════════════════════════════════════
 *  🌟 Void Abyss — Talent System
 *  三路线天赋树: 力量(红) / 敏捷(绿) / 虚空(紫) / 通用(白)
 *  升级时触发三选一，支持被动效果每帧应用
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { TALENTS, UNIVERSAL_WEIGHT, getTalentById, getTalentsByRouteTier } from './data/talents.js';

// ─── 内部状态 ───
let _acquired = [];       // 已获取的天赋 ID 列表
let _strengthCount = 0;
let _agilityCount = 0;
let _voidCount = 0;
let _universalCount = 0;

// 被动效果标记（一次性激活的被动状态缓存）
const _passiveFlags = {
  cheatDeathUsed: false,        // 不屈意志已触发（每局一次）
  dodgeCritTimer: 0,            // 影步暴击计时器
  stealthTimer: 0,              // 隐身计时器（Synergy 用）
  onHitShieldTimer: 0,          // 虚空护盾冷却
  auraTimer: 0                  // 湮灭领域伤害间隔
};

// ─── 工具函数 ───

/**
 * 根据已获取天赋数量决定当前可选层级
 * 力量路线: 0-2个T1, 3-5个T2, 6+个T3（基于该路线已选数量）
 */
function getAvailableTier(routeCount) {
  if (routeCount < 2) return 1;
  if (routeCount < 4) return 2;
  return 3;
}

/**
 * 从天赋池中随机选择3个不重复天赋
 */
function pickThreeChoices(pool) {
  const shuffled = pool.slice();
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

export const TalentSystem = {
  /**
   * 重置天赋系统（新局开始）
   */
  reset() {
    _acquired = [];
    _strengthCount = 0;
    _agilityCount = 0;
    _voidCount = 0;
    _universalCount = 0;
    _passiveFlags.cheatDeathUsed = false;
    _passiveFlags.dodgeCritTimer = 0;
    _passiveFlags.stealthTimer = 0;
    _passiveFlags.onHitShieldTimer = 0;
    _passiveFlags.auraTimer = 0;
  },

  /**
   * 获取三选一天赋选项
   * @param {number} playerLevel - 玩家等级
   * @param {string[]} acquiredIds - 已获取天赋 ID
   * @param {string} characterId - 角色 ID
   * @returns {Object[]} 三个天赋选项 [{talentId, name, nameCN, description, route, tier, color}]
   */
  getAvailableTalents(playerLevel, acquiredIds, characterId) {
    // 同步内部状态
    _acquired = acquiredIds || [];
    _strengthCount = _acquired.filter(id => { const t = getTalentById(id); return t && t.route === 'strength'; }).length;
    _agilityCount = _acquired.filter(id => { const t = getTalentById(id); return t && t.route === 'agility'; }).length;
    _voidCount = _acquired.filter(id => { const t = getTalentById(id); return t && t.route === 'void'; }).length;
    _universalCount = _acquired.filter(id => { const t = getTalentById(id); return t && t.route === 'universal'; }).length;

    // 构建候选池
    const pool = [];
    const routes = [
      { name: 'strength', count: _strengthCount },
      { name: 'agility', count: _agilityCount },
      { name: 'void', count: _voidCount }
    ];

    for (const route of routes) {
      const tier = getAvailableTier(route.count);
      // 收集当前层级及以下的未选天赋
      for (let t = 1; t <= tier; t++) {
        const talents = getTalentsByRouteTier(route.name, t);
        for (const talent of talents) {
          // 跳过已选
          if (_acquired.includes(talent.id)) continue;
          // 角色限定检查
          if (talent.requiredCharacters.length > 0 && !talent.requiredCharacters.includes(characterId)) continue;
          pool.push(talent);
        }
      }
    }

    // 通用路线（低概率加入）
    if (Math.random() * 100 < UNIVERSAL_WEIGHT) {
      const uniTier = getAvailableTier(_universalCount);
      for (let t = 1; t <= uniTier; t++) {
        const talents = getTalentsByRouteTier('universal', t);
        for (const talent of talents) {
          if (_acquired.includes(talent.id)) continue;
          pool.push(talent);
        }
      }
    }

    // 如果候选池不足 3 个，补充其他可用天赋
    if (pool.length < 3) {
      for (const talent of TALENTS) {
        if (_acquired.includes(talent.id)) continue;
        if (pool.find(p => p.id === talent.id)) continue;
        if (talent.requiredCharacters.length > 0 && !talent.requiredCharacters.includes(characterId)) continue;
        pool.push(talent);
        if (pool.length >= 6) break; // 足够了
      }
    }

    const choices = pickThreeChoices(pool);

    // 转换为显示格式
    const result = choices.map(t => ({
      talentId: t.id,
      name: t.name,
      nameCN: t.nameCN,
      description: t.description,
      route: t.route,
      tier: t.tier,
      color: t.color
    }));

    EventBus.emit('talent:choiceReady', { choices: result });
    return result;
  },

  /**
   * 选择天赋
   * @param {string} talentId - 天赋 ID
   * @returns {{statChanges: Object, passiveEffect: string|null, description: string}|null}
   */
  selectTalent(talentId) {
    const talent = getTalentById(talentId);
    if (!talent) {
      console.warn(`[Talent] Unknown talent: ${talentId}`);
      return null;
    }

    if (_acquired.includes(talentId)) {
      console.warn(`[Talent] Already acquired: ${talentId}`);
      return null;
    }

    // 记录获取
    _acquired.push(talentId);

    // 更新路线计数
    switch (talent.route) {
      case 'strength': _strengthCount++; break;
      case 'agility': _agilityCount++; break;
      case 'void': _voidCount++; break;
      case 'universal': _universalCount++; break;
    }

    const effect = {
      statChanges: talent.statChanges || {},
      passiveEffect: talent.passiveId,
      description: talent.description
    };

    EventBus.emit('talent:selected', { talentId, effect });
    EventBus.emit('player:statsChanged', { source: 'talent', changes: talent.statChanges });

    console.log(`[Talent] Selected: ${talent.nameCN} (${talent.route} T${talent.tier})`);
    return effect;
  },

  /**
   * 获取天赋树状态
   * @returns {Object}
   */
  getTalentTree() {
    return {
      acquired: _acquired.slice(),
      strengthCount: _strengthCount,
      agilityCount: _agilityCount,
      voidCount: _voidCount,
      universalCount: _universalCount,
      totalCount: _acquired.length
    };
  },

  /**
   * 应用被动效果（每帧调用）
   * @param {Object} player - 玩家实体引用
   * @param {number} dt - 帧间隔(秒)
   */
  applyPassives(player, dt) {
    if (!player || !player.stats) return;

    for (const talentId of _acquired) {
      const talent = getTalentById(talentId);
      if (!talent || !talent.passiveId) continue;

      switch (talent.passiveId) {
        case 'low_hp_atk_boost': // 狂战: 低血量 ATK +20%
          // 标记由 combat 系统读取
          player._berserkerActive = player.stats.hp < player.stats.maxHp * 0.3;
          break;

        case 'titan_atk_mult': // 泰坦之力: ATK ×1.3
          // 一次性标记，由实体创建时应用
          player._titanMight = true;
          break;

        case 'aspd_multiply': // 连射: ASPD ×0.85
          player._rapidFire = true;
          break;

        case 'no_dodge_cooldown': // 暗影大师: 闪避无冷却
          player._noDodgeCooldown = true;
          break;

        case 'combo_aspd_double': // 死神之舞: 连击 30+ 攻速翻倍
          // 由 combat 系统按 combo 计数检查
          player._deathDance = true;
          break;

        case 'attack_knives': // 千刃风暴: 攻击附带飞刀
          player._bladeStorm = true;
          break;

        case 'aura_void_damage': // 湮灭领域: 持续虚空伤害
          _passiveFlags.auraTimer += dt;
          if (_passiveFlags.auraTimer >= 1.0) {
            _passiveFlags.auraTimer -= 1.0;
            EventBus.emit('talent:auraDamage', {
              x: player.x,
              y: player.y,
              damage: player.stats.atk * 0.3,
              radius: 80,
              element: 'void'
            });
          }
          break;

        case 'dodge_crit_boost': // 影步: 闪避后暴击加成
          if (_passiveFlags.dodgeCritTimer > 0) {
            _passiveFlags.dodgeCritTimer -= dt;
            player._dodgeCritBoost = 0.30;
          } else {
            player._dodgeCritBoost = 0;
          }
          break;

        case 'on_hit_shield': // 虚空护盾
          if (_passiveFlags.onHitShieldTimer > 0) {
            _passiveFlags.onHitShieldTimer -= dt;
          }
          break;

        // 其他被动由各系统自行检查 talent 标记
        default:
          break;
      }
    }
  },

  /**
   * 检查是否拥有指定被动
   * @param {string} passiveId
   * @returns {boolean}
   */
  hasPassive(passiveId) {
    return _acquired.some(id => {
      const t = getTalentById(id);
      return t && t.passiveId === passiveId;
    });
  },

  /**
   * 触发闪避后的被动（影步暴击）
   */
  onDodge() {
    if (this.hasPassive('dodge_crit_boost')) {
      _passiveFlags.dodgeCritTimer = 0.5;
    }
  },

  /**
   * 触发受击后的被动（虚空护盾）
   * @returns {number} 护盾量 (0 = 未触发)
   */
  onHit(player) {
    if (this.hasPassive('on_hit_shield') && _passiveFlags.onHitShieldTimer <= 0) {
      _passiveFlags.onHitShieldTimer = 5; // 5秒冷却
      return player.stats.maxHp * 0.1;
    }
    return 0;
  },

  /**
   * 不屈意志：致命免死
   * @returns {boolean} 是否触发免死
   */
  tryCheatDeath() {
    if (this.hasPassive('cheat_death') && !_passiveFlags.cheatDeathUsed) {
      _passiveFlags.cheatDeathUsed = true;
      return true;
    }
    return false;
  },

  /** 获取被动标记（供其他系统读取） */
  get passiveFlags() {
    return _passiveFlags;
  }
};
