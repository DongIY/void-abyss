/**
 * ═══════════════════════════════════════════════════════════════
 *  💾 Void Abyss — Save Manager
 *  跨局数据存档 / Meta-progression / 断线恢复 / 导入导出
 *  存储: localStorage, try-catch 包裹
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';

// ─── 存储键名 ───
const SAVE_KEY = 'void_abyss_progress';
const RUN_STATE_KEY = 'void_abyss_run_state';
const TUTORIAL_KEY = 'void_abyss_tutorial_done';
const SAVE_VERSION = 1;

// ─── 默认进度结构 ───
function defaultProgress() {
  return {
    version: SAVE_VERSION,
    totalShards: 0,
    totalRuns: 0,
    bestLayer: 0,
    totalKills: 0,
    totalTime: 0,
    unlockedCharacters: ['abyssal_knight'], // 深渊战士默认解锁
    permanentUpgrades: {},
    runHistory: [],        // 最近 10 局结算记录
    achievements: [],
    statistics: {
      maxCombo: 0,
      bossesKilled: 0,
      itemsCollected: 0,
      synergiesTriggered: 0,
      perfectParries: 0
    }
  };
}

// ─── 内部工具 ───

function _read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Save] Failed to read '${key}':`, err);
    return null;
  }
}

function _write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn(`[Save] Failed to write '${key}':`, err);
    return false;
  }
}

function _remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Save] Failed to remove '${key}':`, err);
  }
}

export const SaveManager = {
  /**
   * 保存 Run 结算
   * @param {Object} runResult
   * @param {number} runResult.shardsEarned - 本局获得碎片
   * @param {number} runResult.layerReached - 到达层级
   * @param {number} runResult.bossesKilled - 击败 Boss 数
   * @param {string} runResult.characterUsed - 使用角色
   * @param {Object} runResult.stats - 统计数据 {kills, maxCombo, time, itemsCollected}
   * @returns {boolean} 保存是否成功
   */
  saveRun(runResult) {
    const progress = this.loadProgress();

    // 累加碎片
    progress.totalShards += runResult.shardsEarned || 0;
    progress.totalRuns += 1;
    progress.totalKills += (runResult.stats && runResult.stats.kills) || 0;
    progress.totalTime += (runResult.stats && runResult.stats.time) || 0;

    // 最佳层级
    if (runResult.layerReached > progress.bestLayer) {
      progress.bestLayer = runResult.layerReached;
    }

    // 统计
    const stats = runResult.stats || {};
    if (stats.maxCombo > progress.statistics.maxCombo) {
      progress.statistics.maxCombo = stats.maxCombo;
    }
    progress.statistics.bossesKilled += runResult.bossesKilled || 0;
    progress.statistics.itemsCollected += stats.itemsCollected || 0;

    // 记录最近 10 局
    progress.runHistory.unshift({
      date: Date.now(),
      character: runResult.characterUsed,
      layer: runResult.layerReached,
      shards: runResult.shardsEarned,
      kills: stats.kills || 0,
      time: stats.time || 0
    });
    if (progress.runHistory.length > 10) {
      progress.runHistory.length = 10;
    }

    const success = _write(SAVE_KEY, progress);

    if (success) {
      // 清除未完成 Run 状态
      this.clearRunState();
      EventBus.emit('save:runSaved', { metaProgress: progress });
      console.log(`[Save] Run saved — +${runResult.shardsEarned} shards, total: ${progress.totalShards}`);
    }

    return success;
  },

  /**
   * 加载跨局进度
   * @returns {Object} MetaProgress
   */
  loadProgress() {
    const saved = _read(SAVE_KEY);
    if (!saved) {
      return defaultProgress();
    }

    // 版本迁移（未来用）
    if (!saved.version || saved.version < SAVE_VERSION) {
      const defaults = defaultProgress();
      return { ...defaults, ...saved, version: SAVE_VERSION };
    }

    return saved;
  },

  /**
   * 解锁角色
   * @param {string} characterId - 角色 ID
   * @param {number} cost - 碎片花费
   * @returns {{success: boolean, remainingShards: number}}
   */
  unlockCharacter(characterId, cost) {
    const progress = this.loadProgress();

    if (progress.unlockedCharacters.includes(characterId)) {
      return { success: false, remainingShards: progress.totalShards, reason: 'already_unlocked' };
    }

    if (progress.totalShards < cost) {
      return { success: false, remainingShards: progress.totalShards, reason: 'insufficient_shards' };
    }

    progress.totalShards -= cost;
    progress.unlockedCharacters.push(characterId);
    _write(SAVE_KEY, progress);

    EventBus.emit('save:characterUnlocked', { characterId });
    console.log(`[Save] Character unlocked: ${characterId}, remaining: ${progress.totalShards}`);

    return { success: true, remainingShards: progress.totalShards };
  },

  /**
   * 购买永久升级
   * @param {string} upgradeId - 升级 ID
   * @param {number} cost - 碎片花费
   * @returns {{success: boolean, remainingShards: number}}
   */
  purchaseUpgrade(upgradeId, cost) {
    const progress = this.loadProgress();

    if (progress.totalShards < cost) {
      return { success: false, remainingShards: progress.totalShards, reason: 'insufficient_shards' };
    }

    progress.totalShards -= cost;

    // 升级等级递增
    if (!progress.permanentUpgrades[upgradeId]) {
      progress.permanentUpgrades[upgradeId] = 0;
    }
    progress.permanentUpgrades[upgradeId] += 1;

    _write(SAVE_KEY, progress);
    console.log(`[Save] Upgrade purchased: ${upgradeId} (Lv.${progress.permanentUpgrades[upgradeId]})`);

    return { success: true, remainingShards: progress.totalShards };
  },

  // ─── Run 状态保存/恢复（断线恢复） ───

  /**
   * 保存当前 Run 状态（用于断线恢复）
   * @param {Object} state - 精简版 GameState
   * @returns {boolean}
   */
  saveRunState(state) {
    return _write(RUN_STATE_KEY, {
      timestamp: Date.now(),
      state
    });
  },

  /**
   * 获取未完成的 Run 状态
   * @returns {Object|null} GameState 或 null
   */
  getUnfinishedRun() {
    const data = _read(RUN_STATE_KEY);
    if (!data || !data.state) return null;

    // 超过 24 小时视为过期
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      this.clearRunState();
      return null;
    }

    return data.state;
  },

  /**
   * 清除 Run 状态
   */
  clearRunState() {
    _remove(RUN_STATE_KEY);
  },

  // ─── 导入/导出 ───

  /**
   * 导出存档为 JSON 字符串
   * @returns {string} Base64 编码的 JSON
   */
  exportSave() {
    const progress = this.loadProgress();
    try {
      const json = JSON.stringify(progress);
      return btoa(encodeURIComponent(json));
    } catch (err) {
      console.error('[Save] Export failed:', err);
      return '';
    }
  },

  /**
   * 导入存档
   * @param {string} encoded - Base64 编码的 JSON 字符串
   * @returns {boolean} 导入是否成功
   */
  importSave(encoded) {
    try {
      const json = decodeURIComponent(atob(encoded));
      const data = JSON.parse(json);

      // 基本验证
      if (!data || typeof data.totalShards !== 'number') {
        console.error('[Save] Import failed: invalid data structure');
        return false;
      }

      // 合并版本号
      data.version = SAVE_VERSION;

      const success = _write(SAVE_KEY, data);
      if (success) {
        console.log('[Save] Import successful');
      }
      return success;
    } catch (err) {
      console.error('[Save] Import failed:', err);
      return false;
    }
  },

  /**
   * 重置所有存档数据（危险操作）
   * @returns {boolean}
   */
  resetAll() {
    const success = _write(SAVE_KEY, defaultProgress());
    this.clearRunState();
    _remove(TUTORIAL_KEY);
    console.log('[Save] All data reset');
    return success;
  },

  // ─── 教学系统 ───

  /**
   * 检查教学是否已完成
   * @returns {boolean}
   */
  isTutorialDone() {
    return !!_read(TUTORIAL_KEY);
  },

  /**
   * 标记教学已完成
   */
  setTutorialDone() {
    _write(TUTORIAL_KEY, { done: true, date: Date.now() });
    console.log('[Save] Tutorial marked as done');
  }
};
