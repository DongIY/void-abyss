/**
 * ═══════════════════════════════════════════════════════════════
 *  🎒 Void Abyss — Item Data + Synergy Config
 *  道具表: 20+ 道具覆盖 5 个品质
 *  Synergy: 5+ 组合效果
 *  品质: common(白) / uncommon(绿) / rare(蓝) / epic(紫) / legendary(金)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * 品质枚举与颜色
 */
export const QUALITY = {
  common:    { name: 'Common',    nameCN: '普通', color: '#9ca3af', tier: 1, statMult: 1.0 },
  uncommon:  { name: 'Uncommon',  nameCN: '优秀', color: '#4ade80', tier: 2, statMult: 1.5 },
  rare:      { name: 'Rare',      nameCN: '稀有', color: '#60a5fa', tier: 3, statMult: 2.0 },
  epic:      { name: 'Epic',      nameCN: '史诗', color: '#a855f7', tier: 4, statMult: 3.0 },
  legendary: { name: 'Legendary', nameCN: '传说', color: '#fbbf24', tier: 5, statMult: 4.0 }
};

/**
 * 掉落概率表 (按 sourceType)
 * 值为各品质概率百分比(总计100)
 */
export const DROP_RATES = {
  normal: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 },
  elite:  { common: 20, uncommon: 35, rare: 30, epic: 12, legendary: 3 },
  boss:   { common: 0,  uncommon: 10, rare: 30, epic: 35, legendary: 25 },
  chest:  { common: 30, uncommon: 30, rare: 25, epic: 12, legendary: 3 }
};

/**
 * 道具类型: weapon / armor / accessory / consumable
 * @typedef {Object} ItemDef
 * @property {string} id
 * @property {string} name
 * @property {string} nameCN
 * @property {string} description
 * @property {string} quality
 * @property {string} type - weapon / armor / accessory / consumable
 * @property {Object} effect - 装备属性加成或使用效果
 * @property {string|null} synergyGroup - Synergy 组 ID
 * @property {string|null} element - 附带元素 (void/fire/ice/lightning/null)
 */

export const ITEMS = [
  // ─── 武器 ───
  {
    id: 'weapon_rusty_blade',
    name: 'Rusty Blade',
    nameCN: '锈蚀之刃',
    description: 'ATK +2，基础近战武器',
    quality: 'common',
    type: 'weapon',
    effect: { atk: 2 },
    synergyGroup: null,
    element: null
  },
  {
    id: 'weapon_void_dagger',
    name: 'Void Dagger',
    nameCN: '虚空匕首',
    description: 'ATK +4, 暴击率 +3%, 附带虚空元素',
    quality: 'uncommon',
    type: 'weapon',
    effect: { atk: 4, crit: 0.03 },
    synergyGroup: 'void_set',
    element: 'void'
  },
  {
    id: 'weapon_ice_shard',
    name: 'Ice Shard Blade',
    nameCN: '寒冰碎片刃',
    description: 'ATK +5, 攻击附带寒冰元素',
    quality: 'rare',
    type: 'weapon',
    effect: { atk: 5 },
    synergyGroup: 'ice_set',
    element: 'ice'
  },
  {
    id: 'weapon_flame_sword',
    name: 'Flamebrand',
    nameCN: '焰心剑',
    description: 'ATK +6, 攻击附带火焰元素',
    quality: 'rare',
    type: 'weapon',
    effect: { atk: 6 },
    synergyGroup: 'fire_set',
    element: 'fire'
  },
  {
    id: 'weapon_thunder_lance',
    name: 'Thunder Lance',
    nameCN: '雷霆之枪',
    description: 'ATK +7, ASPD ×0.9, 附带雷电元素',
    quality: 'epic',
    type: 'weapon',
    effect: { atk: 7 },
    synergyGroup: 'lightning_set',
    element: 'lightning'
  },
  {
    id: 'weapon_abyssal_reaver',
    name: 'Abyssal Reaver',
    nameCN: '深渊劫掠者',
    description: 'ATK +10, 暴击率 +8%, 击杀回复 3% HP',
    quality: 'legendary',
    type: 'weapon',
    effect: { atk: 10, crit: 0.08 },
    synergyGroup: 'abyss_set',
    element: 'void'
  },

  // ─── 防具 ───
  {
    id: 'armor_cloth',
    name: 'Tattered Cloth',
    nameCN: '破布衣',
    description: 'DEF +1, HP +5',
    quality: 'common',
    type: 'armor',
    effect: { def: 1, maxHp: 5 },
    synergyGroup: null,
    element: null
  },
  {
    id: 'armor_void_robe',
    name: 'Void Robe',
    nameCN: '虚空法袍',
    description: 'DEF +3, 元素精通 +5, MP +10',
    quality: 'uncommon',
    type: 'armor',
    effect: { def: 3, elem: 5, maxMp: 10 },
    synergyGroup: 'void_set',
    element: null
  },
  {
    id: 'armor_titan_plate',
    name: 'Titan Plate',
    nameCN: '泰坦护甲',
    description: 'DEF +8, HP +20, SPD -10',
    quality: 'epic',
    type: 'armor',
    effect: { def: 8, maxHp: 20, spd: -10 },
    synergyGroup: 'titan_set',
    element: null
  },
  {
    id: 'armor_shadow_cloak',
    name: 'Shadow Cloak',
    nameCN: '暗影披风',
    description: 'DEF +2, SPD +20, 闪避后 0.5s 隐身',
    quality: 'rare',
    type: 'armor',
    effect: { def: 2, spd: 20 },
    synergyGroup: 'shadow_set',
    element: null
  },

  // ─── 饰品 ───
  {
    id: 'acc_void_ring',
    name: 'Void Pulse Ring',
    nameCN: '虚空脉冲戒指',
    description: '元素精通 +8, 攻击附带小概率虚空脉冲',
    quality: 'rare',
    type: 'accessory',
    effect: { elem: 8 },
    synergyGroup: 'void_set',
    element: 'void'
  },
  {
    id: 'acc_fire_heart',
    name: 'Fire Heart',
    nameCN: '火焰之心',
    description: 'ATK +3, 攻击附带火焰伤害',
    quality: 'uncommon',
    type: 'accessory',
    effect: { atk: 3 },
    synergyGroup: 'fire_set',
    element: 'fire'
  },
  {
    id: 'acc_thunder_necklace',
    name: 'Thunder Necklace',
    nameCN: '雷电项链',
    description: 'ASPD ×0.9, 攻击附带雷电',
    quality: 'uncommon',
    type: 'accessory',
    effect: {},
    synergyGroup: 'lightning_set',
    element: 'lightning'
  },
  {
    id: 'acc_phantom_boots',
    name: 'Phantom Boots',
    nameCN: '幻影靴',
    description: 'SPD +35, 闪避距离 +20%',
    quality: 'rare',
    type: 'accessory',
    effect: { spd: 35 },
    synergyGroup: 'shadow_set',
    element: null
  },
  {
    id: 'acc_iron_shield',
    name: 'Iron Buckler',
    nameCN: '铁壁盾牌',
    description: 'DEF +5, 格挡耐力消耗 -15%',
    quality: 'uncommon',
    type: 'accessory',
    effect: { def: 5 },
    synergyGroup: 'titan_set',
    element: null
  },
  {
    id: 'acc_undying_heart',
    name: 'Undying Heart',
    nameCN: '不屈之心',
    description: 'HP +25, 低于 20% HP 时 DEF +10',
    quality: 'epic',
    type: 'accessory',
    effect: { maxHp: 25 },
    synergyGroup: 'titan_set',
    element: null
  },
  {
    id: 'acc_abyss_pendant',
    name: 'Abyss Pendant',
    nameCN: '深渊吊坠',
    description: '元素精通 +15, 元素反应伤害 +20%',
    quality: 'epic',
    type: 'accessory',
    effect: { elem: 15 },
    synergyGroup: 'abyss_set',
    element: 'void'
  },
  {
    id: 'acc_starlight_gem',
    name: 'Starlight Gem',
    nameCN: '星光宝石',
    description: '所有属性 +2, 暴击率 +3%',
    quality: 'legendary',
    type: 'accessory',
    effect: { atk: 2, def: 2, maxHp: 10, crit: 0.03, elem: 2 },
    synergyGroup: null,
    element: null
  },

  // ─── 消耗品 ───
  {
    id: 'potion_hp_small',
    name: 'Small HP Potion',
    nameCN: '小型生命药水',
    description: '回复 30 HP',
    quality: 'common',
    type: 'consumable',
    effect: { restoreHp: 30 },
    synergyGroup: null,
    element: null
  },
  {
    id: 'potion_hp_large',
    name: 'Large HP Potion',
    nameCN: '大型生命药水',
    description: '回复 60 HP',
    quality: 'uncommon',
    type: 'consumable',
    effect: { restoreHp: 60 },
    synergyGroup: null,
    element: null
  },
  {
    id: 'potion_mp',
    name: 'MP Potion',
    nameCN: '魔力药水',
    description: '回复 30 MP',
    quality: 'common',
    type: 'consumable',
    effect: { restoreMp: 30 },
    synergyGroup: null,
    element: null
  },
  {
    id: 'scroll_damage',
    name: 'Scroll of Fury',
    nameCN: '狂怒卷轴',
    description: '15 秒内 ATK +5',
    quality: 'uncommon',
    type: 'consumable',
    effect: { buff: { stat: 'atk', value: 5, duration: 15 } },
    synergyGroup: null,
    element: null
  },
  {
    id: 'scroll_shield',
    name: 'Scroll of Protection',
    nameCN: '护盾卷轴',
    description: '获得吸收 40 伤害的护盾，持续 20 秒',
    quality: 'rare',
    type: 'consumable',
    effect: { shield: { amount: 40, duration: 20 } },
    synergyGroup: null,
    element: null
  }
];

/**
 * Synergy 组合配置
 */
export const SYNERGIES = [
  {
    id: 'synergy_frozen_pulse',
    name: 'Frozen Pulse',
    nameCN: '冰冻冲击波',
    description: '攻击附带冰冻 + 虚空爆炸效果',
    requiredItems: ['weapon_ice_shard', 'acc_void_ring'],
    effect: {
      type: 'on_attack',
      bonusDamage: 0.2,  // +20% 伤害
      element: 'ice',
      special: 'freeze_pulse' // 特殊效果 ID
    }
  },
  {
    id: 'synergy_overload_core',
    name: 'Overload Core',
    nameCN: '过载核心',
    description: '攻击自动触发过载元素反应',
    requiredItems: ['acc_fire_heart', 'acc_thunder_necklace'],
    effect: {
      type: 'on_attack',
      bonusDamage: 0.15,
      element: 'fire',
      special: 'auto_overload'
    }
  },
  {
    id: 'synergy_perfect_stealth',
    name: 'Perfect Stealth',
    nameCN: '完美隐匿',
    description: '闪避后 3 秒隐身，隐身首次攻击必暴击',
    requiredItems: ['armor_shadow_cloak', 'acc_phantom_boots'],
    effect: {
      type: 'on_dodge',
      duration: 3,
      special: 'stealth_crit'
    }
  },
  {
    id: 'synergy_indestructible',
    name: 'Indestructible Fortress',
    nameCN: '不灭堡垒',
    description: 'DEF ×2, 格挡时反弹 15% 伤害',
    requiredItems: ['armor_titan_plate', 'acc_iron_shield', 'acc_undying_heart'],
    effect: {
      type: 'passive',
      defMultiplier: 2.0,
      special: 'block_reflect'
    }
  },
  {
    id: 'synergy_void_convergence',
    name: 'Void Convergence',
    nameCN: '虚空聚合',
    description: '虚空元素反应伤害 +50%, 反应范围 +30%',
    requiredItems: ['weapon_void_dagger', 'acc_void_ring', 'armor_void_robe'],
    effect: {
      type: 'passive',
      voidReactionBonus: 0.5,
      reactionRadiusBonus: 0.3,
      special: 'void_convergence'
    }
  },
  {
    id: 'synergy_abyss_lord',
    name: 'Abyss Lord',
    nameCN: '深渊领主',
    description: '全属性 +3, 击杀敌人有概率获得额外碎片',
    requiredItems: ['weapon_abyssal_reaver', 'acc_abyss_pendant'],
    effect: {
      type: 'passive',
      allStats: 3,
      special: 'bonus_shards'
    }
  }
];

/**
 * 根据 ID 获取道具定义
 * @param {string} itemId
 * @returns {ItemDef|null}
 */
export function getItemById(itemId) {
  return ITEMS.find(i => i.id === itemId) || null;
}

/**
 * 按品质筛选道具（排除消耗品）
 * @param {string} quality
 * @returns {ItemDef[]}
 */
export function getItemsByQuality(quality) {
  return ITEMS.filter(i => i.quality === quality && i.type !== 'consumable');
}

/**
 * 获取所有消耗品
 * @returns {ItemDef[]}
 */
export function getConsumables() {
  return ITEMS.filter(i => i.type === 'consumable');
}
