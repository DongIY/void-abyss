/**
 * ═══════════════════════════════════════════════════════════════
 *  🌟 Void Abyss — Talent Data
 *  三路线天赋树: 力量(红) / 敏捷(绿) / 虚空(紫) / 通用(白)
 *  每路线 T1/T2/T3 各 3 个天赋，通用 T1/T2 各 3 个
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * @typedef {Object} TalentDef
 * @property {string} id - 唯一ID
 * @property {string} name - 显示名
 * @property {string} nameCN - 中文名
 * @property {string} description - 效果描述
 * @property {string} route - 路线: strength / agility / void / universal
 * @property {number} tier - 层级: 1/2/3
 * @property {string} color - 显示色
 * @property {Object} statChanges - 直接属性变更
 * @property {string|null} passiveId - 被动效果ID (由 TalentSystem 处理)
 * @property {string[]} requiredCharacters - 角色限定 (空数组=全角色)
 */

export const TALENTS = [
  // ═══ 力量路线 (红色) ═══
  // T1
  {
    id: 'str_t1_heavy_strike',
    name: 'Heavy Strike',
    nameCN: '重击',
    description: 'ATK +3',
    route: 'strength',
    tier: 1,
    color: '#ef4444',
    statChanges: { atk: 3 },
    passiveId: null,
    requiredCharacters: []
  },
  {
    id: 'str_t1_iron_wall',
    name: 'Iron Wall',
    nameCN: '铁壁',
    description: 'DEF +3',
    route: 'strength',
    tier: 1,
    color: '#ef4444',
    statChanges: { def: 3 },
    passiveId: null,
    requiredCharacters: []
  },
  {
    id: 'str_t1_war_cry',
    name: 'War Cry',
    nameCN: '战吼',
    description: '击杀敌人回复 3% 最大生命值',
    route: 'strength',
    tier: 1,
    color: '#ef4444',
    statChanges: {},
    passiveId: 'war_cry_heal',
    requiredCharacters: []
  },
  // T2
  {
    id: 'str_t2_whirlwind',
    name: 'Whirlwind',
    nameCN: '旋风斩',
    description: '攻击附带小范围 AOE 伤害',
    route: 'strength',
    tier: 2,
    color: '#ef4444',
    statChanges: {},
    passiveId: 'whirlwind_aoe',
    requiredCharacters: []
  },
  {
    id: 'str_t2_hardened',
    name: 'Hardened Armor',
    nameCN: '坚甲',
    description: '格挡耐力消耗 -30%',
    route: 'strength',
    tier: 2,
    color: '#ef4444',
    statChanges: {},
    passiveId: 'block_cost_reduction',
    requiredCharacters: []
  },
  {
    id: 'str_t2_berserker',
    name: 'Berserker',
    nameCN: '狂战',
    description: '生命值低于 30% 时 ATK +20%',
    route: 'strength',
    tier: 2,
    color: '#ef4444',
    statChanges: {},
    passiveId: 'low_hp_atk_boost',
    requiredCharacters: []
  },
  // T3
  {
    id: 'str_t3_titan',
    name: 'Titan\'s Might',
    nameCN: '泰坦之力',
    description: 'ATK ×1.3',
    route: 'strength',
    tier: 3,
    color: '#ef4444',
    statChanges: {},
    passiveId: 'titan_atk_mult',
    requiredCharacters: []
  },
  {
    id: 'str_t3_undying',
    name: 'Undying Will',
    nameCN: '不屈意志',
    description: '致命伤害免死一次（每局一次），保留 1 HP',
    route: 'strength',
    tier: 3,
    color: '#ef4444',
    statChanges: {},
    passiveId: 'cheat_death',
    requiredCharacters: []
  },
  {
    id: 'str_t3_devastate',
    name: 'Devastating Blow',
    nameCN: '毁灭打击',
    description: '暴击附带击退 + 眩晕 0.5 秒',
    route: 'strength',
    tier: 3,
    color: '#ef4444',
    statChanges: {},
    passiveId: 'crit_knockback_stun',
    requiredCharacters: []
  },

  // ═══ 敏捷路线 (绿色) ═══
  // T1
  {
    id: 'agi_t1_swift',
    name: 'Swift',
    nameCN: '迅捷',
    description: 'SPD +30',
    route: 'agility',
    tier: 1,
    color: '#4ade80',
    statChanges: { spd: 30 },
    passiveId: null,
    requiredCharacters: []
  },
  {
    id: 'agi_t1_vital_point',
    name: 'Vital Point',
    nameCN: '要害',
    description: '暴击率 +5%',
    route: 'agility',
    tier: 1,
    color: '#4ade80',
    statChanges: { crit: 0.05 },
    passiveId: null,
    requiredCharacters: []
  },
  {
    id: 'agi_t1_rapid_fire',
    name: 'Rapid Fire',
    nameCN: '连射',
    description: '攻击速度 ×0.85 (更快)',
    route: 'agility',
    tier: 1,
    color: '#4ade80',
    statChanges: {},
    passiveId: 'aspd_multiply',
    requiredCharacters: []
  },
  // T2
  {
    id: 'agi_t2_shadow_step',
    name: 'Shadow Step',
    nameCN: '影步',
    description: '闪避后 0.5s 攻击暴击率 +30%',
    route: 'agility',
    tier: 2,
    color: '#4ade80',
    statChanges: {},
    passiveId: 'dodge_crit_boost',
    requiredCharacters: []
  },
  {
    id: 'agi_t2_lethal',
    name: 'Lethal Precision',
    nameCN: '致命',
    description: '暴击伤害 +50%',
    route: 'agility',
    tier: 2,
    color: '#4ade80',
    statChanges: { critDmg: 0.5 },
    passiveId: null,
    requiredCharacters: []
  },
  {
    id: 'agi_t2_phantom',
    name: 'Phantom',
    nameCN: '分身',
    description: '20% 概率闪避后留下攻击分身',
    route: 'agility',
    tier: 2,
    color: '#4ade80',
    statChanges: {},
    passiveId: 'dodge_clone',
    requiredCharacters: []
  },
  // T3
  {
    id: 'agi_t3_shadow_master',
    name: 'Shadow Master',
    nameCN: '暗影大师',
    description: '闪避冷却时间移除 (但仍消耗耐力)',
    route: 'agility',
    tier: 3,
    color: '#4ade80',
    statChanges: {},
    passiveId: 'no_dodge_cooldown',
    requiredCharacters: []
  },
  {
    id: 'agi_t3_death_dance',
    name: 'Death\'s Dance',
    nameCN: '死神之舞',
    description: '连击 30+ 时攻击速度翻倍',
    route: 'agility',
    tier: 3,
    color: '#4ade80',
    statChanges: {},
    passiveId: 'combo_aspd_double',
    requiredCharacters: []
  },
  {
    id: 'agi_t3_blade_storm',
    name: 'Blade Storm',
    nameCN: '千刃风暴',
    description: '攻击附带 3 把飞刀投射物',
    route: 'agility',
    tier: 3,
    color: '#4ade80',
    statChanges: {},
    passiveId: 'attack_knives',
    requiredCharacters: []
  },

  // ═══ 虚空路线 (紫色) ═══
  // T1
  {
    id: 'void_t1_affinity',
    name: 'Void Affinity',
    nameCN: '虚空亲和',
    description: '元素精通 +10',
    route: 'void',
    tier: 1,
    color: '#a855f7',
    statChanges: { elem: 10 },
    passiveId: null,
    requiredCharacters: []
  },
  {
    id: 'void_t1_siphon',
    name: 'Abyss Siphon',
    nameCN: '深渊汲取',
    description: '击杀敌人回复 5 MP',
    route: 'void',
    tier: 1,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'kill_mp_restore',
    requiredCharacters: []
  },
  {
    id: 'void_t1_shield',
    name: 'Void Shield',
    nameCN: '虚空护盾',
    description: '受击后获得 2 秒护盾 (吸收 10% 最大 HP 伤害)',
    route: 'void',
    tier: 1,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'on_hit_shield',
    requiredCharacters: []
  },
  // T2
  {
    id: 'void_t2_resonance',
    name: 'Element Resonance',
    nameCN: '元素共鸣',
    description: '元素反应内部冷却 -50%',
    route: 'void',
    tier: 2,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'reaction_cd_reduction',
    requiredCharacters: []
  },
  {
    id: 'void_t2_rift',
    name: 'Void Rift',
    nameCN: '虚空裂隙',
    description: '技能附带额外虚空元素伤害',
    route: 'void',
    tier: 2,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'skill_void_damage',
    requiredCharacters: []
  },
  {
    id: 'void_t2_mana_surge',
    name: 'Mana Surge',
    nameCN: '魔力涌流',
    description: 'MP > 50% 时技能伤害 +25%',
    route: 'void',
    tier: 2,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'high_mp_skill_boost',
    requiredCharacters: []
  },
  // T3
  {
    id: 'void_t3_abyss_eye',
    name: 'Abyss Eye',
    nameCN: '深渊之眼',
    description: '敌人头顶显示血量与弱点元素',
    route: 'void',
    tier: 3,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'enemy_info_display',
    requiredCharacters: []
  },
  {
    id: 'void_t3_devour',
    name: 'Void Devour',
    nameCN: '虚空吞噬',
    description: '击杀后吸收敌人 10% 最大 HP 为护盾',
    route: 'void',
    tier: 3,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'kill_absorb_shield',
    requiredCharacters: []
  },
  {
    id: 'void_t3_annihilation_field',
    name: 'Annihilation Field',
    nameCN: '湮灭领域',
    description: '周围持续释放虚空伤害场 (每秒造成 ATK×0.3 伤害)',
    route: 'void',
    tier: 3,
    color: '#a855f7',
    statChanges: {},
    passiveId: 'aura_void_damage',
    requiredCharacters: []
  },

  // ═══ 通用路线 (白色) ═══
  // T1
  {
    id: 'uni_t1_treasure',
    name: 'Treasure Sense',
    nameCN: '寻宝直觉',
    description: '道具掉落率 +15%',
    route: 'universal',
    tier: 1,
    color: '#e2e8f0',
    statChanges: {},
    passiveId: 'loot_rate_boost',
    requiredCharacters: []
  },
  {
    id: 'uni_t1_haggle',
    name: 'Haggler',
    nameCN: '商人眼光',
    description: '商店价格 -20%',
    route: 'universal',
    tier: 1,
    color: '#e2e8f0',
    statChanges: {},
    passiveId: 'shop_discount',
    requiredCharacters: []
  },
  {
    id: 'uni_t1_vitality',
    name: 'Vitality',
    nameCN: '生命源泉',
    description: 'HP +15',
    route: 'universal',
    tier: 1,
    color: '#e2e8f0',
    statChanges: { maxHp: 15, hp: 15 },
    passiveId: null,
    requiredCharacters: []
  },
  // T2
  {
    id: 'uni_t2_backpack',
    name: 'Backpack Expansion',
    nameCN: '背包扩展',
    description: '道具栏上限 +2',
    route: 'universal',
    tier: 2,
    color: '#e2e8f0',
    statChanges: {},
    passiveId: 'inventory_expand',
    requiredCharacters: []
  },
  {
    id: 'uni_t2_misfortune',
    name: 'Misfortune\'s Boon',
    nameCN: '厄运转化',
    description: '受伤时 5% 概率掉落随机道具',
    route: 'universal',
    tier: 2,
    color: '#e2e8f0',
    statChanges: {},
    passiveId: 'damage_item_drop',
    requiredCharacters: []
  },
  {
    id: 'uni_t2_exp_magnet',
    name: 'EXP Magnet',
    nameCN: '经验磁铁',
    description: '经验值获取 +30%',
    route: 'universal',
    tier: 2,
    color: '#e2e8f0',
    statChanges: {},
    passiveId: 'exp_boost',
    requiredCharacters: []
  }
];

/**
 * 通用路线在天赋池中的刷新权重（低概率出现）
 */
export const UNIVERSAL_WEIGHT = 15; // 15% 概率出现通用天赋

/**
 * 根据 ID 获取天赋定义
 * @param {string} talentId
 * @returns {TalentDef|null}
 */
export function getTalentById(talentId) {
  return TALENTS.find(t => t.id === talentId) || null;
}

/**
 * 按路线和层级筛选天赋
 * @param {string} route
 * @param {number} tier
 * @returns {TalentDef[]}
 */
export function getTalentsByRouteTier(route, tier) {
  return TALENTS.filter(t => t.route === route && t.tier === tier);
}
