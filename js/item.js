/**
 * ═══════════════════════════════════════════════════════════════
 *  🎒 Void Abyss — Item System
 *  背包管理 / 装备系统 / Synergy 判定 / 掉落生成 / 消耗品使用
 *  背包上限 12 格, 装备槽: weapon/armor/accessory1/accessory2
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { ITEMS, SYNERGIES, QUALITY, DROP_RATES, getItemById } from './data/items.js';
import { randomRange } from './utils.js';

// ─── 内部状态 ───
let _items = [];          // 背包内道具 [{itemId, count}]
let _maxSlots = 12;
let _equipment = {
  weapon: null,           // itemId
  armor: null,
  accessory1: null,
  accessory2: null
};
let _activeSynergies = []; // 当前激活的 Synergy ID

export const ItemSystem = {
  /**
   * 重置道具系统（新局开始）
   */
  reset() {
    _items = [];
    _maxSlots = 12;
    _equipment = { weapon: null, armor: null, accessory1: null, accessory2: null };
    _activeSynergies = [];
  },

  /**
   * 添加道具到背包
   * @param {string} itemId - 道具 ID
   * @param {number} [count=1] - 数量（消耗品可叠加）
   * @returns {{success: boolean, reason?: string}}
   */
  addItem(itemId, count = 1) {
    const itemDef = getItemById(itemId);
    if (!itemDef) {
      return { success: false, reason: 'unknown_item' };
    }

    // 消耗品可叠加
    if (itemDef.type === 'consumable') {
      const existing = _items.find(i => i.itemId === itemId);
      if (existing) {
        existing.count += count;
        EventBus.emit('item:acquired', { itemId, itemData: itemDef, count: existing.count });
        return { success: true };
      }
    }

    // 检查背包空间
    if (_items.length >= _maxSlots) {
      return { success: false, reason: 'inventory_full' };
    }

    _items.push({ itemId, count });
    EventBus.emit('item:acquired', { itemId, itemData: itemDef, count });

    // 检查 Synergy
    const newSynergies = this.checkSynergy();
    for (const syn of newSynergies) {
      if (syn.isNew) {
        EventBus.emit('item:synergy', { synergy: syn });
      }
    }

    return { success: true };
  },

  /**
   * 移除道具
   * @param {string} itemId - 道具 ID
   * @param {number} [count=1] - 移除数量
   * @returns {boolean} 是否成功
   */
  removeItem(itemId, count = 1) {
    const idx = _items.findIndex(i => i.itemId === itemId);
    if (idx === -1) return false;

    _items[idx].count -= count;
    if (_items[idx].count <= 0) {
      _items.splice(idx, 1);
    }

    EventBus.emit('item:removed', { itemId });

    // 重新检查 Synergy（可能因移除而失效）
    this._recalcSynergies();

    return true;
  },

  /**
   * 装备道具
   * @param {string} itemId - 道具 ID
   * @param {string} slot - 装备槽 (weapon/armor/accessory1/accessory2)
   * @returns {{success: boolean, unequippedItemId?: string}}
   */
  equipItem(itemId, slot) {
    const itemDef = getItemById(itemId);
    if (!itemDef) return { success: false };

    // 验证道具类型与槽位匹配
    const validSlots = {
      weapon: 'weapon',
      armor: 'armor',
      accessory1: 'accessory',
      accessory2: 'accessory'
    };
    if (validSlots[slot] !== itemDef.type) {
      return { success: false, reason: 'slot_mismatch' };
    }

    // 验证道具在背包中
    const inBag = _items.find(i => i.itemId === itemId);
    if (!inBag) return { success: false, reason: 'not_in_inventory' };

    // 卸下当前装备（放回背包）
    let unequippedItemId = null;
    if (_equipment[slot]) {
      unequippedItemId = _equipment[slot];
      // 不需要 addItem，因为装备仍然在背包中
    }

    // 装备
    _equipment[slot] = itemId;

    EventBus.emit('item:equipped', { itemId, slot, unequippedItemId });
    EventBus.emit('player:statsChanged', { source: 'equipment' });

    // 重新检查 Synergy
    this._recalcSynergies();

    return { success: true, unequippedItemId };
  },

  /**
   * 获取背包状态
   * @returns {{items: Array, maxSlots: number, equipment: Object, activeSynergies: Array}}
   */
  getInventory() {
    return {
      items: _items.map(i => ({
        ...i,
        data: getItemById(i.itemId)
      })),
      maxSlots: _maxSlots,
      equipment: { ..._equipment },
      activeSynergies: _activeSynergies.slice()
    };
  },

  /**
   * 检查 Synergy
   * @returns {Array<{synergyId, name, nameCN, requiredItems, effect, isNew}>}
   */
  checkSynergy() {
    const allItemIds = new Set(_items.map(i => i.itemId));
    const result = [];

    for (const syn of SYNERGIES) {
      const hasAll = syn.requiredItems.every(id => allItemIds.has(id));
      if (hasAll) {
        const isNew = !_activeSynergies.includes(syn.id);
        result.push({
          synergyId: syn.id,
          name: syn.name,
          nameCN: syn.nameCN,
          requiredItems: syn.requiredItems,
          effect: syn.effect,
          isNew
        });
        if (isNew) {
          _activeSynergies.push(syn.id);
        }
      }
    }

    return result;
  },

  /**
   * 使用消耗品
   * @param {string} itemId - 道具 ID
   * @returns {{used: boolean, effect?: Object}}
   */
  useItem(itemId) {
    const itemDef = getItemById(itemId);
    if (!itemDef || itemDef.type !== 'consumable') {
      return { used: false };
    }

    const inBag = _items.find(i => i.itemId === itemId);
    if (!inBag || inBag.count <= 0) {
      return { used: false };
    }

    // 消耗
    inBag.count -= 1;
    if (inBag.count <= 0) {
      const idx = _items.indexOf(inBag);
      if (idx !== -1) _items.splice(idx, 1);
    }

    EventBus.emit('item:used', { itemId, effect: itemDef.effect });

    return { used: true, effect: itemDef.effect };
  },

  /**
   * 生成掉落物
   * @param {'normal'|'elite'|'boss'|'chest'} sourceType - 来源类型
   * @param {number} layer - 当前层级(1-5)
   * @returns {Array<{itemId, x, y, quality}>}
   */
  generateLoot(sourceType, layer) {
    const rates = DROP_RATES[sourceType] || DROP_RATES.normal;
    const drops = [];

    // 决定掉落数量
    let dropCount = 1;
    if (sourceType === 'elite') dropCount = 1 + Math.floor(Math.random() * 2); // 1-2
    if (sourceType === 'boss') dropCount = 2 + Math.floor(Math.random() * 2);  // 2-3
    if (sourceType === 'chest') dropCount = 1 + Math.floor(Math.random() * 2); // 1-2

    for (let i = 0; i < dropCount; i++) {
      // 随机品质
      const roll = Math.random() * 100;
      let quality = 'common';
      let cumulative = 0;
      for (const [q, chance] of Object.entries(rates)) {
        cumulative += chance;
        if (roll < cumulative) {
          quality = q;
          break;
        }
      }

      // 从该品质的道具中随机选一个
      const candidates = ITEMS.filter(item =>
        item.quality === quality &&
        item.type !== 'consumable'
      );

      // 如果没有该品质道具，尝试消耗品
      let selected;
      if (candidates.length > 0) {
        selected = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // 降级到消耗品
        const consumables = ITEMS.filter(item => item.type === 'consumable');
        selected = consumables[Math.floor(Math.random() * consumables.length)];
      }

      if (selected) {
        drops.push({
          itemId: selected.id,
          x: 0,    // 由调用方设置实际坐标
          y: 0,
          quality: selected.quality
        });
      }
    }

    // 额外金币掉落（总是掉金币）
    const goldAmount = Math.floor((1 + layer * 0.5) * (1 + Math.random() * 2));
    drops.push({
      itemId: '_gold',
      x: 0,
      y: 0,
      quality: 'common',
      goldAmount
    });

    EventBus.emit('item:dropped', { drops });
    return drops;
  },

  /**
   * 计算所有装备的属性加成
   * @returns {Object} 属性加成汇总
   */
  getEquipmentBonuses() {
    const bonuses = {};
    const slots = ['weapon', 'armor', 'accessory1', 'accessory2'];

    for (const slot of slots) {
      const itemId = _equipment[slot];
      if (!itemId) continue;

      const itemDef = getItemById(itemId);
      if (!itemDef || !itemDef.effect) continue;

      for (const [stat, value] of Object.entries(itemDef.effect)) {
        // 跳过非属性字段
        if (typeof value !== 'number') continue;
        bonuses[stat] = (bonuses[stat] || 0) + value;
      }
    }

    return bonuses;
  },

  /**
   * 获取装备的元素
   * @returns {string|null} 武器附带的元素
   */
  getWeaponElement() {
    if (!_equipment.weapon) return null;
    const itemDef = getItemById(_equipment.weapon);
    return itemDef ? itemDef.element : null;
  },

  /**
   * 检查是否拥有特定 Synergy
   * @param {string} synergyId
   * @returns {boolean}
   */
  hasSynergy(synergyId) {
    return _activeSynergies.includes(synergyId);
  },

  /**
   * 扩展背包（天赋/道具效果）
   * @param {number} extraSlots
   */
  expandInventory(extraSlots) {
    _maxSlots += extraSlots;
  },

  // ─── 内部方法 ───

  /** 重新计算 Synergy（移除道具后） */
  _recalcSynergies() {
    const allItemIds = new Set(_items.map(i => i.itemId));
    const stillActive = [];

    for (const synId of _activeSynergies) {
      const syn = SYNERGIES.find(s => s.id === synId);
      if (syn && syn.requiredItems.every(id => allItemIds.has(id))) {
        stillActive.push(synId);
      }
    }

    _activeSynergies = stillActive;
  }
};
