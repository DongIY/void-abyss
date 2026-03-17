/**
 * ═══════════════════════════════════════════════════════════════
 *  🏗️ Void Abyss — Level Data
 *  5层地牢配置：房间数/难度/敌人种类/精英概率/Boss
 *  难度倍率: [1.0, 1.5, 2.0, 2.6, 3.2]
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * 层级配置数组
 * @type {Array<{
 *   layer: number,
 *   name: string,
 *   nameCN: string,
 *   roomCount: {min: number, max: number},
 *   difficulty: number,
 *   hpMultiplier: number,
 *   dmgMultiplier: number,
 *   enemyTypes: string[],
 *   eliteChance: number,
 *   bossId: string,
 *   hasShop: boolean,
 *   bgmTrack: string,
 *   ambientColor: string,
 *   newMechanic: string
 * }>}
 */
export const LEVELS = [
  {
    layer: 1,
    name: 'Stardust Corridor',
    nameCN: '星尘走廊',
    roomCount: { min: 3, max: 4 },
    difficulty: 1.0,
    hpMultiplier: 1.0,
    dmgMultiplier: 1.0,
    enemyTypes: ['void_wisp', 'rift_bat', 'abyss_spider'],
    eliteChance: 0.10,
    bossId: 'boss_euler',
    hasShop: false,
    bgmTrack: 'bgm_explore_1',
    ambientColor: '#1a1a3a',
    newMechanic: '基础战斗教学'
  },
  {
    layer: 2,
    name: 'Dark Matter Vein',
    nameCN: '暗物质矿脉',
    roomCount: { min: 3, max: 5 },
    difficulty: 1.5,
    hpMultiplier: 1.5,
    dmgMultiplier: 1.4,
    enemyTypes: ['void_wisp', 'rift_bat', 'abyss_spider', 'shadow_sentinel', 'crystal_golem'],
    eliteChance: 0.20,
    bossId: 'boss_prism',
    hasShop: true,
    bgmTrack: 'bgm_explore_2',
    ambientColor: '#1a102a',
    newMechanic: '机关陷阱、精英怪'
  },
  {
    layer: 3,
    name: 'Void Rift',
    nameCN: '虚空裂缝',
    roomCount: { min: 3, max: 5 },
    difficulty: 2.0,
    hpMultiplier: 2.0,
    dmgMultiplier: 1.8,
    enemyTypes: ['void_wisp', 'rift_bat', 'abyss_spider', 'shadow_sentinel', 'crystal_golem', 'void_mage', 'flame_wraith'],
    eliteChance: 0.25,
    bossId: 'boss_nyx',
    hasShop: false,
    bgmTrack: 'bgm_explore_3',
    ambientColor: '#120828',
    newMechanic: '元素房间、元素反应'
  },
  {
    layer: 4,
    name: 'Chrono Warp',
    nameCN: '时空扭曲',
    roomCount: { min: 4, max: 5 },
    difficulty: 2.6,
    hpMultiplier: 2.6,
    dmgMultiplier: 2.2,
    enemyTypes: ['rift_bat', 'abyss_spider', 'shadow_sentinel', 'crystal_golem', 'void_mage', 'flame_wraith', 'ice_construct', 'thunder_elemental', 'chrono_shifter'],
    eliteChance: 0.35,
    bossId: 'boss_chronos',
    hasShop: true,
    bgmTrack: 'bgm_explore_4',
    ambientColor: '#0a0520',
    newMechanic: '组合精英、诅咒'
  },
  {
    layer: 5,
    name: 'Heart of the Abyss',
    nameCN: '深渊之心',
    roomCount: { min: 4, max: 5 },
    difficulty: 3.2,
    hpMultiplier: 3.2,
    dmgMultiplier: 2.8,
    enemyTypes: ['shadow_sentinel', 'crystal_golem', 'void_mage', 'flame_wraith', 'ice_construct', 'thunder_elemental', 'chrono_shifter', 'abyss_knight', 'void_horror', 'reality_breaker', 'doom_herald'],
    eliteChance: 0.45,
    bossId: 'boss_ophelia',
    hasShop: false,
    bgmTrack: 'bgm_explore_5',
    ambientColor: '#050008',
    newMechanic: '虚空侵蚀、Boss Rush'
  }
];

/**
 * 房间类型分配权重
 * normal: 普通战斗房, elite: 精英战斗, treasure: 宝藏房,
 * event: 事件房, boss: Boss房(固定末尾), shop: 商店房(层配置决定)
 */
export const ROOM_WEIGHTS = {
  normal: 60,
  elite: 12,
  treasure: 8,
  event: 10
  // boss 和 shop 不参与权重，固定分配
};

/**
 * 根据层级获取配置
 * @param {number} layer - 层级(1-5)
 * @returns {Object|null} 层级配置
 */
export function getLevelConfig(layer) {
  return LEVELS.find(l => l.layer === layer) || null;
}

/**
 * 获取难度系数（Sigmoid曲线）
 * @param {number} layer - 层级(1-5)
 * @param {number} roomIndex - 房间索引(从0开始)
 * @returns {number} 难度系数
 */
export function getDifficultyCoefficient(layer, roomIndex) {
  const avgRoomsPerLayer = 4;
  const progress = (layer - 1) * avgRoomsPerLayer + roomIndex;
  const sigmoid = 1 / (1 + Math.exp(-0.15 * (progress - 10)));
  const levelConfig = getLevelConfig(layer);
  const layerMult = levelConfig ? levelConfig.difficulty : 1.0;
  return sigmoid * layerMult;
}

/**
 * 经验值需求公式
 * @param {number} level - 当前等级
 * @returns {number} 升到下一级需要的经验
 */
export function expToNextLevel(level) {
  return Math.floor(10 * Math.pow(level, 1.5) + 5 * level);
}

/**
 * 每级属性增长
 */
export const LEVEL_UP_GAINS = {
  hp: 5,
  mp: 3,
  atk: 1,
  def: 1
};
