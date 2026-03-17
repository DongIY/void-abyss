/**
 * ═══════════════════════════════════════════════════════════════
 *  💥 Void Abyss — Collision System
 *  空间哈希网格 + AABB + 圆形碰撞检测 + 射线检测
 *  cellSize=64, 优化同屏实体碰撞检测性能
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';

// ─── 内部状态 ───
let _cellSize = 64;
let _invCellSize = 1 / 64;

// 空间哈希: key="col_row" → Set<entity>
const _grid = {};

// ─── 网格工具 ───

function cellKey(col, row) {
  return `${col}_${row}`;
}

function getCellCoords(x, y) {
  return {
    col: Math.floor(x * _invCellSize),
    row: Math.floor(y * _invCellSize)
  };
}

/**
 * 获取实体覆盖的所有格子坐标
 */
function getEntityCells(entity) {
  const hw = (entity.width || entity.radius * 2 || 32) / 2;
  const hh = (entity.height || entity.radius * 2 || 32) / 2;
  const minCol = Math.floor((entity.x - hw) * _invCellSize);
  const maxCol = Math.floor((entity.x + hw) * _invCellSize);
  const minRow = Math.floor((entity.y - hh) * _invCellSize);
  const maxRow = Math.floor((entity.y + hh) * _invCellSize);
  const cells = [];
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      cells.push(cellKey(c, r));
    }
  }
  return cells;
}

export const Collision = {
  /**
   * 初始化碰撞系统
   * @param {Object} [config]
   * @param {number} [config.cellSize=64] - 空间哈希格子尺寸
   */
  init(config = {}) {
    _cellSize = config.cellSize || 64;
    _invCellSize = 1 / _cellSize;
    this.clearGrid();
  },

  /**
   * 更新空间哈希网格
   * @param {Array} entities - 所有活跃实体数组
   */
  updateGrid(entities) {
    // 清空网格
    const keys = Object.keys(_grid);
    for (let i = 0; i < keys.length; i++) {
      delete _grid[keys[i]];
    }

    // 插入实体
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity || !entity.alive) continue;
      const cells = getEntityCells(entity);
      for (let j = 0; j < cells.length; j++) {
        const key = cells[j];
        if (!_grid[key]) {
          _grid[key] = [];
        }
        _grid[key].push(entity);
      }
    }
  },

  /**
   * 检测所有碰撞
   * @param {Array} entities - 所有活跃实体数组
   * @returns {Array<{entityA, entityB, type: string, overlap: number}>} 碰撞结果
   */
  detect(entities) {
    this.updateGrid(entities);
    const results = [];
    const checked = new Set(); // 避免重复检测 "A_B" / "B_A"

    const keys = Object.keys(_grid);
    for (let k = 0; k < keys.length; k++) {
      const cell = _grid[keys[k]];
      if (!cell || cell.length < 2) continue;

      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          const a = cell[i];
          const b = cell[j];

          // 跳过同类型碰撞检测（可优化）
          const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          if (checked.has(pairKey)) continue;
          checked.add(pairKey);

          // 根据碰撞体形状选择检测方式
          let collision = false;
          let overlap = 0;

          if (a.colliderType === 'circle' && b.colliderType === 'circle') {
            const result = this.checkCircle(a, b);
            collision = result.hit;
            overlap = result.overlap;
          } else {
            const result = this.checkAABB(a, b);
            collision = result.hit;
            overlap = result.overlap;
          }

          if (collision) {
            results.push({
              entityA: a,
              entityB: b,
              type: `${a.type || 'unknown'}_${b.type || 'unknown'}`,
              overlap
            });
          }
        }
      }
    }

    return results;
  },

  /**
   * AABB 碰撞检测
   * @param {{x,y,width?,height?}} a - 实体 A
   * @param {{x,y,width?,height?}} b - 实体 B
   * @returns {{hit: boolean, overlap: number}}
   */
  checkAABB(a, b) {
    const aw = a.width || 32;
    const ah = a.height || 32;
    const bw = b.width || 32;
    const bh = b.height || 32;

    const aLeft = a.x - aw / 2;
    const aRight = a.x + aw / 2;
    const aTop = a.y - ah / 2;
    const aBottom = a.y + ah / 2;

    const bLeft = b.x - bw / 2;
    const bRight = b.x + bw / 2;
    const bTop = b.y - bh / 2;
    const bBottom = b.y + bh / 2;

    if (aRight <= bLeft || aLeft >= bRight || aBottom <= bTop || aTop >= bBottom) {
      return { hit: false, overlap: 0 };
    }

    // 计算重叠量
    const overlapX = Math.min(aRight - bLeft, bRight - aLeft);
    const overlapY = Math.min(aBottom - bTop, bBottom - aTop);
    return { hit: true, overlap: Math.min(overlapX, overlapY) };
  },

  /**
   * 圆形碰撞检测
   * @param {{x,y,radius?}} a - 实体 A
   * @param {{x,y,radius?}} b - 实体 B
   * @returns {{hit: boolean, overlap: number}}
   */
  checkCircle(a, b) {
    const ra = a.radius || 16;
    const rb = b.radius || 16;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distSq = dx * dx + dy * dy;
    const combinedR = ra + rb;

    if (distSq >= combinedR * combinedR) {
      return { hit: false, overlap: 0 };
    }

    const dist = Math.sqrt(distSq);
    return { hit: true, overlap: combinedR - dist };
  },

  /**
   * 射线检测
   * @param {number} startX - 射线起点 X
   * @param {number} startY - 射线起点 Y
   * @param {number} dirX - 射线方向 X (归一化)
   * @param {number} dirY - 射线方向 Y (归一化)
   * @param {number} maxDistance - 最大检测距离
   * @param {Array} entities - 目标实体数组
   * @returns {{hit: boolean, entity: *, point: {x,y}, distance: number}}
   */
  raycast(startX, startY, dirX, dirY, maxDistance, entities) {
    let closest = null;
    let closestDist = maxDistance;

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e || !e.alive) continue;

      const r = e.radius || (e.width ? e.width / 2 : 16);

      // 射线-圆检测
      const toX = e.x - startX;
      const toY = e.y - startY;
      const proj = toX * dirX + toY * dirY;

      if (proj < 0 || proj > closestDist) continue;

      const perpDistSq = (toX * toX + toY * toY) - proj * proj;
      if (perpDistSq > r * r) continue;

      const offset = Math.sqrt(r * r - perpDistSq);
      const hitDist = proj - offset;

      if (hitDist > 0 && hitDist < closestDist) {
        closestDist = hitDist;
        closest = e;
      }
    }

    if (closest) {
      return {
        hit: true,
        entity: closest,
        point: {
          x: startX + dirX * closestDist,
          y: startY + dirY * closestDist
        },
        distance: closestDist
      };
    }

    return {
      hit: false,
      entity: null,
      point: {
        x: startX + dirX * maxDistance,
        y: startY + dirY * maxDistance
      },
      distance: maxDistance
    };
  },

  /** 清空空间哈希网格 */
  clearGrid() {
    const keys = Object.keys(_grid);
    for (let i = 0; i < keys.length; i++) {
      delete _grid[keys[i]];
    }
  }
};
