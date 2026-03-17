/**
 * ═══════════════════════════════════════════════════════════════
 *  🏗️ Void Abyss — Dungeon Generator
 *  BSP 算法生成地牢 / 房间管理 / 门与传送 / 层级切换
 *  每层 3-5 个房间，5 层名称:
 *    星尘走廊 / 暗物质矿脉 / 虚空裂缝 / 时空扭曲 / 深渊之心
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { randomInt, seededRandom, generateId } from './utils.js';
import { LEVELS, ROOM_WEIGHTS, getLevelConfig } from './data/levels.js';

// ─── 常量 ───
const MIN_ROOM_W = 640;
const MAX_ROOM_W = 960;
const MIN_ROOM_H = 480;
const MAX_ROOM_H = 640;
const ROOM_PADDING = 64;  // 距墙壁最小间距
const DOOR_SIZE = 32;

// ─── 内部状态 ───
let _currentLayer = 1;
let _currentRoomId = null;
let _rooms = [];           // 当前层所有房间
let _doors = [];           // 所有门
let _layerData = null;
let _rng = Math.random;    // 种子随机函数
let _seed = 0;

// ─── BSP 算法 ───

/**
 * BSP 分割节点
 */
class BSPNode {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left = null;
    this.right = null;
    this.room = null;
  }

  split(minW, minH, rng) {
    if (this.left || this.right) return false;

    // 决定分割方向
    let horizontal = rng() > 0.5;
    if (this.w > this.h && this.w / this.h >= 1.25) horizontal = false;
    if (this.h > this.w && this.h / this.w >= 1.25) horizontal = true;

    const maxSize = horizontal ? this.h : this.w;
    const minSize = horizontal ? minH : minW;

    if (maxSize < minSize * 2) return false;

    const splitPoint = Math.floor(minSize + rng() * (maxSize - minSize * 2));

    if (horizontal) {
      this.left = new BSPNode(this.x, this.y, this.w, splitPoint);
      this.right = new BSPNode(this.x, this.y + splitPoint, this.w, this.h - splitPoint);
    } else {
      this.left = new BSPNode(this.x, this.y, splitPoint, this.h);
      this.right = new BSPNode(this.x + splitPoint, this.y, this.w - splitPoint, this.h);
    }

    return true;
  }

  getLeaves() {
    if (!this.left && !this.right) return [this];
    const leaves = [];
    if (this.left) leaves.push(...this.left.getLeaves());
    if (this.right) leaves.push(...this.right.getLeaves());
    return leaves;
  }
}

/**
 * BSP 生成房间布局
 * @param {number} roomCount - 目标房间数
 * @param {Function} rng - 随机函数
 * @returns {Array} 房间边界数组
 */
function bspGenerate(roomCount, rng) {
  // 以整个层级区域为根节点
  const totalW = roomCount * MAX_ROOM_W;
  const totalH = MAX_ROOM_H * 2;
  const root = new BSPNode(0, 0, totalW, totalH);

  // 递归分割直到叶子节点足够
  const queue = [root];
  let attempts = 0;

  while (queue.length > 0 && attempts < 50) {
    const node = queue.shift();
    if (node.split(MIN_ROOM_W + ROOM_PADDING * 2, MIN_ROOM_H + ROOM_PADDING * 2, rng)) {
      queue.push(node.left);
      queue.push(node.right);
    }
    attempts++;
  }

  // 取叶子节点生成房间
  const leaves = root.getLeaves();
  const rooms = [];

  for (let i = 0; i < Math.min(leaves.length, roomCount); i++) {
    const leaf = leaves[i];
    const roomW = Math.floor(MIN_ROOM_W + rng() * (Math.min(leaf.w - ROOM_PADDING * 2, MAX_ROOM_W) - MIN_ROOM_W));
    const roomH = Math.floor(MIN_ROOM_H + rng() * (Math.min(leaf.h - ROOM_PADDING * 2, MAX_ROOM_H) - MIN_ROOM_H));
    const roomX = Math.floor(leaf.x + ROOM_PADDING + rng() * (leaf.w - roomW - ROOM_PADDING * 2));
    const roomY = Math.floor(leaf.y + ROOM_PADDING + rng() * (leaf.h - roomH - ROOM_PADDING * 2));

    rooms.push({
      left: roomX,
      top: roomY,
      right: roomX + roomW,
      bottom: roomY + roomH
    });
  }

  // 如果 BSP 叶子不足，手动补充
  while (rooms.length < roomCount) {
    const idx = rooms.length;
    const roomW = Math.floor(MIN_ROOM_W + rng() * (MAX_ROOM_W - MIN_ROOM_W));
    const roomH = Math.floor(MIN_ROOM_H + rng() * (MAX_ROOM_H - MIN_ROOM_H));
    rooms.push({
      left: idx * (MAX_ROOM_W + ROOM_PADDING),
      top: 0,
      right: idx * (MAX_ROOM_W + ROOM_PADDING) + roomW,
      bottom: roomH
    });
  }

  return rooms;
}

// ─── 房间类型分配 ───

function assignRoomTypes(roomCount, layerConfig, rng) {
  const types = [];

  // Boss 房固定在末尾
  // 商店房在有配置时固定
  for (let i = 0; i < roomCount; i++) {
    if (i === roomCount - 1) {
      types.push('boss');
    } else if (layerConfig.hasShop && i === Math.floor(roomCount / 2)) {
      types.push('shop');
    } else {
      // 加权随机
      const roll = rng() * 100;
      const total = ROOM_WEIGHTS.normal + ROOM_WEIGHTS.elite + ROOM_WEIGHTS.treasure + ROOM_WEIGHTS.event;
      let cumulative = 0;
      let type = 'normal';

      for (const [t, w] of Object.entries(ROOM_WEIGHTS)) {
        cumulative += (w / total) * 100;
        if (roll < cumulative) {
          type = t;
          break;
        }
      }
      types.push(type);
    }
  }

  // 确保第一个房间是普通（教学）
  if (types[0] !== 'normal') {
    const normalIdx = types.indexOf('normal');
    if (normalIdx > 0) {
      [types[0], types[normalIdx]] = [types[normalIdx], types[0]];
    } else {
      types[0] = 'normal';
    }
  }

  return types;
}

// ─── 生成敌人配置 ───

function generateRoomEnemies(roomType, layerConfig, roomIndex, rng) {
  if (roomType === 'shop' || roomType === 'boss') return [];

  const enemyTypes = layerConfig.enemyTypes;
  const enemies = [];
  let count;

  switch (roomType) {
    case 'normal':
      count = 2 + Math.floor(rng() * 3); // 2-4
      break;
    case 'elite':
      count = 1 + Math.floor(rng() * 2); // 1-2 普通 + 1 精英
      break;
    case 'treasure':
      count = 1 + Math.floor(rng() * 2); // 少量守卫
      break;
    case 'event':
      count = Math.floor(rng() * 2);     // 0-1 可能无敌人
      break;
    default:
      count = 2;
  }

  for (let i = 0; i < count; i++) {
    const enemyId = enemyTypes[Math.floor(rng() * enemyTypes.length)];
    enemies.push({
      enemyId,
      isElite: false,
      relativeX: 0.2 + rng() * 0.6, // 相对房间坐标 0~1
      relativeY: 0.2 + rng() * 0.6
    });
  }

  // 精英房追加精英
  if (roomType === 'elite') {
    const eliteId = enemyTypes[Math.floor(rng() * enemyTypes.length)];
    enemies.push({
      enemyId: eliteId,
      isElite: true,
      relativeX: 0.5,
      relativeY: 0.5
    });
  }

  return enemies;
}

export const DungeonGenerator = {
  /**
   * BSP 生成指定层地牢
   * @param {Object} config
   * @param {number} config.layer - 层级(1-5)
   * @param {number} [config.seed] - 随机种子
   * @returns {Object} DungeonData
   */
  generate(config) {
    _currentLayer = config.layer || 1;
    _seed = config.seed || Date.now();
    _rng = seededRandom(_seed + _currentLayer * 1000);

    const layerConfig = getLevelConfig(_currentLayer);
    if (!layerConfig) {
      console.error(`[Dungeon] Invalid layer: ${_currentLayer}`);
      return null;
    }

    // 房间数量
    const roomCount = randomInt(layerConfig.roomCount.min, layerConfig.roomCount.max);

    // BSP 生成房间布局
    const roomBounds = bspGenerate(roomCount, _rng);

    // 分配房间类型
    const roomTypes = assignRoomTypes(roomCount, layerConfig, _rng);

    // 构建房间数据
    _rooms = [];
    _doors = [];
    let bossRoom = null;
    let shopRoom = null;

    for (let i = 0; i < roomCount; i++) {
      const bounds = roomBounds[i];
      const type = roomTypes[i];
      const roomId = generateId('room');

      const room = {
        id: roomId,
        type,
        index: i,
        bounds,
        enemies: generateRoomEnemies(type, layerConfig, i, _rng),
        items: [],
        doors: [],
        cleared: false,
        explored: i === 0, // 第一个房间默认已探索
        mapX: i,
        mapY: 0
      };

      // 生成门（连接相邻房间）
      if (i > 0) {
        // 与前一个房间的连接门
        const prevRoom = _rooms[i - 1];
        const doorIdForward = generateId('door');
        const doorIdBackward = generateId('door');

        // 前一个房间的出口门（右/下方）
        const exitDoor = {
          id: doorIdForward,
          targetRoomId: roomId,
          x: prevRoom.bounds.right - DOOR_SIZE,
          y: (prevRoom.bounds.top + prevRoom.bounds.bottom) / 2,
          side: 'right'
        };
        prevRoom.doors.push(exitDoor);

        // 当前房间的入口门（左/上方）
        const entryDoor = {
          id: doorIdBackward,
          targetRoomId: prevRoom.id,
          x: bounds.left + DOOR_SIZE,
          y: (bounds.top + bounds.bottom) / 2,
          side: 'left'
        };
        room.doors.push(entryDoor);

        _doors.push(exitDoor, entryDoor);
      }

      if (type === 'boss') bossRoom = roomId;
      if (type === 'shop') shopRoom = roomId;

      _rooms.push(room);
    }

    // 设置当前房间为第一个
    _currentRoomId = _rooms[0].id;

    // 出生点（第一个房间中心）
    const firstRoom = _rooms[0];
    const spawnPoint = {
      x: (firstRoom.bounds.left + firstRoom.bounds.right) / 2,
      y: (firstRoom.bounds.top + firstRoom.bounds.bottom) / 2
    };

    _layerData = {
      layer: _currentLayer,
      name: layerConfig.name,
      nameCN: layerConfig.nameCN,
      rooms: _rooms,
      doors: _doors,
      spawnPoint,
      bossRoom,
      shopRoom,
      seed: _seed,
      roomCount
    };

    EventBus.emit('dungeon:generated', {
      layer: _currentLayer,
      roomCount
    });

    console.log(`[Dungeon] Generated Layer ${_currentLayer}: ${layerConfig.nameCN} (${roomCount} rooms)`);
    return _layerData;
  },

  /**
   * 获取当前房间
   * @returns {Object|null} Room
   */
  getCurrentRoom() {
    return _rooms.find(r => r.id === _currentRoomId) || null;
  },

  /**
   * 切换房间
   * @param {string} roomId - 目标房间 ID
   * @param {string} doorId - 使用的门 ID
   * @returns {{spawnX: number, spawnY: number}} 出生位置
   */
  moveToRoom(roomId, doorId) {
    const fromRoom = this.getCurrentRoom();
    const toRoom = _rooms.find(r => r.id === roomId);

    if (!toRoom) {
      console.warn(`[Dungeon] Room not found: ${roomId}`);
      return { spawnX: 0, spawnY: 0 };
    }

    const fromRoomId = _currentRoomId;
    _currentRoomId = roomId;
    toRoom.explored = true;

    // 计算出生位置（从门对面进入）
    const door = toRoom.doors.find(d => d.id === doorId) || toRoom.doors[0];
    let spawnX, spawnY;

    if (door) {
      // 在门附近出生
      spawnX = door.x + (door.side === 'left' ? 48 : -48);
      spawnY = door.y;
    } else {
      // 降级到房间中心
      spawnX = (toRoom.bounds.left + toRoom.bounds.right) / 2;
      spawnY = (toRoom.bounds.top + toRoom.bounds.bottom) / 2;
    }

    // 确保出生点在房间内
    spawnX = Math.max(toRoom.bounds.left + 32, Math.min(toRoom.bounds.right - 32, spawnX));
    spawnY = Math.max(toRoom.bounds.top + 32, Math.min(toRoom.bounds.bottom - 32, spawnY));

    EventBus.emit('dungeon:roomTransition', {
      fromRoom: fromRoomId,
      toRoom: roomId
    });

    EventBus.emit('dungeon:roomEnter', {
      roomId,
      roomType: toRoom.type
    });

    console.log(`[Dungeon] Moved to room: ${roomId} (${toRoom.type})`);
    return { spawnX, spawnY };
  },

  /**
   * 获取地图数据（小地图用）
   * @returns {Object} MapData
   */
  getMapData() {
    return {
      rooms: _rooms.map(r => ({
        id: r.id,
        type: r.type,
        mapX: r.mapX,
        mapY: r.mapY,
        explored: r.explored,
        cleared: r.cleared
      })),
      currentRoomId: _currentRoomId,
      layer: _currentLayer,
      layerName: _layerData ? _layerData.nameCN : ''
    };
  },

  /**
   * 标记当前房间已清理
   */
  clearCurrentRoom() {
    const room = this.getCurrentRoom();
    if (!room || room.cleared) return;

    room.cleared = true;

    EventBus.emit('dungeon:roomCleared', {
      roomId: room.id,
      loot: room.items
    });

    console.log(`[Dungeon] Room cleared: ${room.id} (${room.type})`);
  },

  /**
   * 进入下一层
   * @returns {Object|null} 新层 DungeonData
   */
  nextLayer() {
    if (_currentLayer >= 5) {
      // 最终层已通关
      EventBus.emit('dungeon:layerComplete', { layer: _currentLayer });
      return null;
    }

    EventBus.emit('dungeon:layerComplete', { layer: _currentLayer });

    _currentLayer++;
    return this.generate({ layer: _currentLayer, seed: _seed });
  },

  /**
   * 获取当前层级
   * @returns {number}
   */
  getCurrentLayer() {
    return _currentLayer;
  },

  /**
   * 获取层级数据
   * @returns {Object|null}
   */
  getLayerData() {
    return _layerData;
  },

  /**
   * 获取所有房间
   * @returns {Array}
   */
  getAllRooms() {
    return _rooms;
  },

  /**
   * 通过 ID 查找房间
   * @param {string} roomId
   * @returns {Object|null}
   */
  getRoomById(roomId) {
    return _rooms.find(r => r.id === roomId) || null;
  },

  /**
   * 检查当前房间是否有存活敌人
   * @returns {boolean}
   */
  isCurrentRoomCleared() {
    const room = this.getCurrentRoom();
    return room ? room.cleared : false;
  },

  /**
   * 获取 Boss 房间 ID
   * @returns {string|null}
   */
  getBossRoomId() {
    return _layerData ? _layerData.bossRoom : null;
  },

  /**
   * 重置（新局开始时）
   */
  reset() {
    _currentLayer = 1;
    _currentRoomId = null;
    _rooms = [];
    _doors = [];
    _layerData = null;
    _seed = 0;
    _rng = Math.random;
  }
};
