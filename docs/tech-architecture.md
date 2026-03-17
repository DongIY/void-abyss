# 🏗️ 技术架构设计文档：深渊领域 · Void Abyss
## Tech Architecture v1.0

> *"好的架构是看不见的，但没有它一切都会崩塌。"*

---

## 一、架构概览

| 属性 | 值 |
|------|-----|
| **架构 Tier** | Tier 3（工程化多文件） |
| **技术栈** | 纯 HTML + CSS + JS，Canvas 2D，无第三方框架 |
| **模块化** | ES Module（`<script type="module">`） |
| **渲染** | Canvas 2D + rAF，分层渲染（4层Canvas） |
| **预估体量** | 150KB+，16核心模块 + 4数据模块 = 20个JS文件 |
| **目标平台** | 现代桌面浏览器（Chrome/Firefox/Edge/Safari） |
| **设计原则** | 低耦合(EventBus)、数据驱动(data/*分离)、渲染逻辑分离 |

### v5.0 教训应对

| 教训 | 应对 |
|------|------|
| 152KB单文件难维护 | Tier 3多文件，每模块≤15KB |
| 相机缺失致P0黑屏 | 独立camera.js，含安全检查，P0优先开发 |
| 音效轰炸 | AudioManager内置120ms节流 |
| 模块耦合重 | EventBus统一通信，禁止直接方法调用 |

---

## 二、模块拆分方案

| # | 模块 | 职责 | 角色 | 依赖 | 行数 |
|---|------|------|------|------|------|
| 1 | engine.js | GameLoop/Input/状态/模块调度 | coder-logic | event-bus | 350-450 |
| 2 | event-bus.js | 发布-订阅通信枢纽 | coder-logic | 无 | 60-80 |
| 3 | camera.js | 视口跟随/坐标转换/边界/震动 | coder-logic | engine | 150-200 |
| 4 | dungeon.js | BSP房间生成/走廊/门/层级 | coder-logic | camera | 300-400 |
| 5 | combat.js | 伤害计算/元素反应/Combo/格挡 | coder-logic | entity | 250-350 |
| 6 | entity.js | Player/Enemy/NPC/Projectile生命周期 | coder-logic | camera,combat | 350-450 |
| 7 | ai.js | FSM状态机/巡逻/追击/Boss模式 | coder-ai | entity | 200-300 |
| 8 | item.js | 背包/装备/Synergy判定 | coder-logic | entity | 200-250 |
| 9 | talent.js | 三路线天赋树/升级三选一 | coder-logic | entity | 150-200 |
| 10 | ui.js | HUD/菜单/天赋卡/背包/Boss介绍/结算 | coder-ui | engine | 400-500 |
| 11 | fx.js | 粒子引擎/屏幕震动/慢动作 | coder-fx | camera | 300-400 |
| 12 | audio.js | Web Audio API/程序化音效/动态音乐 | sound | event-bus | 200-300 |
| 13 | save.js | 跨局数据/meta-progression | coder-logic | event-bus | 100-150 |
| 14 | renderer.js | 分层Canvas/精灵绘制/地图渲染 | coder-fx | camera | 250-350 |
| 15 | collision.js | AABB+圆形碰撞/空间哈希网格 | coder-logic | entity | 120-160 |
| 16 | utils.js | 数学工具/随机数/对象池 | coder-logic | 无 | 80-120 |
| 17 | data/enemies.js | 敌人数据表 | coder-ai | 无 | 80-120 |
| 18 | data/items.js | 道具+Synergy配置 | coder-logic | 无 | 120-180 |
| 19 | data/talents.js | 天赋数据表 | coder-logic | 无 | 80-120 |
| 20 | data/levels.js | 层级/难度/Boss配置 | coder-logic | 无 | 60-80 |

**预估**: 3,600-5,000行，150-200KB

---

## 三、模块依赖图

```
                         index.html
                            │
                            ▼
                      ┌──────────┐
                      │ engine   │ ← 主入口，调度所有模块
                      └────┬─────┘
           ┌───────┬───────┼───────┬───────┬───────┐
           ▼       ▼       ▼       ▼       ▼       ▼
        camera  dungeon  entity    ui      fx    audio
           │       │     │ │ │     │       │       │
           │       │     │ │ │     │       │       │
           │       │     ▼ ▼ ▼     │       ▼       │
           │       │  combat ai item│   renderer   │
           │       │     │         │       │       │
           └───────┴─────┴─────────┴───────┴───────┘
                              │
                         ┌────┴────┐
                         │EventBus │ ← 所有模块共享的通信枢纽
                         └─────────┘
                              │
                   ┌──────────┼──────────┐
                   ▼          ▼          ▼
                utils     collision    save
                   │
            ┌──────┼──────┬──────┐
            ▼      ▼      ▼      ▼
         data/   data/   data/  data/
        enemies  items  talents levels
```

**关键约束**：
- 所有模块间通信通过EventBus，**禁止直接方法调用**（engine编排层除外）
- 模块只import：event-bus、utils、data/* 三类无状态依赖
- **Camera必须在渲染管线最前端执行**（先更新相机→再绘制实体）

---

## 四、完整接口契约

### 4.1 EventBus (event-bus.js) — coder-logic

```javascript
export const EventBus = {
  on(event, callback, context) {},    // 订阅
  once(event, callback) {},           // 一次性订阅
  emit(event, data) {},               // 发布
  off(event, callback) {},            // 取消订阅
  clear() {}                          // 清除所有（场景切换用）
};
```

### 4.2 GameEngine (engine.js) — coder-logic

```javascript
export const GameEngine = {
  // 初始化引擎（Canvas元素+targetFPS） → boolean
  init(config: {canvas, targetFPS?:60}) {},
  
  // 开始新局（角色ID+起始装备） → void
  // 触发: 'game:start', 'dungeon:generate'
  start(options: {characterId, startingItem?}) {},
  
  // 暂停/恢复 → void
  // 触发: 'game:pause' / 'game:resume'
  pause() {},
  resume() {},
  
  // 获取状态快照 → GameState
  getState() {},
  
  // 监听状态变化（语法糖→EventBus）
  onStateChange(stateKey, callback) {},
  
  // 结束当局 → {shards, kills, maxCombo, layerReached, time}
  // 触发: 'game:end'
  endRun(reason: 'death'|'victory') {},
  
  // 主循环（内部rAF驱动）
  // 顺序: Input→Entity→AI→Combat→Collision→Camera→FX→Render→UI
  _update(dt) {}
};
```

### 4.3 Camera (camera.js) — coder-logic ⚠️P0

```javascript
export const Camera = {
  x: 0, y: 0,
  viewWidth: 960, viewHeight: 640,
  
  // 初始化(视口尺寸+lerp系数+初始目标) → boolean
  // 安全检查: 验证initialTarget在房间范围内
  init(config: {viewWidth, viewHeight, lerpFactor?:0.1, initialTarget}) {},
  
  // 每帧更新(lerp跟随→边界钳制→叠加震动) → void
  update(dt) {},
  
  // 坐标转换
  worldToScreen(worldX, worldY) → {x, y} {},
  screenToWorld(screenX, screenY) → {x, y} {},
  
  // 屏幕震动(强度px, 持续秒) — 叠加偏移不改实际位置
  shake(intensity, duration?:0.3) {},
  
  // 设置跟随目标(通常是玩家) 
  setTarget(target: {x,y}) {},
  
  // 设置边界(当前房间范围)
  setBounds(bounds: {left, top, right, bottom}) {},
  
  // 瞬移(房间切换用，无lerp)
  snapTo(x, y) {},
  
  // 视口裁剪判断
  isInView(worldX, worldY, margin?:50) → boolean {}
};
```

### 4.4 DungeonGenerator (dungeon.js) — coder-logic

```javascript
export const DungeonGenerator = {
  // BSP生成指定层地牢 → DungeonData{rooms[], corridors[], doors[], spawnPoint, bossRoom, shopRoom}
  // 触发: 'dungeon:generated'
  generate(config: {layer, seed?}) {},
  
  // 获取当前房间 → Room{id, type, bounds, enemies, items, doors, cleared, explored}
  getCurrentRoom() {},
  
  // 切换房间(目标房间+门ID) → {spawnX, spawnY}
  // 触发: 'dungeon:roomTransition', 'dungeon:roomEnter'
  // 动画: 0.3s黑幕渐入→加载→0.3s渐出
  moveToRoom(roomId, doorId) {},
  
  // 获取地图数据(小地图用) → MapData
  getMapData() {},
  
  // 标记房间已清理 → 触发: 'dungeon:roomCleared'
  clearCurrentRoom() {},
  
  // 进入下一层 → DungeonData
  // 触发: 'dungeon:layerComplete'
  nextLayer() {}
};
```

### 4.5 CombatSystem (combat.js) — coder-logic

```javascript
export const CombatSystem = {
  // 处理攻击 → AttackResult{damage, isCrit, element, reaction, reactionDamage, killed, comboCount}
  // 触发: 'combat:hit', 'combat:kill', 'combat:crit', 'combat:reaction'
  attack(params: {attacker, target, skillId, element?}) {},
  
  // 受伤处理 → {actualDamage, killed, blocked}
  // 触发: 'combat:damage', 'entity:death'
  takeDamage(target, rawDamage, source: 'attack'|'trap'|'dot'|'reaction') {},
  
  // 元素反应计算 → ReactionResult{name, displayName, damage, effect, duration, radius} | null
  // 6种反应: 湮灭/绝对零域/虚空风暴/蒸发/过载/超导
  calculateElementReaction(elementA, elementB, baseDamage, elemMastery) {},
  
  // Combo逻辑 → ComboState{count, bonus(0~0.3), tier, tierChanged, timeRemaining}
  // 阶梯: 5→NICE, 10→GREAT, 20→AMAZING, 30→LEGENDARY, 50→VOID MASTER
  applyCombo(hit: boolean) {},
  
  // 格挡处理 → ParryResult{blocked, isPerfect, reflectDamage, staminaCost}
  // 触发: 'combat:block', 'combat:perfectParry'
  processBlock(blocker, attacker, isPerfect) {},
  
  // 每帧更新(Combo超时/DoT/Buff计时)
  update(dt) {}
};
```

### 4.6 EntityManager (entity.js) — coder-logic

```javascript
export const EntityManager = {
  // 创建玩家 → PlayerEntity{id, type, x, y, stats, state, facing, inventory, talents, level, ...}
  // 触发: 'entity:playerCreated'
  createPlayer(config: {characterId, x, y, metaUpgrades?}) {},
  
  // 创建敌人 → EnemyEntity{id, enemyId, stats, aiState, isElite, isBoss, bossPhase, lootTable}
  // 触发: 'entity:enemyCreated'
  createEnemy(config: {enemyId, x, y, layer, isElite?, isBoss?}) {},
  
  // 每帧更新所有实体(位置/状态/动画/Buff)
  update(dt) {},
  
  // 范围查询 → Entity[]
  getEntitiesInRange(centerX, centerY, radius, filter?: {type?, alive?:true}) {},
  
  // 获取玩家引用 → PlayerEntity
  getPlayer() {},
  
  // 创建投射物 → ProjectileEntity
  createProjectile(config: {x, y, dx, dy, speed, damage, owner, element?}) {},
  
  // 存活敌人数量 → number
  getAliveEnemyCount() {},
  
  // 移除实体 → 触发: 'entity:removed'
  removeEntity(entityId) {}
};
```

### 4.7 AIController (ai.js) — coder-ai

```javascript
export const AIController = {
  // 初始化(决策间隔/索敌范围/攻击范围)
  init(config: {updateInterval?:100, detectionRange?:200, attackRange?:50}) {},
  
  // 更新所有敌人AI → AIAction[]{entityId, action, targetX, targetY, skillId}
  // FSM状态: idle→patrol→chase→attack→flee
  update(dt, enemies, player) {},
  
  // 设置单个敌人AI状态(Boss阶段转换/眩晕等)
  setState(entityId, state, params?) {},
  
  // 获取AI状态 → {state, target, stateTime}
  getState(entityId) {},
  
  // Boss专用AI(三阶段) → AIAction
  updateBossAI(entityId, bossPhase, bossConfig) {},
  
  // 注册自定义行为(扩展用)
  registerBehavior(behaviorName, behaviorFn) {}
};
```

### 4.8 ItemSystem (item.js) — coder-logic

```javascript
export const ItemSystem = {
  // 添加道具 → {success, reason?:'inventory_full'}
  // 触发: 'item:acquired', 'item:synergy'(如果触发协同)
  addItem(itemId, count?:1) {},
  
  // 移除道具 → boolean — 触发: 'item:removed'
  removeItem(itemId, count?:1) {},
  
  // 装备道具 → {success, unequippedItemId?}
  // 槽位: weapon/armor/accessory1/accessory2
  // 触发: 'item:equipped', 'player:statsChanged'
  equipItem(itemId, slot) {},
  
  // 获取背包 → {items[], maxSlots, equipment, activeSynergies}
  getInventory() {},
  
  // 检查Synergy → Synergy[]{synergyId, name, requiredItems, effect, isNew}
  checkSynergy() {},
  
  // 使用消耗品 → {used, effect} — 触发: 'item:used'
  useItem(itemId) {},
  
  // 生成掉落 → LootDrop[]{itemId, x, y, quality}
  // 触发: 'item:dropped'
  generateLoot(sourceType: 'normal'|'elite'|'boss'|'chest', layer) {}
};
```

### 4.9 TalentSystem (talent.js) — coder-logic

```javascript
export const TalentSystem = {
  // 获取三选一 → TalentChoice[3]{talentId, name, description, route, tier, color}
  // 路线: strength(红)/agility(绿)/void(紫)/universal(白)
  // 触发: 'talent:choiceReady'
  getAvailableTalents(playerLevel, acquiredTalentIds, characterId) {},
  
  // 选择天赋 → TalentEffect{statChanges, passiveEffect, description}
  // 触发: 'talent:selected', 'player:statsChanged'
  selectTalent(talentId) {},
  
  // 天赋树状态 → {acquired[], strengthCount, agilityCount, voidCount, universalCount}
  getTalentTree() {},
  
  // 应用被动效果(每帧)
  applyPassives(player, dt) {}
};
```

### 4.10 UIManager (ui.js) — coder-ui

```javascript
export const UIManager = {
  // 初始化(Canvas+DOM容器)
  init(config: {canvas, uiContainer}) {},
  
  // 切换界面: title/character_select/game/pause/inventory/talent_select/map/shop/death/victory/boss_intro
  // 触发: 'ui:screenChanged'
  showScreen(screenId, data?) {},
  
  // 更新HUD(每帧): hp/mp/sta/level/exp/layer/room/gold/kills/combo/skills/potionCount
  updateHUD(hudData) {},
  
  // 伤害浮字: normal(白)/crit(金)/heal(绿)/element(元素色)/exp(紫)/gold(金)
  showDamageNumber(config: {x, y, value, type, color?}) {},
  
  // 升级特效 → 自动触发talent_select界面
  showLevelUp(newLevel, statGains) {},
  
  // Boss登场过场(2s暗化+打字效果) → Promise
  showBossIntro(bossInfo: {name, title, element, layer}) {},
  
  // 提示浮字(DODGE!/PARRY!/SYNERGY!等)
  showFloatingText(text, color, x, y, duration?:1.0, scale?:1.0) {},
  
  // 结算面板
  showResultScreen(result: {outcome, shards, kills, maxCombo, layerReached, timeElapsed, unlocks}) {},
  
  // Combo阶梯视觉
  showComboTier(tier, count) {},
  
  // 每帧更新
  update(dt) {}
};
```

### 4.11 FXManager (fx.js) — coder-fx

```javascript
export const FXManager = {
  // 初始化(特效层ctx, maxParticles:500)
  init(config: {ctx, maxParticles?:500}) {},
  
  // 播放预设特效 → effectId
  // 类型: attack_arc/hit_burst/crit_burst/dodge_shadow/block_spark/level_up/
  //       death_dissolve/portal/item_pickup/element_reaction_*/combo_tier_*/
  //       synergy_activate/low_hp_vignette/boss_entrance
  playEffect(effectType, x, y, options?) {},
  
  // 自定义粒子(位置/数量/颜色/速度/生命/大小/形状/扩散角/重力/渐隐)
  spawnParticles(config) {},
  
  // 屏幕震动(委托Camera.shake)
  screenShake(intensity, duration?:0.3) {},
  
  // 慢动作(时间缩放, 持续秒) — 影响engine的deltaTime
  slowMotion(timeScale, duration) {},
  
  // 每帧更新/绘制
  update(dt) {},
  draw(ctx) {},
  
  // 粒子计数(性能监控) → number
  getActiveParticleCount() {},
  
  // 星空背景(永续200颗星)
  initStarfield(ctx, starCount?:200) {}
};
```

### 4.12 AudioManager (audio.js) — sound

```javascript
export const AudioManager = {
  // 初始化(音量配置, 节流120ms) — AudioContext延迟到首次交互创建
  init(config?: {masterVolume?:0.7, sfxVolume?:0.8, bgmVolume?:0.5, throttleMs?:120}) {},
  
  // 播放音效(50+种sfxId) — 内置节流
  // 战斗: sfx_attack_*/sfx_crit_*/sfx_dodge_*/sfx_block_*/sfx_parry_*
  // 元素: sfx_element_*/sfx_reaction_*
  // UI: sfx_pickup_*/sfx_levelup/sfx_menu_*/sfx_door_*/sfx_chest_*
  // Combo: sfx_combo_*
  // 环境: sfx_heartbeat/sfx_void_whisper
  play(sfxId, options?: {volume?:1.0, pitch?:1.0, force?:false}) {},
  
  // 快捷方法
  sfx: { attack(), hit(), crit(), dodge(), block(), parry(), pickup(quality), levelUp(), enemyDeath(), playerHurt() },
  
  // 静音切换 → boolean — 触发: 'audio:muteChanged'
  toggleMute() {},
  
  // 动态BGM(淡入+交叉淡化+循环)
  // 曲目: bgm_title/bgm_explore_1~5/bgm_combat/bgm_boss/bgm_shop/bgm_death/bgm_victory
  playDynamic(trackId, options?: {fadeIn?:1.0, crossfade?:0.5, loop?:true}) {},
  
  // 音量设置/状态查询
  setVolume(channel: 'master'|'sfx'|'bgm', volume) {},
  getAudioState() → {muted, masterVolume, sfxVolume, bgmVolume} {}
};
```

### 4.13 SaveManager (save.js) — coder-logic

```javascript
export const SaveManager = {
  // 保存Run结算 → boolean — 触发: 'save:runSaved'
  saveRun(runResult: {shardsEarned, layerReached, bossesKilled, characterUsed, stats}) {},
  
  // 加载跨局进度 → MetaProgress{totalShards, unlockedCharacters, permanentUpgrades, ...}
  loadProgress() {},
  
  // 解锁角色 → {success, remainingShards} — 触发: 'save:characterUnlocked'
  unlockCharacter(characterId, cost) {},
  
  // 购买永久升级 → {success, remainingShards}
  purchaseUpgrade(upgradeId, cost) {},
  
  // Run状态保存/恢复(断线恢复)
  saveRunState(state) {},
  getUnfinishedRun() → GameState|null {},
  clearRunState() {},
  
  // 导入/导出
  exportSave() → string {},
  importSave(jsonStr) → boolean {}
};
```

### 4.14 Renderer (renderer.js) — coder-fx

```javascript
// 四层Canvas: L0背景(低频) → L1实体(每帧) → L2特效(每帧) → L3 HUD(每帧)
export const Renderer = {
  init(config: {container, width?:960, height?:640}) → {bgCtx, entityCtx, fxCtx, hudCtx} {},
  draw() {},              // 主渲染(清除→背景→地牢→实体→特效→HUD)
  drawEntity(ctx, entity) {},
  drawRoom(ctx, room) {},
  drawMinimap(ctx, mapData, x, y, size) {},
  transition(type: 'fadeIn'|'fadeOut', duration) → Promise {},
  handleResize() {}
};
```

### 4.15 Collision (collision.js) — coder-logic

```javascript
export const Collision = {
  init(config?: {cellSize?:64}) {},
  detect(entities) → CollisionResult[]{entityA, entityB, type, overlap} {},
  checkAABB(a, b) → boolean {},
  checkCircle(a, b) → boolean {},
  raycast(startX, startY, dirX, dirY, maxDistance, entities) → {hit, entity, point, distance} {},
  updateGrid(entities) {}
};
```

---

## 五、数据流设计

### 5.1 GameState 完整结构

```javascript
const GameState = {
  phase: 'title', // title|character_select|playing|paused|talent_select|shopping|boss_intro|death|victory
  run: { active, startTime, elapsed, seed },
  player: {
    characterId, x, y, facing, state,
    stats: { hp, maxHp, mp, maxMp, sta, maxSta, atk, def, crit, critDmg, spd, aspd, elem },
    level, exp, expToNext, gold, kills,
    element, iFrames, buffs[],
    equipment: { weapon, armor, accessory1, accessory2 }
  },
  dungeon: { currentLayer, currentRoomId, roomsExplored, layerData, mapRevealed[] },
  combat: { combo: {count, timer, maxCombo}, activeEffects[], killCount },
  inventory: { items[], maxSlots:12, activeSynergies[] },
  talents: { acquired[], pendingChoice },
  frame: { deltaTime, fps, inputState: {keys, mouse}, timeScale:1.0 }
};
```

### 5.2 数据流向

```
输入(键盘/鼠标) → engine.Input.poll()
    ↓
GameEngine._update(dt):
    1. Input → inputState
    2. EntityManager.update → 位置/状态/动画
    3. AIController.update → 敌人决策
    4. CombatSystem.update → Combo/DoT/Buff
    5. Collision.detect → 命中/拾取/门触发
    6. Camera.update → 跟随/边界/震动 ⚠️渲染前必须完成
    7. FXManager.update → 粒子生命周期
    8. Renderer.draw → 4层Canvas绘制
    9. UIManager.update → HUD/浮字
    ↓
输出(Canvas渲染 + DOM UI)
```

### 5.3 EventBus 事件清单

| 事件名 | 载荷 | 发布方 | 订阅方 |
|--------|------|--------|--------|
| `game:start` | {characterId, seed} | engine | all |
| `game:pause` | {} | engine | all |
| `game:resume` | {} | engine | all |
| `game:end` | {reason, result} | engine | ui, save, audio |
| `dungeon:generated` | {layer, roomCount} | dungeon | ui, audio |
| `dungeon:roomEnter` | {roomId, roomType} | dungeon | entity, ai, audio, ui |
| `dungeon:roomCleared` | {roomId, loot[]} | dungeon | ui, audio, fx |
| `dungeon:roomTransition` | {fromRoom, toRoom} | dungeon | camera, renderer, audio |
| `dungeon:layerComplete` | {layer} | dungeon | ui, save, audio |
| `entity:playerCreated` | {player} | entity | camera, ui |
| `entity:enemyCreated` | {enemy} | entity | ai |
| `entity:death` | {entity, killer} | entity | combat, fx, audio, ui |
| `entity:removed` | {entityId} | entity | ai, collision |
| `combat:hit` | {attacker, target, result} | combat | fx, audio, ui |
| `combat:crit` | {attacker, target, damage} | combat | fx, audio, ui |
| `combat:kill` | {killer, victim, loot} | combat | fx, audio, ui, entity |
| `combat:reaction` | {reaction, position, damage} | combat | fx, audio, ui |
| `combat:block` | {blocker, attacker} | combat | fx, audio |
| `combat:perfectParry` | {blocker, attacker, reflectDmg} | combat | fx, audio, ui |
| `combat:comboTier` | {tier, count} | combat | fx, audio, ui |
| `player:levelUp` | {newLevel, statGains} | entity | ui, fx, audio, talent |
| `player:statsChanged` | {stats} | entity/item/talent | ui |
| `player:lowHP` | {hp, maxHp, ratio} | entity | fx, audio, ui |
| `player:death` | {stats, runData} | entity | engine |
| `item:acquired` | {itemId, itemData} | item | ui, fx, audio |
| `item:removed` | {itemId} | item | ui |
| `item:equipped` | {itemId, slot} | item | ui |
| `item:synergy` | {synergy} | item | ui, fx, audio |
| `item:dropped` | {drops[]} | item | entity |
| `item:used` | {itemId, effect} | item | ui, fx, audio |
| `talent:choiceReady` | {choices[3]} | talent | ui |
| `talent:selected` | {talentId, effect} | talent | ui, fx, audio |
| `ui:screenChanged` | {screenId} | ui | engine |
| `audio:muteChanged` | {muted} | audio | ui |
| `save:runSaved` | {metaProgress} | save | ui |
| `save:characterUnlocked` | {characterId} | save | ui |

---

## 六、文件结构

```
void-abyss/
├── index.html                    ← 入口（加载CSS+主模块）
├── css/
│   └── style.css                 ← 全局样式 + CSS变量（GDD v6.0色板）
├── js/
│   ├── engine.js                 ← 游戏主引擎
│   ├── event-bus.js              ← 事件总线
│   ├── camera.js                 ← 相机/视口系统 ⚠️P0
│   ├── dungeon.js                ← 地牢生成器
│   ├── combat.js                 ← 战斗系统
│   ├── entity.js                 ← 实体管理
│   ├── ai.js                     ← 敌人AI
│   ├── item.js                   ← 道具系统
│   ├── talent.js                 ← 天赋系统
│   ├── ui.js                     ← UI管理
│   ├── fx.js                     ← 特效系统
│   ├── audio.js                  ← 音频管理
│   ├── save.js                   ← 存档系统
│   ├── renderer.js               ← 分层Canvas渲染器
│   ├── collision.js              ← 碰撞检测
│   ├── utils.js                  ← 工具函数
│   └── data/
│       ├── enemies.js            ← 敌人数据表（含5层Boss）
│       ├── items.js              ← 道具数据表 + Synergy配置
│       ├── talents.js            ← 天赋数据表（三路线+通用）
│       └── levels.js             ← 层级配置（房间数/难度/Boss）
├── assets/                       ← (可选) 精灵图/音频文件
├── docs/
│   ├── gdd-lite-v6.md            ← 已确认的GDD
│   └── tech-architecture.md      ← 本文档
└── README.md
```

---

## 七、技术风险评估

| # | 风险 | 等级 | 影响 | 降级方案 |
|---|------|------|------|---------|
| 1 | **粒子性能瓶颈** | 🔴高 | 500粒子同屏时可能掉帧 | 对象池复用+动态上限（检测FPS<50时自动降至300）+优先回收最旧粒子 |
| 2 | **BSP地牢生成耗时** | 🟡中 | 层切换时可能卡顿 | 预生成下一层（进入Boss房时异步生成）+生成上限计时500ms |
| 3 | **同屏敌人过多** | 🔴高 | 15敌人+AI+碰撞检测可能超帧时 | 视野外敌人休眠(不执行AI/碰撞)+AI决策分帧(每帧更新5个敌人) |
| 4 | **Canvas分层内存** | 🟡中 | 4层Canvas=4倍显存 | 960×640逻辑分辨率控制内存；备选：合并特效层和实体层为2层 |
| 5 | **ES Module加载** | 🟡中 | 20个JS文件HTTP请求多 | 开发阶段不影响；部署时可用简单脚本合并为2-3个bundle |
| 6 | **Web Audio兼容性** | 🟢低 | Safari对AudioContext的限制 | 首次用户交互后创建AudioContext+静默回退(无音频不影响游戏) |
| 7 | **localStorage配额** | 🟢低 | 无痕模式/空间不足 | try-catch包裹+内存回退(单局内数据不丢失) |
| 8 | **元素反应复杂度** | 🟡中 | 6种反应×多种触发场景=组合爆炸 | 反应管理器统一处理+1秒内同一对元素不重复触发+队列化处理 |
| 9 | **Boss三阶段AI** | 🟡中 | 行为复杂度高，调试困难 | 每阶段独立状态机+可视化调试模式(显示AI状态/索敌范围) |
| 10 | **单文件体积膨胀** | 🟡中 | 某模块意外超15KB | Code Review时检查+大模块拆分子模块 |

---

## 八、性能预算

| 指标 | 预算值 | 监控方式 |
|------|--------|---------|
| **目标帧率** | 60fps (≥55fps可接受) | rAF时间差计算 |
| **最大总文件** | 200KB (JS) + 5KB (CSS) + 2KB (HTML) | 部署前检查 |
| **内存预算** | ≤50MB（含Canvas缓冲） | performance.memory |
| **同屏粒子上限** | 500个 | FXManager.getActiveParticleCount() |
| **同屏敌人上限** | 15个 | EntityManager计数 |
| **Canvas逻辑分辨率** | 960×640 | 固定 |
| **单帧更新耗时** | ≤14ms (留2ms余量) | performance.now()差值 |
| **AI决策间隔** | 100ms (非每帧) | 定时器 |
| **音效节流** | 120ms同类最小间隔 | AudioManager内部 |
| **房间切换延迟** | ≤600ms (含动画) | 用户体感 |
| **地牢生成时间** | ≤500ms | 超时降级 |

---

## 九、开发任务拆分建议

### Phase 1: 基础框架 (P0，所有后续任务的前置)

| 任务 | 角色 | 优先级 | 依赖 | 预估 |
|------|------|--------|------|------|
| event-bus.js 实现 | coder-logic | P0 | 无 | 0.5h |
| utils.js 实现(数学/对象池/随机) | coder-logic | P0 | 无 | 1h |
| engine.js 骨架(GameLoop+Input+状态) | coder-logic | P0 | event-bus | 2h |
| camera.js 完整实现 ⚠️ | coder-logic | P0 | utils | 1.5h |
| renderer.js 四层Canvas初始化 | coder-fx | P0 | camera | 1.5h |
| collision.js 基础实现 | coder-logic | P0 | utils | 1h |

### Phase 2: 核心可玩 (P0-P1，达成冒烟测试)

| 任务 | 角色 | 优先级 | 依赖 | 预估 |
|------|------|--------|------|------|
| entity.js 玩家+移动+状态机 | coder-logic | P0 | engine, camera | 2h |
| dungeon.js BSP生成+单房间 | coder-logic | P0 | utils | 2.5h |
| entity.js 敌人+基础行为 | coder-logic | P0 | entity(player) | 1.5h |
| combat.js 基础伤害+命中 | coder-logic | P0 | entity | 2h |
| ai.js 基础FSM(idle/chase/attack) | coder-ai | P0 | entity | 2h |
| ui.js HUD(HP/MP/层级) | coder-ui | P0 | engine | 2h |
| audio.js 基础框架+3-5个核心音效 | sound | P1 | event-bus | 2h |
| renderer.js 实体绘制+地牢绘制 | coder-fx | P0 | camera, entity | 2h |
| data/enemies.js 第1层数据 | coder-ai | P0 | 无 | 0.5h |
| data/levels.js 层级配置 | coder-logic | P0 | 无 | 0.5h |

### Phase 3: 核心系统完善 (P1)

| 任务 | 角色 | 优先级 | 依赖 | 预估 |
|------|------|--------|------|------|
| combat.js 元素反应+Combo+格挡 | coder-logic | P1 | combat基础 | 2.5h |
| dungeon.js 多房间+门+房间切换 | coder-logic | P1 | dungeon基础 | 2h |
| item.js 道具系统+背包 | coder-logic | P1 | entity | 2h |
| talent.js 天赋三选一 | coder-logic | P1 | entity | 1.5h |
| ai.js Boss三阶段AI | coder-ai | P1 | ai基础 | 2.5h |
| ui.js 菜单/天赋选择/背包/Boss介绍 | coder-ui | P1 | ui基础 | 3h |
| fx.js 粒子引擎+核心特效 | coder-fx | P1 | renderer | 3h |
| audio.js 完整音效+动态BGM | sound | P1 | audio基础 | 3h |
| data/items.js+talents.js | coder-logic | P1 | 无 | 1h |
| data/enemies.js 全5层数据 | coder-ai | P1 | 无 | 1h |

### Phase 4: 完整体验 (P2)

| 任务 | 角色 | 优先级 | 依赖 | 预估 |
|------|------|--------|------|------|
| save.js 跨局存档+meta-progression | coder-logic | P2 | engine | 1.5h |
| item.js Synergy系统 | coder-logic | P2 | item基础 | 1.5h |
| ui.js 结算面板+小地图+商店 | coder-ui | P2 | ui完善 | 2h |
| fx.js 全特效(元素反应/Combo/Boss) | coder-fx | P2 | fx基础 | 2.5h |
| dungeon.js 商店房/事件房 | coder-logic | P2 | dungeon完善 | 1.5h |
| 全系统联调+冒烟测试 | 全员 | P2 | 所有 | 3h |

### 并行开发矩阵

```
时间 →   Phase1      Phase2        Phase3          Phase4
         ┌──────┐   ┌──────────┐  ┌────────────┐  ┌──────────┐
logic:   │基础框架│→ │实体+战斗  │→ │元素+道具+   │→ │存档+联调  │
         │      │   │+地牢+碰撞│  │天赋+地牢完善│  │          │
         └──────┘   └──────────┘  └────────────┘  └──────────┘
         ┌──────┐   ┌──────────┐  ┌────────────┐  ┌──────────┐
ui:      │      │   │HUD基础    │→ │菜单+天赋+   │→ │结算+商店  │
         │      │   │          │  │背包+Boss介绍│  │+小地图   │
         └──────┘   └──────────┘  └────────────┘  └──────────┘
         ┌──────┐   ┌──────────┐  ┌────────────┐  ┌──────────┐
ai:      │      │   │基础FSM+   │→ │Boss AI+    │→ │打磨+平衡 │
         │      │   │敌人数据  │  │全敌人数据  │  │          │
         └──────┘   └──────────┘  └────────────┘  └──────────┘
         ┌──────┐   ┌──────────┐  ┌────────────┐  ┌──────────┐
fx:      │渲染器 │→ │实体+地牢  │→ │粒子引擎+   │→ │全特效    │
         │初始化 │  │绘制      │  │核心特效    │  │+打磨     │
         └──────┘   └──────────┘  └────────────┘  └──────────┘
         ┌──────┐   ┌──────────┐  ┌────────────┐  ┌──────────┐
sound:   │      │   │基础框架+  │→ │完整音效+   │→ │动态混音  │
         │      │   │核心音效  │  │动态BGM     │  │+打磨     │
         └──────┘   └──────────┘  └────────────┘  └──────────┘
```

---

*文档版本: Tech Architecture v1.0*
*架构师: 蓝图大师·亚瑟*
*基于: GDD Lite v6.0*
*日期: 2026-03-17*
