/**
 * ═══════════════════════════════════════════════════════════════
 *  📡 Void Abyss — EventBus
 *  发布-订阅通信枢纽 — 所有模块间通信的唯一通道
 *  接口: on, once, emit, off, clear
 * ═══════════════════════════════════════════════════════════════
 */

const _listeners = {};

export const EventBus = {
  /**
   * 订阅事件
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @param {*} [context] - 回调执行上下文
   * @returns {Function} 取消订阅函数（便于快速解绑）
   */
  on(event, callback, context) {
    if (!event || typeof callback !== 'function') return () => {};
    if (!_listeners[event]) {
      _listeners[event] = [];
    }
    const entry = { fn: callback, ctx: context || null, once: false };
    _listeners[event].push(entry);
    // 返回取消函数
    return () => this.off(event, callback);
  },

  /**
   * 一次性订阅（触发后自动移除）
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  once(event, callback) {
    if (!event || typeof callback !== 'function') return () => {};
    if (!_listeners[event]) {
      _listeners[event] = [];
    }
    const entry = { fn: callback, ctx: null, once: true };
    _listeners[event].push(entry);
    return () => this.off(event, callback);
  },

  /**
   * 发布事件
   * @param {string} event - 事件名
   * @param {*} [data] - 事件数据
   */
  emit(event, data) {
    if (!event || !_listeners[event]) return;
    const list = _listeners[event];
    // 遍历副本以避免在回调中修改列表导致问题
    const snapshot = list.slice();
    for (let i = 0; i < snapshot.length; i++) {
      const entry = snapshot[i];
      try {
        entry.fn.call(entry.ctx, data);
      } catch (err) {
        console.warn(`[EventBus] Error in handler for "${event}":`, err);
      }
      if (entry.once) {
        const idx = list.indexOf(entry);
        if (idx !== -1) list.splice(idx, 1);
      }
    }
  },

  /**
   * 取消订阅
   * @param {string} event - 事件名
   * @param {Function} callback - 要移除的回调
   */
  off(event, callback) {
    if (!event || !_listeners[event]) return;
    const list = _listeners[event];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].fn === callback) {
        list.splice(i, 1);
      }
    }
    // 清理空数组
    if (list.length === 0) {
      delete _listeners[event];
    }
  },

  /**
   * 清除所有事件监听（场景切换用）
   */
  clear() {
    const keys = Object.keys(_listeners);
    for (let i = 0; i < keys.length; i++) {
      delete _listeners[keys[i]];
    }
  }
};
