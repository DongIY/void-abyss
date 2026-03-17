# 🔊 Void Abyss — 音效接口规范

> 版本：v1.1 | 作者：声波术士·索尼克 | 日期：2026-03-17
> 音色方向：**lava/void** — 厚重、紧张，sawtooth + 低频，50-400Hz 为主
> **接口已与 tech-architecture.md §4.12 完全对齐**

---

## 概述

所有音效通过全局 `AudioManager` 对象调用（同时支持 ES Module `export` 和 `window.AudioManager` 全局访问）。音效基于 Web Audio API 程序化生成，**无外部音频文件依赖**。模块仅依赖 `event-bus.js`，通过 EventBus 事件触发。

### 基本用法

```javascript
// ── 初始化（首次用户交互时调用）──
AudioManager.init({ masterVolume: 0.7, sfxVolume: 0.8, bgmVolume: 0.5, throttleMs: 120 });

// ── 播放音效（支持 sfx_前缀 和 无前缀 两种 sfxId）──
AudioManager.play('click');                                    // 无前缀
AudioManager.play('sfx_attack_light');                         // sfx_前缀（架构文档风格）
AudioManager.play('attack_light', { volume: 1.2, force: true }); // 带选项

// ── 动态参数化音效 ──
AudioManager.play('combo_hit', { params: { comboCount: 15 } });
AudioManager.play('heartbeat', { params: { hpPercent: 0.2 } });
AudioManager.play('footstep', { params: { surface: 'stone' } });

// ── 快捷方法 ──
AudioManager.sfx.attack();         // 等价于 play('attack_light')
AudioManager.sfx.hit();            // 等价于 play('hit_flesh')
AudioManager.sfx.crit();           // 等价于 play('crit')
AudioManager.sfx.pickup('coin');   // 等价于 play('coin_pickup')
AudioManager.sfx.levelUp();        // 等价于 play('levelup')

// ── 动态 BGM（淡入+交叉淡化+循环）──
AudioManager.playDynamic('bgm_explore', { fadeIn: 1.0, crossfade: 0.5, loop: true });
AudioManager.playDynamic('bgm_combat');
AudioManager.playDynamic('bgm_boss');
AudioManager.playBGM('explore');   // playDynamic 的简化别名
AudioManager.stopBGM();            // 停止BGM

// ── 状态切换（自动切换BGM + 音效集）──
AudioManager.setState('explore');   // 探索状态
AudioManager.setState('combat');    // 战斗状态
AudioManager.setState('boss');      // Boss战状态

// ── 静音控制 ──
AudioManager.toggleMute();          // 切换静音 → 返回 boolean，触发 'audio:muteChanged'
AudioManager.isMuted();             // 查询静音状态

// ── 音量控制 ──
AudioManager.setVolume('master', 0.7);  // 主音量 0-1
AudioManager.setVolume('sfx', 0.8);     // 音效音量 0-1
AudioManager.setVolume('bgm', 0.5);     // BGM音量 0-1

// ── 状态查询 ──
AudioManager.getAudioState();  // → { muted, masterVolume, sfxVolume, bgmVolume }
```

---

## 完整音效函数列表

### 1. UI 音效

| 函数名 | 参数 | 调用时机 | 音色描述 | 时长 |
|--------|------|---------|---------|------|
| `click` | 无 | 菜单按钮点击 | 清脆短促 sine 800Hz→600Hz | ≤0.08s |
| `hover` | 无 | 按钮鼠标悬停 | 极轻微 triangle 1000Hz | ≤0.05s |
| `confirm` | 无 | 确认选择（天赋选择、购买等） | 上行双音 sine 600Hz→900Hz | ≤0.1s |
| `cancel` | 无 | 取消/返回操作 | 下行 triangle 600Hz→300Hz | ≤0.08s |

**调用位置**：`ui.js` — 所有按钮/菜单交互处

---

### 2. 战斗音效

| 函数名 | 参数 | 调用时机 | 音色描述 | 时长 |
|--------|------|---------|---------|------|
| `attack_light` | 无 | 普通攻击出手 | sawtooth 300Hz 快速衰减 + 高频噪声脉冲 | ≤0.15s |
| `attack_heavy` | 无 | 重击/蓄力攻击 | 低频 sawtooth 120Hz 爆发 + 延迟反馈 | ≤0.3s |
| `crit` | 无 | 暴击触发 | 金属共鸣 square 500Hz→200Hz + 混响尾音 | ≤0.4s |
| `hit_flesh` | 无 | 命中无甲敌人 | 低沉冲击 sawtooth 80Hz + 噪声 | ≤0.1s |
| `hit_metal` | 无 | 命中护甲/金属敌人 | 高频金属碰撞 square 1200Hz→800Hz + 滤波共振 | ≤0.12s |
| `dodge` | 无 | 闪避翻滚 | 风声呼啸 滤波白噪声 扫频 400Hz→100Hz | ≤0.25s |
| `parry` | 无 | 完美格挡 | 能量爆发 多层叠加 + 冲击波低频 + 金属鸣响 | ≤0.5s |
| `block` | 无 | 普通格挡 | 钝击 sawtooth 200Hz + 快速衰减 | ≤0.15s |
| `skill_cast` | 无 | 技能释放 | 虚空能量涌动 sawtooth 100Hz→400Hz 上行 + 混响 | ≤0.4s |

**调用位置**：`combat.js` — 攻击判定、命中判定、闪避/格挡触发处

---

### 3. 元素音效

| 函数名 | 参数 | 调用时机 | 音色描述 | 时长 |
|--------|------|---------|---------|------|
| `elem_fire` | 无 | 火焰元素攻击/效果 | 高频 crackling 噪声爆发 + 低频 rumble | ≤0.3s |
| `elem_ice` | 无 | 寒冰元素攻击/效果 | 清脆 sine 1200Hz→600Hz 下行 + 结晶感 | ≤0.3s |
| `elem_lightning` | 无 | 雷电元素攻击/效果 | 白噪声尖锐爆发 + 低频余震 | ≤0.25s |
| `elem_void` | 无 | 虚空元素攻击/效果 | 深沉 sawtooth 50Hz 震荡 + 频率调制 | ≤0.5s |
| `elem_reaction` | 无 | 元素反应触发 | 双元素音色叠加 + 大型爆发 + 混响 | ≤0.6s |

**调用位置**：`combat.js` — 元素伤害计算、元素反应触发处

---

### 4. 游戏事件音效

| 函数名 | 参数 | 调用时机 | 音色描述 | 时长 |
|--------|------|---------|---------|------|
| `levelup` | 无 | 玩家升级 | 上行琶音 sine 三连音 C→E→G + 余韵混响 | ≤0.8s |
| `item_pickup` | 无 | 拾取道具 | 清脆叮咚 sine 800Hz→1200Hz | ≤0.15s |
| `item_equip` | 无 | 装备道具 | 厚重金属嵌合 square 300Hz + 锁定音 | ≤0.2s |
| `coin_drop` | 无 | 金币掉落 | 轻微叮当 triangle 1000Hz 短脉冲 | ≤0.1s |
| `coin_pickup` | 无 | 金币拾取 | 清脆叮 sine 1200Hz→1400Hz | ≤0.08s |
| `chest_open` | 无 | 开宝箱 | 神秘上行旋律 + 能量释放 + 混响余韵 | ≤1.0s |
| `door_open` | 无 | 开门/进入通道 | 低沉石门推动 sawtooth 80Hz→60Hz + 噪声摩擦 | ≤0.4s |

**调用位置**：`entity.js` / `item.js` — 升级判定、道具拾取、宝箱/门交互处

---

### 5. Boss/危险音效

| 函数名 | 参数 | 调用时机 | 音色描述 | 时长 |
|--------|------|---------|---------|------|
| `boss_intro` | 无 | Boss登场动画 | 史诗低频 rumble + 号角式上行 + 多层叠加 | ≤2.0s |
| `boss_phase` | 无 | Boss阶段转换 | 能量积聚爆发 低频→高频扫频 + 冲击波 | ≤1.0s |
| `danger_warning` | 无 | 危险警告（精英怪出现等） | 警报式双频交替 square 200Hz/300Hz | ≤0.6s |
| `death` | 无 | 玩家死亡 | 低频坍缩 sawtooth 200Hz→20Hz 缓慢下行 + 虚空回响 | ≤2.0s |

**调用位置**：`engine.js` / `entity.js` — Boss房进入、阶段切换、玩家死亡处

---

### 6. 环境/氛围

| 函数名 | 调用方法 | 调用时机 | 音色描述 | 时长 |
|--------|---------|---------|---------|------|
| `bgm_explore` | `AudioManager.playBGM('explore')` | 进入探索状态 | 低沉环境音 + 缓慢脉动 + 星空氛围 | 循环 |
| `bgm_combat` | `AudioManager.playBGM('combat')` | 进入战斗 | 紧张节奏 + 低频鼓点 + 紧迫感 | 循环 |
| `bgm_boss` | `AudioManager.playBGM('boss')` | Boss战开始 | 史诗压迫 + 多层叠加 + 虚空共鸣 | 循环 |
| `ambient_void` | `AudioManager.play('ambient_void')` | 背景环境层 | 极低频虚空嗡鸣 30-60Hz 缓慢震荡 | 持续 |

**调用位置**：`engine.js` — 状态切换（探索↔战斗↔Boss）时

---

### 7. 动态参数化音效

| 函数名 | 参数 | 调用时机 | 参数效果 | 时长 |
|--------|------|---------|---------|------|
| `combo_hit` | `{ comboCount: number }` | 每次连击命中 | 1-4连：单音；5-9连：双音叠加；10-19连：三音和弦；20+连：华丽琶音+混响；50+连：全频爆发 | 随连击递增 0.1s→0.5s |
| `heartbeat` | `{ hpPercent: number }` | 血量低于30%时持续 | 频率随血量降低而加速：30%→1Hz，20%→1.5Hz，10%→2.5Hz | 持续 |
| `footstep` | `{ surface: string }` | 角色移动时 | 'stone'=低沉敲击，'metal'=金属回响，'void'=虚空涟漪 | ≤0.1s |

**调用位置**：
- `combo_hit`：`combat.js` — Combo 计数器更新处
- `heartbeat`：`engine.js` — 玩家 HP 低于 30% 时每帧检查
- `footstep`：`entity.js` — 玩家移动逻辑中（需节流，每步1次）

---

## 音效状态机

```
状态切换示意：

  [explore] ──敌人出现──→ [combat] ──最后敌人死亡──→ [explore]
      │                      │
      │                 Boss房进入
      │                      │
      └──────────────────→ [boss] ──Boss击杀──→ [explore]

各状态音效配置：
  explore: BGM=bgm_explore, 环境=ambient_void, 脚步声=启用
  combat:  BGM=bgm_combat,  环境=关闭,       战斗音效=全开
  boss:    BGM=bgm_boss,    环境=关闭,       Boss音效=启用
```

---

## 技术约束

| 约束项 | 规范 |
|--------|------|
| 音频引擎 | 纯 Web Audio API，禁止外部音频文件 |
| AudioContext | 懒初始化，首次用户交互后创建 |
| resume 处理 | 每次播放前检查 `ctx.state === 'suspended'` 并 resume |
| 节流 | 同一音效 120ms 内不重复播放（防音效轰炸） |
| AudioNode | 用完即断开（disconnect），不复用 OscillatorNode |
| 静音持久化 | `localStorage.getItem('void_abyss_muted')` |
| 音量持久化 | `localStorage.getItem('void_abyss_volume_*')` |
| BGM切换 | 淡入淡出过渡（0.5s fadeOut → 0.5s fadeIn） |
| 最大并发 | 同时活跃 AudioNode ≤ 20 个 |

---

## 主程集成指南

### 快速集成（3步）

```javascript
// 1. 在 index.html 中引入（audio.js 之后加载其他模块）
<script src="js/audio.js"></script>

// 2. 在需要播放音效的地方直接调用
AudioManager.play('attack_light');   // 普通攻击
AudioManager.play('crit');           // 暴击
AudioManager.play('combo_hit', { comboCount: combo }); // 连击

// 3. 在状态切换处调用
AudioManager.setState('combat');     // 进入战斗
AudioManager.setState('explore');    // 回到探索
AudioManager.setState('boss');       // Boss战
```

### 预留调用位置清单

```
engine.js:
  - 游戏启动 → AudioManager.setState('explore')
  - 进入战斗房 → AudioManager.setState('combat')
  - 进入Boss房 → AudioManager.setState('boss')
  - 清空房间 → AudioManager.setState('explore')
  - 玩家死亡 → AudioManager.play('death')
  - 每帧检查HP<30% → AudioManager.play('heartbeat', {hpPercent})

combat.js:
  - 普通攻击命中 → AudioManager.play('attack_light')
  - 重击命中 → AudioManager.play('attack_heavy')
  - 暴击触发 → AudioManager.play('crit')
  - 命中肉体 → AudioManager.play('hit_flesh')
  - 命中金属 → AudioManager.play('hit_metal')
  - 闪避翻滚 → AudioManager.play('dodge')
  - 完美格挡 → AudioManager.play('parry')
  - 普通格挡 → AudioManager.play('block')
  - 技能释放 → AudioManager.play('skill_cast')
  - Combo更新 → AudioManager.play('combo_hit', {comboCount})
  - 元素攻击 → AudioManager.play('elem_fire/ice/lightning/void')
  - 元素反应 → AudioManager.play('elem_reaction')

entity.js:
  - 升级 → AudioManager.play('levelup')
  - 道具拾取 → AudioManager.play('item_pickup')
  - 装备道具 → AudioManager.play('item_equip')
  - 金币掉落 → AudioManager.play('coin_drop')
  - 金币拾取 → AudioManager.play('coin_pickup')
  - 开宝箱 → AudioManager.play('chest_open')
  - 开门 → AudioManager.play('door_open')
  - Boss登场 → AudioManager.play('boss_intro')
  - Boss阶段切换 → AudioManager.play('boss_phase')
  - 精英怪出现 → AudioManager.play('danger_warning')
  - 移动脚步 → AudioManager.play('footstep', {surface})

ui.js:
  - 按钮点击 → AudioManager.play('click')
  - 按钮悬停 → AudioManager.play('hover')
  - 确认操作 → AudioManager.play('confirm')
  - 取消操作 → AudioManager.play('cancel')
```

---

*音效接口规范 v1.0 — 声波术士·索尼克*
*主程可按此接口预留调用位置，完整 AudioManager 代码包将在 `js/audio.js` 交付*
