/**
 * ═══════════════════════════════════════════════════════════════
 *  ⚔️ Void Abyss — Combat System
 *  伤害计算 / 元素反应(6种) / Combo 阶梯 / 格挡与完美格挡
 *  伤害公式: ATK × SkillMult × (1+ComboBonus) × CritMult × ElemMult
 *           - DEF_enemy × (1-ArmorPen)
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { clamp, randomRange } from './utils.js';

// ─── 常量 ───

// Combo 阶梯
const COMBO_TIERS = [
  { threshold: 50, name: 'VOID MASTER', bonus: 0.30, color: '#a855f7' },
  { threshold: 30, name: 'LEGENDARY',   bonus: 0.20, color: '#fbbf24' },
  { threshold: 20, name: 'AMAZING',     bonus: 0.15, color: '#ef4444' },
  { threshold: 10, name: 'GREAT',       bonus: 0.10, color: '#60a5fa' },
  { threshold: 5,  name: 'NICE',        bonus: 0.05, color: '#4ade80' }
];

const COMBO_TIMEOUT = 2.0; // 秒

// 元素反应定义
const ELEMENT_REACTIONS = {
  'void_fire':      { name: 'annihilation',   displayName: '湮灭',     multiplier: 2.0,  duration: 0,   radius: 80,  effect: 'explosion' },
  'void_ice':       { name: 'absolute_zero',  displayName: '绝对零域', multiplier: 0,    duration: 3.0, radius: 100, effect: 'freeze' },
  'void_lightning':  { name: 'void_storm',     displayName: '虚空风暴', multiplier: 0.3,  duration: 5.0, radius: 90,  effect: 'dot_zone' },
  'fire_ice':       { name: 'evaporation',    displayName: '蒸发',     multiplier: 1.5,  duration: 4.0, radius: 70,  effect: 'mist' },
  'fire_lightning':  { name: 'overload',       displayName: '过载',     multiplier: 1.8,  duration: 1.0, radius: 110, effect: 'knockback_stun' },
  'ice_lightning':   { name: 'superconduct',   displayName: '超导',     multiplier: 1.0,  duration: 5.0, radius: 80,  effect: 'def_reduction' }
};

// 元素克制 (a 克 b → 1.25x)
const ELEMENT_ADVANTAGE = {
  fire: 'ice',
  ice: 'lightning',
  lightning: 'fire'
};

// ─── 内部状态 ───
let _combo = { count: 0, timer: 0, maxCombo: 0 };
let _dotEffects = [];     // 持续伤害 [{targetId, damage, interval, remaining, element}]
let _reactionCooldowns = new Map(); // 反应冷却 "elemA_elemB_targetId" → remaining

export const CombatSystem = {
  /**
   * 重置战斗系统
   */
  reset() {
    _combo = { count: 0, timer: 0, maxCombo: 0 };
    _dotEffects = [];
    _reactionCooldowns.clear();
  },

  /**
   * 处理攻击
   * @param {Object} params
   * @param {Object} params.attacker - 攻击者实体
   * @param {Object} params.target - 目标实体
   * @param {string} [params.skillId] - 技能 ID
   * @param {string} [params.element] - 附带元素
   * @returns {Object} AttackResult
   */
  attack(params) {
    const { attacker, target, skillId, element } = params;
    if (!attacker || !target || !target.alive) return null;

    const atkStats = attacker.stats;
    const defStats = target.stats;

    // 技能倍率（默认普攻 1.0）
    const skillMult = this._getSkillMultiplier(skillId);

    // Combo 加成
    const comboBonus = this._getComboBonus();

    // 暴击判定
    let critRate = atkStats.crit || 0.05;
    // 影步加成
    if (attacker._dodgeCritBoost) {
      critRate += attacker._dodgeCritBoost;
    }
    const isCrit = Math.random() < critRate;
    const critMult = isCrit ? (atkStats.critDmg || 1.5) : 1.0;

    // 元素倍率
    const attackElement = element || attacker.element || null;
    const targetElement = target.element || null;
    let elemMult = 1.0;
    if (attackElement && targetElement && ELEMENT_ADVANTAGE[attackElement] === targetElement) {
      elemMult = 1.25;
    }

    // 穿甲率
    const armorPen = attacker._armorPen || 0;

    // 狂战加成
    let atkValue = atkStats.atk;
    if (attacker._berserkerActive) {
      atkValue *= 1.2;
    }
    // 泰坦之力
    if (attacker._titanMight) {
      atkValue *= 1.3;
    }

    // 基础伤害公式
    let rawDamage = atkValue * skillMult * (1 + comboBonus) * critMult * elemMult
                  - (defStats.def || 0) * (1 - armorPen);

    // 最低伤害保证
    rawDamage = Math.max(1, Math.floor(rawDamage));

    // 受伤处理
    const damageResult = this.takeDamage(target, rawDamage, 'attack');

    // 元素反应
    let reaction = null;
    let reactionDamage = 0;
    if (attackElement && targetElement && attackElement !== targetElement) {
      reaction = this.calculateElementReaction(
        attackElement, targetElement,
        rawDamage,
        atkStats.elem || 0
      );
      if (reaction) {
        reactionDamage = reaction.damage;
        EventBus.emit('combat:reaction', {
          reaction,
          position: { x: target.x, y: target.y },
          damage: reactionDamage
        });
      }
    }

    // Combo 更新
    this.applyCombo(true);

    // 击杀判定
    const killed = !target.alive;

    // 暴击事件
    if (isCrit) {
      EventBus.emit('combat:crit', {
        attacker,
        target,
        damage: rawDamage
      });
    }

    // 命中事件
    const result = {
      damage: rawDamage,
      isCrit,
      element: attackElement,
      reaction: reaction ? reaction.name : null,
      reactionDamage,
      killed,
      comboCount: _combo.count
    };

    EventBus.emit('combat:hit', { attacker, target, result });

    // 击杀事件
    if (killed) {
      _combo.timer = Math.min(_combo.timer + 1.5, COMBO_TIMEOUT + 1.5); // 击杀延长 Combo
      EventBus.emit('combat:kill', {
        killer: attacker,
        victim: target,
        loot: null // 由 ItemSystem 处理
      });
    }

    return result;
  },

  /**
   * 受伤处理
   * @param {Object} target - 目标实体
   * @param {number} rawDamage - 原始伤害
   * @param {string} source - 伤害来源 ('attack'|'trap'|'dot'|'reaction')
   * @returns {{actualDamage: number, killed: boolean, blocked: boolean}}
   */
  takeDamage(target, rawDamage, source) {
    if (!target || !target.alive) {
      return { actualDamage: 0, killed: false, blocked: false };
    }

    // iFrame 检查
    if (target.iFrames && target.iFrames > 0) {
      return { actualDamage: 0, killed: false, blocked: false };
    }

    // 护盾吸收
    if (target._shield && target._shield > 0) {
      if (rawDamage <= target._shield) {
        target._shield -= rawDamage;
        return { actualDamage: 0, killed: false, blocked: true };
      } else {
        rawDamage -= target._shield;
        target._shield = 0;
      }
    }

    // 扣血
    const actualDamage = Math.max(1, Math.floor(rawDamage));
    target.stats.hp -= actualDamage;

    // 设置闪白效果
    target.flashTimer = 0.15;

    // 死亡判定
    let killed = false;
    if (target.stats.hp <= 0) {
      // 不屈意志检查（玩家专属）
      if (target.type === 'player' && target._cheatDeath) {
        // 由 TalentSystem.tryCheatDeath() 处理标记
        // 这里只做 HP 兜底
      }

      if (target.stats.hp <= 0) {
        target.stats.hp = 0;
        target.alive = false;
        killed = true;

        EventBus.emit('entity:death', {
          entity: target,
          killer: source
        });
      }
    }

    // 低血量事件（玩家）
    if (target.type === 'player' && target.alive) {
      const hpRatio = target.stats.hp / target.stats.maxHp;
      if (hpRatio < 0.3) {
        EventBus.emit('player:lowHP', {
          hp: target.stats.hp,
          maxHp: target.stats.maxHp,
          ratio: hpRatio
        });
      }
    }

    EventBus.emit('combat:damage', {
      target,
      damage: actualDamage,
      source,
      killed
    });

    return { actualDamage, killed, blocked: false };
  },

  /**
   * 元素反应计算
   * @param {string} elemA - 元素 A
   * @param {string} elemB - 元素 B
   * @param {number} baseDmg - 基础伤害
   * @param {number} elemMastery - 元素精通
   * @returns {Object|null} ReactionResult
   */
  calculateElementReaction(elemA, elemB, baseDmg, elemMastery) {
    // 排序确保查找一致性（字母序小的在前）
    const sorted = [elemA, elemB].sort();
    const key = `${sorted[0]}_${sorted[1]}`;
    const reaction = ELEMENT_REACTIONS[key];

    if (!reaction) return null;

    // 冷却检查（1秒内同一反应不重复触发）
    const cooldownKey = key;
    if (_reactionCooldowns.has(cooldownKey) && _reactionCooldowns.get(cooldownKey) > 0) {
      return null;
    }
    _reactionCooldowns.set(cooldownKey, 1.0);

    // 反应伤害 = BaseDamage × ReactionMultiplier × (1 + ELEM/100)
    const damage = Math.floor(baseDmg * reaction.multiplier * (1 + elemMastery / 100));

    return {
      name: reaction.name,
      displayName: reaction.displayName,
      damage,
      effect: reaction.effect,
      duration: reaction.duration,
      radius: reaction.radius
    };
  },

  /**
   * Combo 逻辑
   * @param {boolean} hit - 是否命中
   * @returns {{count: number, bonus: number, tier: string|null, tierChanged: boolean, timeRemaining: number}}
   */
  applyCombo(hit) {
    const oldTier = this._getComboTierName(_combo.count);

    if (hit) {
      _combo.count++;
      _combo.timer = COMBO_TIMEOUT;

      if (_combo.count > _combo.maxCombo) {
        _combo.maxCombo = _combo.count;
      }
    }

    const newTier = this._getComboTierName(_combo.count);
    const tierChanged = newTier !== oldTier && newTier !== null;

    if (tierChanged) {
      EventBus.emit('combat:comboTier', {
        tier: newTier,
        count: _combo.count
      });
    }

    return {
      count: _combo.count,
      bonus: this._getComboBonus(),
      tier: newTier,
      tierChanged,
      timeRemaining: _combo.timer
    };
  },

  /**
   * 格挡处理
   * @param {Object} blocker - 格挡者
   * @param {Object} attacker - 攻击者
   * @param {boolean} isPerfect - 是否完美格挡
   * @returns {{blocked: boolean, isPerfect: boolean, reflectDamage: number, staminaCost: number}}
   */
  processBlock(blocker, attacker, isPerfect) {
    if (!blocker || !attacker) {
      return { blocked: false, isPerfect: false, reflectDamage: 0, staminaCost: 0 };
    }

    // 耐力消耗
    let staCost = 20;
    // 坚甲天赋减少 30%
    if (blocker._blockCostReduction) {
      staCost *= (1 - blocker._blockCostReduction);
    }

    if (blocker.stats.sta < staCost) {
      // 耐力不足，格挡失败
      return { blocked: false, isPerfect: false, reflectDamage: 0, staminaCost: 0 };
    }

    blocker.stats.sta -= staCost;

    let reflectDamage = 0;

    if (isPerfect) {
      // 完美格挡反击伤害: EnemyATK × 0.5 + PlayerDEF × 2
      reflectDamage = Math.floor(attacker.stats.atk * 0.5 + blocker.stats.def * 2);

      // 延长 Combo 时间
      _combo.timer = Math.min(_combo.timer + 2.0, COMBO_TIMEOUT + 2.0);

      EventBus.emit('combat:perfectParry', {
        blocker,
        attacker,
        reflectDmg: reflectDamage
      });
    } else {
      EventBus.emit('combat:block', {
        blocker,
        attacker
      });
    }

    return {
      blocked: true,
      isPerfect,
      reflectDamage,
      staminaCost: staCost
    };
  },

  /**
   * 每帧更新
   * @param {number} dt - 帧间隔(秒)
   */
  update(dt) {
    // 1. Combo 超时检测
    if (_combo.count > 0) {
      _combo.timer -= dt;
      if (_combo.timer <= 0) {
        _combo.count = 0;
        _combo.timer = 0;
      }
    }

    // 2. DoT 处理
    for (let i = _dotEffects.length - 1; i >= 0; i--) {
      const dot = _dotEffects[i];
      dot.remaining -= dt;
      dot._tickTimer = (dot._tickTimer || 0) + dt;

      if (dot._tickTimer >= dot.interval) {
        dot._tickTimer -= dot.interval;
        // 触发 DoT 伤害（需要目标引用）
        EventBus.emit('combat:dotTick', {
          targetId: dot.targetId,
          damage: dot.damage,
          element: dot.element
        });
      }

      if (dot.remaining <= 0) {
        _dotEffects.splice(i, 1);
      }
    }

    // 3. 反应冷却
    for (const [key, cd] of _reactionCooldowns) {
      const newCd = cd - dt;
      if (newCd <= 0) {
        _reactionCooldowns.delete(key);
      } else {
        _reactionCooldowns.set(key, newCd);
      }
    }
  },

  /**
   * 添加持续伤害效果
   * @param {Object} config
   */
  addDoT(config) {
    _dotEffects.push({
      targetId: config.targetId,
      damage: config.damage,
      interval: config.interval || 1.0,
      remaining: config.duration,
      element: config.element || null,
      _tickTimer: 0
    });
  },

  /**
   * 获取当前 Combo 状态
   * @returns {Object}
   */
  getComboState() {
    return {
      count: _combo.count,
      bonus: this._getComboBonus(),
      tier: this._getComboTierName(_combo.count),
      maxCombo: _combo.maxCombo,
      timer: _combo.timer
    };
  },

  // ─── 内部方法 ───

  /** 获取当前 Combo 加成 */
  _getComboBonus() {
    for (const tier of COMBO_TIERS) {
      if (_combo.count >= tier.threshold) {
        return tier.bonus;
      }
    }
    return 0;
  },

  /** 获取当前 Combo 阶梯名称 */
  _getComboTierName(count) {
    for (const tier of COMBO_TIERS) {
      if (count >= tier.threshold) {
        return tier.name;
      }
    }
    return null;
  },

  /** 获取技能倍率 */
  _getSkillMultiplier(skillId) {
    if (!skillId) return 1.0; // 普攻

    // 技能倍率表（简化版，后续可从数据文件加载）
    const SKILL_MULTS = {
      void_pulse: 1.8,        // 虚空脉冲
      abyss_slash: 2.0,       // 深渊斩击
      shadow_strike: 2.2,     // 影步突袭
      skill_1: 1.5,           // 通用技能1
      skill_2: 2.5            // 通用技能2
    };

    return SKILL_MULTS[skillId] || 1.0;
  }
};
