/**
 * ═══════════════════════════════════════════════════════════════
 *  👾 Void Abyss — Enemy Data Table
 *  全 5 层敌人 + 精英 + Boss 数据定义
 *  按 enemyId 索引，数据驱动（不含行为逻辑）
 * ═══════════════════════════════════════════════════════════════
 */

// ─── 第 1 层：星尘走廊 · Stardust Corridor ───

const LAYER_1_ENEMIES = {
  void_wisp: {
    id: 'void_wisp',
    name: 'Void Wisp',
    nameCN: '虚空游魂',
    layer: 1,
    hp: 20, atk: 4, def: 1, spd: 120,
    width: 20, height: 20,
    attackType: 'melee',
    attackRange: 30,
    detectionRange: 150,
    attackCooldown: 1.0,
    element: 'none',
    abilities: [],
    loot: { gold: [1, 3], itemChance: 0 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#8b5cf6'
  },

  rift_bat: {
    id: 'rift_bat',
    name: 'Rift Bat',
    nameCN: '裂隙蝠',
    layer: 1,
    hp: 15, atk: 6, def: 0, spd: 250,
    width: 18, height: 18,
    attackType: 'melee',
    attackRange: 25,
    detectionRange: 180,
    attackCooldown: 0.8,
    element: 'none',
    abilities: ['quick_dash'],
    loot: { gold: [2, 4], itemChance: 0 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#6366f1'
  },

  abyss_spider: {
    id: 'abyss_spider',
    name: 'Abyss Spider',
    nameCN: '深渊蛛',
    layer: 1,
    hp: 30, atk: 5, def: 3, spd: 80,
    width: 22, height: 22,
    attackType: 'ranged',
    attackRange: 40,
    detectionRange: 200,
    attackCooldown: 1.5,
    element: 'none',
    abilities: ['ranged_slow'],
    loot: { gold: [2, 5], itemChance: 0.05 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#4c1d95'
  }
};

// ─── 第 2 层：暗物质矿脉 · Dark Matter Vein ───

const LAYER_2_ENEMIES = {
  dark_golem: {
    id: 'dark_golem',
    name: 'Dark Golem',
    nameCN: '暗物质傀儡',
    layer: 2,
    hp: 50, atk: 10, def: 6, spd: 60,
    width: 28, height: 28,
    attackType: 'melee',
    attackRange: 40,
    detectionRange: 140,
    attackCooldown: 1.8,
    element: 'none',
    abilities: ['heavy_strike', 'aoe_stomp'],
    loot: { gold: [4, 8], itemChance: 0.08 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#374151'
  },

  crystal_mage: {
    id: 'crystal_mage',
    name: 'Crystal Mage',
    nameCN: '水晶法师',
    layer: 2,
    hp: 25, atk: 8, def: 2, spd: 100,
    width: 20, height: 20,
    attackType: 'ranged',
    attackRange: 50,
    detectionRange: 220,
    attackCooldown: 1.2,
    element: 'ice',
    abilities: ['magic_bolt'],
    loot: { gold: [3, 7], itemChance: 0.10 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#38bdf8'
  }
};

// ─── 第 3 层：虚空裂缝 · Void Rift ───

const LAYER_3_ENEMIES = {
  void_phantom: {
    id: 'void_phantom',
    name: 'Void Phantom',
    nameCN: '虚空幻影',
    layer: 3,
    hp: 40, atk: 9, def: 2, spd: 180,
    width: 20, height: 20,
    attackType: 'melee',
    attackRange: 35,
    detectionRange: 200,
    attackCooldown: 0.9,
    element: 'void',
    abilities: ['phase_shift', 'void_strike'],
    loot: { gold: [5, 10], itemChance: 0.12 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#a855f7'
  },

  flame_elemental: {
    id: 'flame_elemental',
    name: 'Flame Elemental',
    nameCN: '焰灵',
    layer: 3,
    hp: 35, atk: 11, def: 1, spd: 110,
    width: 22, height: 22,
    attackType: 'aoe',
    attackRange: 45,
    detectionRange: 170,
    attackCooldown: 2.0,
    element: 'fire',
    abilities: ['fire_burst'],
    loot: { gold: [5, 9], itemChance: 0.10 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#ef4444'
  }
};

// ─── 第 4 层：时空扭曲 · Chrono Warp ───

const LAYER_4_ENEMIES = {
  chrono_sentinel: {
    id: 'chrono_sentinel',
    name: 'Chrono Sentinel',
    nameCN: '时空哨兵',
    layer: 4,
    hp: 60, atk: 14, def: 7, spd: 90,
    width: 26, height: 26,
    attackType: 'melee',
    attackRange: 45,
    detectionRange: 190,
    attackCooldown: 1.4,
    element: 'lightning',
    abilities: ['time_slow', 'lightning_strike'],
    loot: { gold: [8, 15], itemChance: 0.15 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#facc15'
  },

  warp_caster: {
    id: 'warp_caster',
    name: 'Warp Caster',
    nameCN: '扭曲施法者',
    layer: 4,
    hp: 38, atk: 12, def: 3, spd: 130,
    width: 20, height: 20,
    attackType: 'ranged',
    attackRange: 60,
    detectionRange: 250,
    attackCooldown: 1.0,
    element: 'void',
    abilities: ['teleport', 'warp_bolt'],
    loot: { gold: [7, 13], itemChance: 0.15 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#c084fc'
  }
};

// ─── 第 5 层：深渊之心 · Heart of the Abyss ───

const LAYER_5_ENEMIES = {
  abyss_herald: {
    id: 'abyss_herald',
    name: 'Abyss Herald',
    nameCN: '深渊先驱',
    layer: 5,
    hp: 75, atk: 16, def: 8, spd: 100,
    width: 28, height: 28,
    attackType: 'melee',
    attackRange: 50,
    detectionRange: 220,
    attackCooldown: 1.2,
    element: 'void',
    abilities: ['void_slam', 'dark_aura'],
    loot: { gold: [12, 20], itemChance: 0.20 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#7c3aed'
  },

  void_weaver: {
    id: 'void_weaver',
    name: 'Void Weaver',
    nameCN: '虚空织者',
    layer: 5,
    hp: 45, atk: 18, def: 4, spd: 150,
    width: 22, height: 22,
    attackType: 'aoe',
    attackRange: 55,
    detectionRange: 240,
    attackCooldown: 1.5,
    element: 'void',
    abilities: ['void_web', 'dimension_tear'],
    loot: { gold: [10, 18], itemChance: 0.20 },
    isBoss: false,
    isElite: false,
    bossPhases: null,
    spriteColor: '#581c87'
  }
};

// ─── 精英怪 ───

const ELITE_ENEMIES = {
  stardust_guardian: {
    id: 'stardust_guardian',
    name: 'Stardust Guardian',
    nameCN: '星尘守卫',
    layer: 1,
    hp: 150, atk: 12, def: 8, spd: 130,
    width: 30, height: 30,
    attackType: 'melee',
    attackRange: 45,
    detectionRange: 200,
    attackCooldown: 1.2,
    element: 'none',
    abilities: ['teleport', 'aoe_slam'],
    loot: { gold: [15, 25], itemChance: 1.0, guaranteedRarity: 'rare' },
    isBoss: false,
    isElite: true,
    bossPhases: null,
    spriteColor: '#fbbf24'
  },

  dark_matter_titan: {
    id: 'dark_matter_titan',
    name: 'Dark Matter Titan',
    nameCN: '暗物质泰坦',
    layer: 2,
    hp: 225, atk: 17, def: 11, spd: 70,
    width: 34, height: 34,
    attackType: 'melee',
    attackRange: 50,
    detectionRange: 180,
    attackCooldown: 1.5,
    element: 'none',
    abilities: ['ground_slam', 'rock_throw', 'enrage'],
    loot: { gold: [20, 35], itemChance: 1.0, guaranteedRarity: 'rare' },
    isBoss: false,
    isElite: true,
    bossPhases: null,
    spriteColor: '#d97706'
  },

  void_rift_lord: {
    id: 'void_rift_lord',
    name: 'Void Rift Lord',
    nameCN: '虚空裂隙领主',
    layer: 3,
    hp: 300, atk: 20, def: 10, spd: 140,
    width: 32, height: 32,
    attackType: 'ranged',
    attackRange: 55,
    detectionRange: 250,
    attackCooldown: 1.0,
    element: 'void',
    abilities: ['void_barrage', 'phase_shift', 'summon_wisps'],
    loot: { gold: [25, 45], itemChance: 1.0, guaranteedRarity: 'epic' },
    isBoss: false,
    isElite: true,
    bossPhases: null,
    spriteColor: '#9333ea'
  },

  chrono_warden: {
    id: 'chrono_warden',
    name: 'Chrono Warden',
    nameCN: '时空守望者',
    layer: 4,
    hp: 390, atk: 24, def: 14, spd: 120,
    width: 34, height: 34,
    attackType: 'aoe',
    attackRange: 60,
    detectionRange: 230,
    attackCooldown: 1.3,
    element: 'lightning',
    abilities: ['time_freeze', 'lightning_storm', 'teleport'],
    loot: { gold: [30, 55], itemChance: 1.0, guaranteedRarity: 'epic' },
    isBoss: false,
    isElite: true,
    bossPhases: null,
    spriteColor: '#eab308'
  },

  abyss_archon: {
    id: 'abyss_archon',
    name: 'Abyss Archon',
    nameCN: '深渊执政官',
    layer: 5,
    hp: 480, atk: 28, def: 16, spd: 110,
    width: 36, height: 36,
    attackType: 'aoe',
    attackRange: 65,
    detectionRange: 260,
    attackCooldown: 1.0,
    element: 'void',
    abilities: ['void_nova', 'dark_summon', 'dimension_rift'],
    loot: { gold: [40, 70], itemChance: 1.0, guaranteedRarity: 'epic' },
    isBoss: false,
    isElite: true,
    bossPhases: null,
    spriteColor: '#6d28d9'
  }
};

// ─── Boss ───

const BOSS_ENEMIES = {
  boss_euler: {
    id: 'boss_euler',
    name: 'Euler, Stardust Warden',
    nameCN: '星尘守卫·欧拉',
    layer: 1,
    hp: 400, atk: 18, def: 12, spd: 110,
    width: 40, height: 40,
    attackType: 'melee',
    attackRange: 60,
    detectionRange: 300,
    attackCooldown: 2.0,
    element: 'none',
    abilities: ['heavy_strike', 'ground_fissure'],
    loot: { gold: [50, 80], itemChance: 1.0, guaranteedRarity: 'legendary' },
    isBoss: true,
    isElite: false,
    bossPhases: [
      { phase: 1, hpThreshold: 0.66, skills: ['euler_heavy_strike'], cooldown: 2.5, description: '慢速重击+地面裂隙波' },
      { phase: 2, hpThreshold: 0.33, skills: ['euler_heavy_strike', 'euler_split'], cooldown: 3.0, description: '分裂2分身(分身HP30%)' },
      { phase: 3, hpThreshold: 0,    skills: ['euler_heavy_strike', 'euler_split'], cooldown: 1.2, description: '全攻击加速' }
    ],
    spriteColor: '#fbbf24'
  },

  boss_prism: {
    id: 'boss_prism',
    name: 'Prism, Dark Matter Crystal',
    nameCN: '暗物质结晶体·普利兹',
    layer: 2,
    hp: 600, atk: 15, def: 10, spd: 90,
    width: 44, height: 44,
    attackType: 'ranged',
    attackRange: 70,
    detectionRange: 350,
    attackCooldown: 1.5,
    element: 'ice',
    abilities: ['prism_bolt', 'web_trap'],
    loot: { gold: [80, 120], itemChance: 1.0, guaranteedRarity: 'legendary' },
    isBoss: true,
    isElite: false,
    bossPhases: [
      { phase: 1, hpThreshold: 0.66, skills: ['prism_bolt'], cooldown: 2.0, description: '单体远程弹幕' },
      { phase: 2, hpThreshold: 0.33, skills: ['prism_bolt', 'prism_summon_spiders'], cooldown: 2.5, description: '召唤蛛群(3只)' },
      { phase: 3, hpThreshold: 0,    skills: ['prism_bolt', 'prism_barrage_8dir'], cooldown: 2.0, description: '全屏弹幕(8方向)' }
    ],
    spriteColor: '#38bdf8'
  },

  boss_nyx: {
    id: 'boss_nyx',
    name: 'Nyx, Void Ripper',
    nameCN: '虚空撕裂者·尼克斯',
    layer: 3,
    hp: 800, atk: 20, def: 8, spd: 120,
    width: 42, height: 42,
    attackType: 'ranged',
    attackRange: 65,
    detectionRange: 320,
    attackCooldown: 1.8,
    element: 'void',
    abilities: ['nyx_element_attack', 'element_switch'],
    loot: { gold: [100, 160], itemChance: 1.0, guaranteedRarity: 'legendary' },
    isBoss: true,
    isElite: false,
    bossPhases: [
      { phase: 1, hpThreshold: 0.66, skills: ['nyx_element_attack'], cooldown: 2.5, description: '单元素攻击(火)' },
      { phase: 2, hpThreshold: 0.33, skills: ['nyx_element_attack'], cooldown: 2.2, description: '双元素轮换(火+冰)' },
      { phase: 3, hpThreshold: 0,    skills: ['nyx_element_attack', 'nyx_element_pillar'], cooldown: 1.8, description: '三元素轮换+元素柱' }
    ],
    spriteColor: '#a855f7'
  },

  boss_chronos: {
    id: 'boss_chronos',
    name: 'Chronos, Lord of Time',
    nameCN: '时空领主·克罗诺斯',
    layer: 4,
    hp: 1000, atk: 25, def: 15, spd: 80,
    width: 48, height: 48,
    attackType: 'melee',
    attackRange: 70,
    detectionRange: 300,
    attackCooldown: 2.0,
    element: 'lightning',
    abilities: ['chronos_hammer', 'ground_shockwave'],
    loot: { gold: [150, 220], itemChance: 1.0, guaranteedRarity: 'legendary' },
    isBoss: true,
    isElite: false,
    bossPhases: [
      { phase: 1, hpThreshold: 0.66, skills: ['chronos_hammer'], cooldown: 2.0, description: '近战锤击' },
      { phase: 2, hpThreshold: 0.33, skills: ['chronos_hammer', 'chronos_laser_sweep'], cooldown: 3.0, description: '激光扫射(旋转)' },
      { phase: 3, hpThreshold: 0,    skills: ['chronos_hammer', 'chronos_laser_sweep', 'chronos_meteor'], cooldown: 2.5, description: '陨石(随机落点×5)' }
    ],
    spriteColor: '#facc15'
  },

  boss_ophelia: {
    id: 'boss_ophelia',
    name: 'Ophelia, Heart of the Abyss',
    nameCN: '深渊之心·虚无（奥菲利亚）',
    layer: 5,
    hp: 1500, atk: 30, def: 12, spd: 130,
    width: 50, height: 50,
    attackType: 'aoe',
    attackRange: 80,
    detectionRange: 400,
    attackCooldown: 1.5,
    element: 'void',
    abilities: ['ophelia_void_blast', 'ophelia_blackhole', 'ophelia_spatial_warp'],
    loot: { gold: [200, 350], itemChance: 1.0, guaranteedRarity: 'legendary' },
    isBoss: true,
    isElite: false,
    bossPhases: [
      { phase: 1, hpThreshold: 0.66, skills: ['ophelia_void_blast'], cooldown: 2.5, description: '常规混合攻击' },
      { phase: 2, hpThreshold: 0.33, skills: ['ophelia_void_blast', 'ophelia_blackhole'], cooldown: 3.5, description: '黑洞吸引(中心点持续拉扯)' },
      { phase: 3, hpThreshold: 0,    skills: ['ophelia_void_blast', 'ophelia_blackhole', 'ophelia_spatial_warp'], cooldown: 2.0, description: '空间扭曲(全屏随机伤害区域)' }
    ],
    spriteColor: '#6d28d9'
  }
};

// ═══════════════════════════════════════════
//  汇总导出
// ═══════════════════════════════════════════

/** 所有敌人按 enemyId 索引 */
export const ENEMIES = {
  ...LAYER_1_ENEMIES,
  ...LAYER_2_ENEMIES,
  ...LAYER_3_ENEMIES,
  ...LAYER_4_ENEMIES,
  ...LAYER_5_ENEMIES,
  ...ELITE_ENEMIES,
  ...BOSS_ENEMIES
};

/** 按层级分组查询 */
export const ENEMIES_BY_LAYER = {
  1: { normal: LAYER_1_ENEMIES, elite: { stardust_guardian: ELITE_ENEMIES.stardust_guardian }, boss: { boss_euler: BOSS_ENEMIES.boss_euler } },
  2: { normal: LAYER_2_ENEMIES, elite: { dark_matter_titan: ELITE_ENEMIES.dark_matter_titan }, boss: { boss_prism: BOSS_ENEMIES.boss_prism } },
  3: { normal: LAYER_3_ENEMIES, elite: { void_rift_lord: ELITE_ENEMIES.void_rift_lord }, boss: { boss_nyx: BOSS_ENEMIES.boss_nyx } },
  4: { normal: LAYER_4_ENEMIES, elite: { chrono_warden: ELITE_ENEMIES.chrono_warden }, boss: { boss_chronos: BOSS_ENEMIES.boss_chronos } },
  5: { normal: LAYER_5_ENEMIES, elite: { abyss_archon: ELITE_ENEMIES.abyss_archon }, boss: { boss_ophelia: BOSS_ENEMIES.boss_ophelia } }
};

/** 难度倍率表（应用于 HP/ATK/DEF 的层级缩放） */
export const LAYER_SCALING = {
  1: { hp: 1.0, atk: 1.0, def: 1.0 },
  2: { hp: 1.5, atk: 1.4, def: 1.3 },
  3: { hp: 2.0, atk: 1.8, def: 1.6 },
  4: { hp: 2.6, atk: 2.2, def: 2.0 },
  5: { hp: 3.2, atk: 2.8, def: 2.4 }
};

/**
 * 获取缩放后的敌人数据（应用层级倍率）
 * @param {string} enemyId - 敌人 ID
 * @param {number} [layer] - 目标层级（Boss/精英用自身层级）
 * @returns {Object|null} 深拷贝的缩放后数据
 */
export function getScaledEnemy(enemyId, layer) {
  const base = ENEMIES[enemyId];
  if (!base) return null;

  const targetLayer = layer || base.layer;
  const scale = LAYER_SCALING[targetLayer] || LAYER_SCALING[1];

  // Boss 和精英用自身数值（已在数据中预设高数值），不额外缩放
  if (base.isBoss || base.isElite) {
    return { ...base };
  }

  return {
    ...base,
    hp: Math.round(base.hp * scale.hp),
    atk: Math.round(base.atk * scale.atk),
    def: Math.round(base.def * scale.def),
    // 金币掉落也按层级提升
    loot: {
      ...base.loot,
      gold: [
        Math.round(base.loot.gold[0] * (1 + (targetLayer - 1) * 0.3)),
        Math.round(base.loot.gold[1] * (1 + (targetLayer - 1) * 0.3))
      ]
    }
  };
}
