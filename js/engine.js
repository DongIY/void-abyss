/**
 * ═══════════════════════════════════════════════════════════════
 *  ⚙️ Void Abyss — Game Engine
 *  GameLoop (rAF 驱动) / Input 处理 / GameState 管理 / 模块调度
 *  主循环 9 步: Input→Entity→AI→Combat→Collision→Camera→FX→Render→UI
 *  性能预算: 60fps, ≤14ms 帧时
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { Collision } from './collision.js';
import { EntityManager } from './entity.js';
import { DungeonGenerator } from './dungeon.js';
import { LEVELS } from './data/levels.js';
import { CombatSystem } from './combat.js';
import { AIController } from './ai.js';
import { ItemSystem } from './item.js';
import { TalentSystem } from './talent.js';
import { UIManager } from './ui.js';
import { FXManager } from './fx.js';
import { SaveManager } from './save.js';
import { TutorialSystem } from './tutorial.js';

// ─── 常量 ───
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
const MAX_DT = 0.1; // 最大帧间隔（防止 tab 切换后巨大 dt）
const _width = 960;
const _height = 640;

// ─── 输入系统 ───
const Input = {
  keys: {},           // 当前按住的键 { keyCode: true }
  keysDown: {},       // 本帧刚按下的键
  keysUp: {},         // 本帧刚抬起的键
  mouse: {
    x: 0, y: 0,      // 屏幕坐标
    worldX: 0, worldY: 0, // 世界坐标
    left: false,      // 左键按住
    right: false,     // 右键按住
    leftDown: false,  // 左键本帧按下
    rightDown: false  // 右键本帧按下
  },

  /** 绑定事件监听 */
  init(canvas) {
    // 键盘
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      this.keysDown[e.code] = true;

      // 阻止默认行为（空格滚动等）
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keysUp[e.code] = true;
    });

    // 鼠标
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        this.mouse.x = (e.clientX - rect.left) * scaleX;
        this.mouse.y = (e.clientY - rect.top) * scaleY;

        // 转换世界坐标
        if (Camera.initialized) {
          const world = Camera.screenToWorld(this.mouse.x, this.mouse.y);
          this.mouse.worldX = world.x;
          this.mouse.worldY = world.y;
        }
      });

      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.mouse.left = true;
          this.mouse.leftDown = true;
        } else if (e.button === 2) {
          this.mouse.right = true;
          this.mouse.rightDown = true;
        }
      });

      canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouse.left = false;
        else if (e.button === 2) this.mouse.right = false;
      });

      // 禁止右键菜单
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  },

  /** 判断按键当前是否按住 */
  isDown(code) { return !!this.keys[code]; },

  /** 判断按键本帧是否刚按下 */
  isPressed(code) { return !!this.keysDown[code]; },

  /** 判断按键本帧是否刚抬起 */
  isReleased(code) { return !!this.keysUp[code]; },

  /** 获取移动向量（WASD + 方向键） */
  getMoveVector() {
    let dx = 0, dy = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  dx -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) dx += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    dy -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  dy += 1;
    // 归一化
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }
    return { x: dx, y: dy };
  },

  /** 帧末清除单帧状态 */
  _endFrame() {
    this.keysDown = {};
    this.keysUp = {};
    this.mouse.leftDown = false;
    this.mouse.rightDown = false;
  }
};

// ─── GameState 完整结构 ───
const _state = {
  phase: 'title', // title|character_select|playing|paused|talent_select|shopping|boss_intro|death|victory
  run: {
    active: false,
    startTime: 0,
    elapsed: 0,
    seed: 0
  },
  player: {
    characterId: 'voidwalker',
    x: 0, y: 0,
    facing: 0,
    state: 'idle', // idle|moving|attacking|dodging|blocking|hurt|dead
    stats: {
      hp: 100, maxHp: 100,
      mp: 50, maxMp: 50,
      sta: 100, maxSta: 100,
      atk: 10, def: 5,
      crit: 0.05, critDmg: 1.5,
      spd: 200, aspd: 0.6,
      elem: 0
    },
    level: 1, exp: 0, expToNext: 15,
    gold: 0, kills: 0,
    element: 'void',
    iFrames: 0,
    buffs: [],
    equipment: { weapon: null, armor: null, accessory1: null, accessory2: null }
  },
  dungeon: {
    currentLayer: 1,
    currentRoomId: null,
    roomsExplored: 0,
    layerData: null,
    mapRevealed: []
  },
  combat: {
    combo: { count: 0, timer: 0, maxCombo: 0 },
    activeEffects: [],
    killCount: 0
  },
  inventory: {
    items: [],
    maxSlots: 12,
    activeSynergies: []
  },
  talents: {
    acquired: [],
    pendingChoice: null
  },
  frame: {
    deltaTime: 0,
    fps: 0,
    inputState: null,
    timeScale: 1.0
  }
};

// ─── Game Loop ───
let _rafId = null;
let _running = false;
let _lastTime = 0;
let _fpsAccumulator = 0;
let _fpsFrameCount = 0;
let _displayFps = 60;

export const GameEngine = {
  /** 暴露 Input 供其他模块使用 */
  Input,

  /**
   * 初始化引擎
   * @param {Object} config
   * @param {HTMLElement} config.container - Canvas 容器
   * @param {number} [config.targetFPS=60] - 目标帧率
   * @returns {boolean} 成功/失败
   */
  init(config = {}) {
    const container = config.container;
    if (!container) {
      console.error('[Engine] No container provided');
      return false;
    }

    // 初始化渲染器
    const contexts = Renderer.init({ container, width: 960, height: 640 });
    if (!contexts) {
      console.error('[Engine] Renderer init failed');
      return false;
    }

    // 初始化碰撞系统
    Collision.init({ cellSize: 64 });

    // 初始化特效系统
    const fxCtx = Renderer.getContext('fx');
    FXManager.init({ ctx: fxCtx, maxParticles: 500 });

    // 初始化星空背景
    const bgCtx = Renderer.getContext('bg');
    FXManager.initStarfield(bgCtx, 200);

    // 初始化 AI 控制器
    AIController.init({ updateInterval: 100, detectionRange: 200, attackRange: 50 });

    // 初始化输入系统（使用最顶层 Canvas 接收事件）
    const topCanvas = container.querySelector('#canvas-hud');
    Input.init(topCanvas);

    // 监听 visibilitychange
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && _state.phase === 'playing') {
        this.pause();
      }
    });

    // 监听暂停键
    EventBus.on('input:escape', () => {
      if (_state.phase === 'playing') {
        this.pause();
      } else if (_state.phase === 'paused') {
        this.resume();
      }
    });

    // 时间缩放（慢动作特效）
    EventBus.on('fx:timeScale', (data) => {
      if (data && typeof data.timeScale === 'number') {
        _state.frame.timeScale = data.timeScale;
      }
    });

    // 玩家升级 → 触发天赋选择
    EventBus.on('player:levelUp', (data) => {
      _state.player.level = data.newLevel || _state.player.level + 1;
      const choices = TalentSystem.getAvailableTalents(
        _state.player.level,
        _state.talents.acquired,
        _state.player.characterId
      );
      if (choices && choices.length > 0) {
        _state.talents.pendingChoice = choices;
        _state.phase = 'talent_select';
        EventBus.emit('talent:choiceReady', { choices });
        UIManager.showScreen('talent_select', { choices });
      }
    });

    // 天赋选择完成
    EventBus.on('talent:selected', (data) => {
      if (data && data.talentId) {
        const result = TalentSystem.selectTalent(data.talentId);
        if (result) {
          _state.talents.acquired.push(data.talentId);
          _state.talents.pendingChoice = null;
          // 应用属性变更
          const player = EntityManager.getPlayer();
          if (player && result.statChanges) {
            for (const [key, value] of Object.entries(result.statChanges)) {
              if (player.stats && player.stats[key] !== undefined) {
                player.stats[key] += value;
              }
            }
          }
        }
        _state.phase = 'playing';
        UIManager.showScreen('game');
      }
    });

    console.log('[Engine] ✅ Initialized successfully');
    return true;
  },

  /**
   * 开始新一局
   * @param {Object} options
   * @param {string} options.characterId - 角色 ID
   * @param {string} [options.startingItem] - 起始装备
   */
  start(options = {}) {
    const characterId = options.characterId || 'voidwalker';
    const seed = options.seed || Date.now();

    // 重置 GameState
    _state.phase = 'playing';
    _state.run.active = true;
    _state.run.startTime = performance.now();
    _state.run.elapsed = 0;
    _state.run.seed = seed;

    _state.player.characterId = characterId;
    _state.player.facing = 0;
    _state.player.state = 'idle';
    _state.player.level = 1;
    _state.player.exp = 0;
    _state.player.gold = 0;
    _state.player.kills = 0;
    _state.player.iFrames = 0;
    _state.player.buffs = [];

    // 角色基础属性
    this._applyCharacterStats(characterId);

    _state.dungeon.currentLayer = 1;
    _state.dungeon.roomsExplored = 0;
    _state.combat.combo = { count: 0, timer: 0, maxCombo: 0 };
    _state.combat.killCount = 0;
    _state.inventory.items = [];
    _state.inventory.activeSynergies = [];
    _state.talents.acquired = [];
    _state.talents.pendingChoice = null;
    _state.frame.timeScale = 1.0;

    // ── 重置/初始化所有子系统 ──
    EntityManager.reset();
    CombatSystem.reset();
    ItemSystem.reset();
    TalentSystem.reset();
    DungeonGenerator.reset();
    AIController.init({ updateInterval: 100 });

    // ── 生成第一层地牢 ──
    const dungeonData = DungeonGenerator.generate({ layer: 1, seed });
    _state.dungeon.layerData = dungeonData;

    // 获取出生房间
    const startRoom = DungeonGenerator.getCurrentRoom();
    const spawnX = startRoom ? (startRoom.bounds.left + startRoom.bounds.right) / 2 : 480;
    const spawnY = startRoom ? (startRoom.bounds.top + startRoom.bounds.bottom) / 2 : 320;
    _state.player.x = spawnX;
    _state.player.y = spawnY;

    // ── 创建玩家实体 ──
    const meta = SaveManager.loadProgress();
    EntityManager.createPlayer({
      characterId,
      x: spawnX,
      y: spawnY,
      metaUpgrades: meta.permanentUpgrades || {}
    });

    // ── 初始化相机 ──
    Camera.init({
      viewWidth: 960,
      viewHeight: 640,
      lerpFactor: 0.1,
      initialTarget: { x: spawnX, y: spawnY }
    });

    // 设置房间边界
    if (startRoom) {
      Camera.setBounds(startRoom.bounds);
    } else {
      Camera.setBounds({ left: 0, top: 0, right: 960, bottom: 640 });
    }

    // ── 在起始房间生成敌人 ──
    this._spawnRoomEnemies(startRoom);

    // 发布事件
    EventBus.emit('game:start', { characterId, seed });
    EventBus.emit('dungeon:roomEnter', {
      roomId: startRoom ? startRoom.id : null,
      roomType: startRoom ? startRoom.type : 'normal',
      layer: 1
    });

    // 音频状态切换
    if (window.AudioManager) {
      window.AudioManager.init();
      window.AudioManager.setState('explore');
    }

    // UIManager 切换到游戏界面
    UIManager.showScreen('game');

    // ── 初始化教学系统 ──
    const isFirstRun = !SaveManager.isTutorialDone();
    TutorialSystem.init(isFirstRun);
    // 教学完成 → 存档
    EventBus.on('tutorial:complete', () => {
      SaveManager.setTutorialDone();
    });

    // 启动游戏循环
    if (!_running) {
      _running = true;
      _lastTime = performance.now();
      _rafId = requestAnimationFrame((t) => this._loop(t));
    }

    console.log(`[Engine] 🎮 Game started — ${characterId}, seed: ${seed}`);
  },

  /** 暂停 */
  pause() {
    if (_state.phase !== 'playing') return;
    _state.phase = 'paused';
    EventBus.emit('game:pause', {});
    console.log('[Engine] ⏸ Paused');
  },

  /** 恢复 */
  resume() {
    if (_state.phase !== 'paused') return;
    _state.phase = 'playing';
    _lastTime = performance.now(); // 防止 dt 跳跃
    EventBus.emit('game:resume', {});
    console.log('[Engine] ▶ Resumed');
  },

  /**
   * 获取状态快照
   * @returns {Object} GameState 的深拷贝
   */
  getState() {
    return _state; // 直接引用（性能考虑），调用方不应修改
  },

  /**
   * 监听状态变化（语法糖→EventBus）
   * @param {string} stateKey - 如 'player.hp', 'dungeon.currentLayer'
   * @param {Function} callback
   */
  onStateChange(stateKey, callback) {
    EventBus.on(`state:${stateKey}`, callback);
  },

  /**
   * 结束当局
   * @param {'death'|'victory'} reason
   * @returns {Object} 结算数据
   */
  endRun(reason) {
    _state.phase = reason === 'victory' ? 'victory' : 'death';
    _state.run.active = false;
    _state.run.elapsed = (performance.now() - _state.run.startTime) / 1000;

    const result = {
      reason,
      shards: this._calculateShards(),
      kills: _state.combat.killCount,
      maxCombo: _state.combat.combo.maxCombo,
      layerReached: _state.dungeon.currentLayer,
      time: _state.run.elapsed
    };

    // 保存运行结果到 Meta 进度
    SaveManager.saveRun({
      shardsEarned: result.shards,
      layerReached: result.layerReached,
      bossesKilled: 0, // TODO: 统计 Boss 击杀数
      characterUsed: _state.player.characterId,
      stats: {
        kills: result.kills,
        maxCombo: result.maxCombo,
        time: result.time,
        itemsCollected: _state.inventory.items.length
      }
    });

    // 清除运行中存档
    SaveManager.clearRunState();

    EventBus.emit('game:end', { reason, result });

    // 显示结算界面
    UIManager.showResultScreen({
      outcome: reason,
      shards: result.shards,
      kills: result.kills,
      maxCombo: result.maxCombo,
      layerReached: result.layerReached,
      timeElapsed: result.time,
      unlocks: []
    });

    // 音频
    if (window.AudioManager) {
      if (reason === 'death') {
        window.AudioManager.play('death');
      } else {
        window.AudioManager.play('victory');
      }
      window.AudioManager.stopBGM();
    }

    console.log(`[Engine] 🏁 Run ended — ${reason}`, result);
    return result;
  },

  // ─── 主循环 ───

  /** rAF 循环 */
  _loop(timestamp) {
    if (!_running) return;

    // 计算 dt
    let dt = (timestamp - _lastTime) / 1000;
    _lastTime = timestamp;

    // 限制最大 dt
    if (dt > MAX_DT) dt = MAX_DT;

    // FPS 计算
    _fpsAccumulator += dt;
    _fpsFrameCount++;
    if (_fpsAccumulator >= 1.0) {
      _displayFps = _fpsFrameCount;
      _fpsFrameCount = 0;
      _fpsAccumulator = 0;
    }

    // 应用时间缩放
    const scaledDt = dt * _state.frame.timeScale;
    _state.frame.deltaTime = scaledDt;
    _state.frame.fps = _displayFps;

    // 仅在 playing 状态执行游戏逻辑
    if (_state.phase === 'playing') {
      _state.run.elapsed += scaledDt;
      this._update(scaledDt);
    }

    // 即使暂停也要处理输入（用于菜单操作）
    this._processMenuInput();

    // 渲染（始终执行，包括暂停界面）
    Renderer.draw();

    // 绘制场景（实体+房间）
    if (_state.phase === 'playing' || _state.phase === 'paused') {
      EventBus.emit('engine:preRender');
      this._renderScene();
      // FX 绘制在特效层
      const fxCtx = Renderer.getContext('fx');
      if (fxCtx) FXManager.draw(fxCtx);
      EventBus.emit('engine:postRender');
    }

    Renderer.updateTransition(dt);

    // 帧末清除输入
    Input._endFrame();

    // 下一帧
    _rafId = requestAnimationFrame((t) => this._loop(t));
  },

  /**
   * 主更新（9步顺序）
   * Input → Entity → AI → Combat → Collision → Camera → FX → Render → UI
   * @param {number} dt - 缩放后的帧间隔（秒）
   */
  _update(dt) {
    // 1. Input — 处理输入
    this._processGameInput(dt);

    // 2. Entity — 更新所有实体
    // Sprint 5: 处理敌人 engagement delay
    const allEnts = EntityManager.getAllEntities();
    for (let i = 0; i < allEnts.length; i++) {
      const e = allEnts[i];
      if (e && e._engageDelay > 0) {
        e._engageDelay -= dt;
        if (e._engageDelay <= 0) {
          e.speed = e._originalSpeed || 1;
          e._engageDelay = 0;
          // 闪白提示：敌人激活
          e.flashTimer = 0.1;
        }
      }
    }
    EntityManager.update(dt);

    // 同步 _state.player 与 EntityManager 中的玩家实体
    const playerEntity = EntityManager.getPlayer();
    if (playerEntity) {
      _state.player.x = playerEntity.x;
      _state.player.y = playerEntity.y;
      _state.player.state = playerEntity.state;
      _state.player.facing = playerEntity.facing;
      _state.player.stats = playerEntity.stats || _state.player.stats;
      _state.player.iFrames = playerEntity.iFrames || 0;
    }

    // 天赋被动每帧应用
    if (playerEntity) {
      TalentSystem.applyPassives(playerEntity, dt);
    }

    // 3. AI — 更新敌人 AI
    const enemies = EntityManager.getAliveEnemies();
    if (playerEntity && enemies.length > 0) {
      const aiActions = AIController.update(dt, enemies, playerEntity);
      // 处理 AI 行为指令
      if (aiActions && aiActions.length > 0) {
        this._processAIActions(aiActions);
      }
    }

    // 3.5 Boss 阶段切换视觉反馈
    this._checkBossPhaseTransitions(enemies);

    // 4. Combat — 更新战斗系统（DoT、Combo计时器等）
    CombatSystem.update(dt);

    // 同步 Combo 状态
    const comboState = CombatSystem.getComboState();
    _state.combat.combo.count = comboState.count;
    _state.combat.combo.timer = comboState.timer;
    if (comboState.maxCombo > _state.combat.combo.maxCombo) {
      _state.combat.combo.maxCombo = comboState.maxCombo;
    }

    // 5. Collision — 碰撞检测
    this._handleCollisions();

    // 6. Camera — ⚠️ 必须在渲染前完成
    Camera.setTarget({ x: _state.player.x, y: _state.player.y });
    Camera.update(dt);

    // 7. FX — 更新特效
    FXManager.update(dt);

    // 8. Render — 在 _loop 中统一处理

    // 9. UI — 更新 HUD
    UIManager.updateHUD({
      hp: _state.player.stats.hp,
      maxHp: _state.player.stats.maxHp,
      mp: _state.player.stats.mp,
      maxMp: _state.player.stats.maxMp,
      sta: _state.player.stats.sta,
      maxSta: _state.player.stats.maxSta,
      level: _state.player.level,
      exp: _state.player.exp,
      expToNext: _state.player.expToNext,
      layer: _state.dungeon.currentLayer,
      roomInfo: DungeonGenerator.getCurrentRoom()?.type || 'normal',
      gold: _state.player.gold,
      kills: _state.combat.killCount,
      combo: comboState.count,
      comboTier: comboState.tier,
      fps: _displayFps
    });
    UIManager.update(dt);

    // 10. Tutorial — 更新教学系统
    TutorialSystem.update(dt);

    // 检查玩家死亡
    if (playerEntity && playerEntity.stats && playerEntity.stats.hp <= 0 && _state.player.state !== 'dead') {
      // 检查天赋系统是否有欺骗死亡
      if (!TalentSystem.tryCheatDeath()) {
        _state.player.state = 'dead';
        EntityManager.playerDeath();
        this.endRun('death');
      }
    }

    // 检查房间清理
    this._checkRoomClear();
  },

  // ─── 输入处理 ───

  /** 游戏中输入处理 */
  _processGameInput(dt) {
    const player = EntityManager.getPlayer();

    // 移动 — 通过 EntityManager 更新玩家位置
    const move = Input.getMoveVector();
    if (player) {
      if (move.x !== 0 || move.y !== 0) {
        const spd = (player.stats?.spd || _state.player.stats.spd) * dt;
        player.x += move.x * spd;
        player.y += move.y * spd;
        player.facing = Math.atan2(move.y, move.x);
        if (player.state === 'idle') player.state = 'moving';

        // 通知教学系统：玩家移动
        EventBus.emit('player:move', { dx: move.x, dy: move.y });

        // 边界限制（当前房间）
        const room = DungeonGenerator.getCurrentRoom();
        if (room && room.bounds) {
          const hw = (player.width || 24) / 2;
          const hh = (player.height || 24) / 2;
          player.x = Math.max(room.bounds.left + hw, Math.min(room.bounds.right - hw, player.x));
          player.y = Math.max(room.bounds.top + hh, Math.min(room.bounds.bottom - hh, player.y));
        }
      } else if (player.state === 'moving') {
        player.state = 'idle';
      }
    } else {
      // 降级：没有 EntityManager 玩家时直接操作 state
      if (move.x !== 0 || move.y !== 0) {
        const spd = _state.player.stats.spd * dt;
        _state.player.x += move.x * spd;
        _state.player.y += move.y * spd;
        _state.player.facing = Math.atan2(move.y, move.x);
        _state.player.state = 'moving';
      } else if (_state.player.state === 'moving') {
        _state.player.state = 'idle';
      }
    }

    // 攻击 — J 或 鼠标左键
    if (Input.isPressed('KeyJ') || Input.mouse.leftDown) {
      if (player) {
        const attacked = EntityManager.playerAttack();
        if (attacked) {
          // 攻击成功后由 CombatSystem 通过 EventBus 处理伤害
          EventBus.emit('player:attack', {
            x: player.x,
            y: player.y,
            facing: player.facing,
            element: _state.player.element
          });
          // 攻击弧光特效
          FXManager.playEffect('attack_arc', player.x, player.y, { direction: player.facing, element: _state.player.element });
          if (window.AudioManager) window.AudioManager.play('attack_light');
          Camera.shake(3, 0.12);
        }
      } else {
        if (window.AudioManager) window.AudioManager.play('attack_light');
        Camera.shake(2, 0.1);
      }
    }

    // 技能1 — K 或 鼠标右键
    if (Input.isPressed('KeyK') || Input.mouse.rightDown) {
      if (player) {
        EventBus.emit('player:skill', { skillId: 'skill1', x: player.x, y: player.y, facing: player.facing });
      }
      if (window.AudioManager) window.AudioManager.play('skill_cast');
    }

    // 技能2 — L
    if (Input.isPressed('KeyL')) {
      if (player) {
        EventBus.emit('player:skill', { skillId: 'skill2', x: player.x, y: player.y, facing: player.facing });
      }
    }

    // 闪避翻滚 — Space
    if (Input.isPressed('Space')) {
      if (player) {
        const dodged = EntityManager.playerDodge(move.x, move.y);
        if (dodged) {
          TalentSystem.onDodge(); // 通知天赋系统
          // 闪避残影特效
          FXManager.playEffect('dodge_shadow', player.x, player.y, {
            direction: player.facing,
            width: player.width || 24,
            height: player.height || 24,
            color: _state.player.element === 'void' ? '#a855f7' : '#94a3b8'
          });
        }
      }
      if (window.AudioManager) window.AudioManager.play('dodge');
    }

    // 格挡 — Shift (持续)
    if (Input.isDown('ShiftLeft') || Input.isDown('ShiftRight')) {
      if (player) EntityManager.playerStartBlock();
    } else {
      if (player && player.state === 'blocking') EntityManager.playerStopBlock();
    }

    // 交互 — E（拾取/宝箱/NPC/门）
    if (Input.isPressed('KeyE')) {
      this._handleInteraction();
    }

    // 使用消耗品 — Q
    if (Input.isPressed('KeyQ')) {
      const inv = ItemSystem.getInventory();
      // 查找第一个消耗品使用
      const consumable = inv.items.find(item => item && item.type === 'consumable');
      if (consumable) {
        ItemSystem.useItem(consumable.itemId);
      }
    }

    // 地图 — Tab / M
    if (Input.isPressed('Tab') || Input.isPressed('KeyM')) {
      if (_state.phase === 'playing') {
        const mapData = DungeonGenerator.getMapData();
        UIManager.showScreen('map', mapData);
      }
    }

    // 背包 — I
    if (Input.isPressed('KeyI')) {
      if (_state.phase === 'playing') {
        UIManager.showScreen('inventory', ItemSystem.getInventory());
      }
    }

    // 暂停 — Escape（教学激活时先跳过教学）
    if (Input.isPressed('Escape')) {
      if (TutorialSystem.isActive()) {
        TutorialSystem.skip();
      } else {
        this.pause();
      }
    }
  },

  /** 菜单输入处理（暂停/标题等界面） */
  _processMenuInput() {
    if (_state.phase === 'paused') {
      if (Input.isPressed('Escape')) {
        this.resume();
      }
    }
    // 标题和角色选择已由 UIManager DOM 处理
  },

  // ─── 渲染场景 ───

  /** 渲染当前场景 */
  _renderScene() {
    const entityCtx = Renderer.getContext('entity');
    if (!entityCtx) return;

    // 绘制当前房间
    const currentRoom = DungeonGenerator.getCurrentRoom();
    if (currentRoom) {
      Renderer.drawRoom(entityCtx, {
        bounds: currentRoom.bounds,
        doors: currentRoom.doors || [],
        cleared: currentRoom.cleared || false,
        type: currentRoom.type || 'normal'
      });
    } else {
      // 降级：绘制默认房间
      Renderer.drawRoom(entityCtx, {
        bounds: { left: 0, top: 0, right: 960, bottom: 640 },
        doors: [],
        cleared: false,
        type: 'normal'
      });
    }

    // 绘制所有实体
    const allEntities = EntityManager.getAllEntities();
    for (let i = 0; i < allEntities.length; i++) {
      const entity = allEntities[i];
      if (entity && entity.alive !== false) {
        Renderer.drawEntity(entityCtx, entity);
      }
    }

    // 绘制掉落物品（如果有）
    // TODO: 掉落物渲染（后续增强）

    // 绘制小地图
    const hudCtx = Renderer.getContext('hud');
    if (hudCtx) {
      const mapData = DungeonGenerator.getMapData();
      if (mapData) {
        Renderer.drawMinimap(hudCtx, mapData, _width - 130, 50, 120);
      }
      // 绘制教学提示（HUD 层）
      TutorialSystem.draw(hudCtx);
    }
  },

  // ─── 碰撞处理 ───

  /** 碰撞检测与处理 */
  _handleCollisions() {
    const allEntities = EntityManager.getAllEntities();
    if (allEntities.length < 2) return;

    // 使用 Collision.detect() — 内部自动 updateGrid + 检测
    const aliveEntities = allEntities.filter(e => e && e.alive !== false);
    Collision.detect(aliveEntities);

    const player = EntityManager.getPlayer();
    if (!player) return;

    // 玩家与敌人碰撞
    const nearbyEnemies = EntityManager.getEntitiesInRange(
      player.x, player.y, 60, { type: 'enemy', alive: true }
    );

    for (const enemy of nearbyEnemies) {
      const dist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
      const minDist = ((player.width || 24) + (enemy.width || 24)) / 2;

      if (dist < minDist) {
        // 接触伤害（如果敌人处于攻击状态）
        const aiState = AIController.getState(enemy.id);
        if (aiState && aiState.state === 'attack' && player.iFrames <= 0) {
          // 检查格挡
          if (player.state === 'blocking') {
            const isPerfect = EntityManager.isPlayerPerfectBlock();
            const blockResult = CombatSystem.processBlock(player, enemy, isPerfect);
            if (blockResult.isPerfect) {
              EventBus.emit('combat:perfectParry', { x: player.x, y: player.y });
              if (window.AudioManager) window.AudioManager.play('parry');
            } else {
              EventBus.emit('combat:block', { x: player.x, y: player.y });
              if (window.AudioManager) window.AudioManager.play('block');
            }
          } else if (player.state !== 'dodging') {
            // 玩家受伤
            const dmgResult = CombatSystem.takeDamage(player, enemy.stats?.atk || 10, 'attack');
            if (dmgResult.actualDamage > 0) {
              EntityManager.playerHurt();
              EventBus.emit('combat:hit', {
                x: player.x, y: player.y,
                damage: dmgResult.actualDamage,
                targetType: 'player'
              });
              UIManager.showDamageNumber({
                x: player.x, y: player.y - 20,
                value: dmgResult.actualDamage,
                type: 'normal'
              });
              if (window.AudioManager) window.AudioManager.play('hit_heavy');
              Camera.shake(6, 0.18);
            }
          }
        }

        // 推开重叠实体
        if (dist > 0) {
          const pushForce = (minDist - dist) * 0.5;
          const nx = (player.x - enemy.x) / dist;
          const ny = (player.y - enemy.y) / dist;
          player.x += nx * pushForce;
          player.y += ny * pushForce;
          enemy.x -= nx * pushForce * 0.3;
          enemy.y -= ny * pushForce * 0.3;
        }
      }
    }

    // 投射物碰撞
    const projectiles = allEntities.filter(e => e.type === 'projectile' && e.alive !== false);
    for (const proj of projectiles) {
      if (proj.ownerType === 'player') {
        // 玩家投射物 vs 敌人
        const targets = EntityManager.getEntitiesInRange(proj.x, proj.y, proj.radius || 16, { type: 'enemy', alive: true });
        for (const target of targets) {
          const attackResult = CombatSystem.attack({
            attacker: player,
            target: target,
            element: proj.element || _state.player.element
          });
          EventBus.emit('combat:hit', {
            x: target.x, y: target.y,
            damage: attackResult.damage,
            isCrit: attackResult.isCrit,
            element: attackResult.element,
            targetType: 'enemy'
          });
          UIManager.showDamageNumber({
            x: target.x, y: target.y - 20,
            value: attackResult.damage,
            type: attackResult.isCrit ? 'crit' : 'normal'
          });
          // 命中闪白 + 击退
          target.flashTimer = 0.12;
          if (attackResult.killed) {
            _state.combat.killCount++;
            _state.player.kills++;
            EventBus.emit('combat:kill', { x: target.x, y: target.y, enemyId: target.enemyId, victim: target });
            // 掉落物品
            const loot = ItemSystem.generateLoot(target.isBoss ? 'boss' : target.isElite ? 'elite' : 'normal', _state.dungeon.currentLayer);
            for (const drop of loot) {
              if (drop.goldAmount) {
                _state.player.gold += drop.goldAmount;
              } else {
                ItemSystem.addItem(drop.itemId);
                EventBus.emit('item:acquired', { itemId: drop.itemId, x: target.x, y: target.y });
              }
            }
            // 给予经验
            EntityManager.addPlayerExp(target.expValue || 10);
            if (window.AudioManager) window.AudioManager.play('kill');
          }
          // 非穿透投射物命中后销毁
          if (!proj.piercing) {
            EntityManager.removeEntity(proj.id);
            break;
          }
        }
      } else {
        // 敌人投射物 vs 玩家
        const dist = Math.sqrt((proj.x - player.x) ** 2 + (proj.y - player.y) ** 2);
        if (dist < (proj.radius || 16) + (player.width || 24) / 2) {
          if (player.state !== 'dodging' && player.iFrames <= 0) {
            if (player.state === 'blocking') {
              const isPerfect = EntityManager.isPlayerPerfectBlock();
              CombatSystem.processBlock(player, { stats: { atk: proj.damage || 10 } }, isPerfect);
            } else {
              const dmgResult = CombatSystem.takeDamage(player, proj.damage || 10, 'attack');
              if (dmgResult.actualDamage > 0) {
                EntityManager.playerHurt();
                EventBus.emit('combat:hit', { x: player.x, y: player.y, damage: dmgResult.actualDamage, targetType: 'player' });
                UIManager.showDamageNumber({ x: player.x, y: player.y - 20, value: dmgResult.actualDamage, type: 'normal' });
                Camera.shake(3, 0.12);
              }
            }
          }
          EntityManager.removeEntity(proj.id);
        }
      }
    }

    // 玩家近战攻击碰撞（攻击状态时检查前方敌人）
    if (player.state === 'attacking') {
      const attackRange = player.stats?.aspd ? 40 : 40;
      const attackAngle = player.facing;
      const checkX = player.x + Math.cos(attackAngle) * attackRange;
      const checkY = player.y + Math.sin(attackAngle) * attackRange;
      const targets = EntityManager.getEntitiesInRange(checkX, checkY, 35, { type: 'enemy', alive: true });

      for (const target of targets) {
        if (target._hitThisSwing) continue; // 防止同一次挥击多次命中
        target._hitThisSwing = true;

        const attackResult = CombatSystem.attack({
          attacker: player,
          target: target,
          element: _state.player.element
        });

        // Combo
        const comboResult = CombatSystem.applyCombo(true);
        if (comboResult.tierChanged) {
          EventBus.emit('combat:comboTier', { tier: comboResult.tier, count: comboResult.count });
        }

        // ── 命中反馈增强 ──
        // 闪白效果
        target.flashTimer = 0.15;

        // 击退物理
        const knockbackForce = attackResult.isCrit ? 8 : 4;
        const kbAngle = player.facing;
        target.x += Math.cos(kbAngle) * knockbackForce;
        target.y += Math.sin(kbAngle) * knockbackForce;

        EventBus.emit('combat:hit', {
          x: target.x, y: target.y,
          damage: attackResult.damage,
          isCrit: attackResult.isCrit,
          element: attackResult.element,
          targetType: 'enemy',
          target: target
        });

        UIManager.showDamageNumber({
          x: target.x, y: target.y - 20,
          value: attackResult.damage,
          type: attackResult.isCrit ? 'crit' : (attackResult.element ? 'element' : 'normal')
        });

        // 元素反应
        if (attackResult.reaction) {
          EventBus.emit('combat:reaction', {
            x: target.x, y: target.y,
            reaction: attackResult.reaction,
            element: attackResult.element
          });
        }

        if (attackResult.killed) {
          _state.combat.killCount++;
          _state.player.kills++;
          EventBus.emit('combat:kill', {
            x: target.x, y: target.y,
            enemyId: target.enemyId,
            victim: target
          });
          const loot = ItemSystem.generateLoot(target.isBoss ? 'boss' : target.isElite ? 'elite' : 'normal', _state.dungeon.currentLayer);
          for (const drop of loot) {
            if (drop.goldAmount) {
              _state.player.gold += drop.goldAmount;
            } else {
              ItemSystem.addItem(drop.itemId);
              EventBus.emit('item:acquired', { itemId: drop.itemId, x: target.x, y: target.y });
            }
          }
          EntityManager.addPlayerExp(target.expValue || 10);
          if (window.AudioManager) window.AudioManager.play('kill');
        }

        if (window.AudioManager) window.AudioManager.play('hit_light');
      }
    }

    // 清除近战命中标记
    const enemies2 = EntityManager.getAliveEnemies();
    for (const enemy of enemies2) {
      if (player.state !== 'attacking') {
        enemy._hitThisSwing = false;
      }
    }
  },

  // ─── AI 行为处理 ───

  /** 处理 AI 返回的行为指令 */
  _processAIActions(actions) {
    const player = EntityManager.getPlayer();
    if (!player) return;

    for (const action of actions) {
      const enemy = EntityManager.getAllEntities().find(e => e.id === action.entityId);
      if (!enemy || enemy.alive === false) continue;

      switch (action.action) {
        case 'move':
          // AI 移动 — 向目标位置移动
          if (action.targetX !== undefined && action.targetY !== undefined) {
            const dx = action.targetX - enemy.x;
            const dy = action.targetY - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
              const spd = (enemy.stats?.spd || 100) * _state.frame.deltaTime;
              enemy.x += (dx / dist) * spd;
              enemy.y += (dy / dist) * spd;
              enemy.facing = Math.atan2(dy, dx);
            }
          }
          break;

        case 'attack':
          // AI 攻击 — 通过 CombatSystem 处理
          if (player.state !== 'dodging' && player.iFrames <= 0) {
            if (player.state === 'blocking') {
              const isPerfect = EntityManager.isPlayerPerfectBlock();
              const blockResult = CombatSystem.processBlock(player, enemy, isPerfect);
              if (blockResult.isPerfect) {
                EventBus.emit('combat:perfectParry', { x: player.x, y: player.y });
              } else if (blockResult.blocked) {
                EventBus.emit('combat:block', { x: player.x, y: player.y });
              }
            } else {
              const dmg = CombatSystem.takeDamage(player, enemy.stats?.atk || 10, 'attack');
              if (dmg.actualDamage > 0) {
                EntityManager.playerHurt();
                EventBus.emit('combat:hit', {
                  x: player.x, y: player.y,
                  damage: dmg.actualDamage,
                  targetType: 'player'
                });
                UIManager.showDamageNumber({
                  x: player.x, y: player.y - 20,
                  value: dmg.actualDamage,
                  type: 'normal'
                });
                Camera.shake(3, 0.12);
              }
            }
          }
          break;

        case 'ranged_attack':
          // 远程攻击 — 创建投射物
          if (action.targetX !== undefined && action.targetY !== undefined) {
            const dx = action.targetX - enemy.x;
            const dy = action.targetY - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              EntityManager.createProjectile({
                x: enemy.x,
                y: enemy.y,
                dx: dx / dist,
                dy: dy / dist,
                speed: 200,
                damage: enemy.stats?.atk || 8,
                owner: enemy.id,
                ownerType: 'enemy',
                element: enemy.element || null,
                lifetime: 3
              });
            }
          }
          break;

        case 'aoe_attack':
          // AOE 攻击
          if (player.state !== 'dodging' && player.iFrames <= 0) {
            const aoeDist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
            const aoeRange = action.radius || 100;
            if (aoeDist < aoeRange) {
              const dmg = CombatSystem.takeDamage(player, (enemy.stats?.atk || 10) * 1.5, 'attack');
              if (dmg.actualDamage > 0) {
                EntityManager.playerHurt();
                EventBus.emit('combat:hit', { x: player.x, y: player.y, damage: dmg.actualDamage, targetType: 'player' });
                UIManager.showDamageNumber({ x: player.x, y: player.y - 20, value: dmg.actualDamage, type: 'normal' });
                Camera.shake(6, 0.25);
              }
            }
          }
          // AOE 特效
          FXManager.playEffect('element_reaction_void', enemy.x, enemy.y);
          break;

        default:
          break;
      }
    }
  },

  // ─── 房间管理 ───

  /** 检查当前房间是否清除 */
  _checkRoomClear() {
    const room = DungeonGenerator.getCurrentRoom();
    if (!room || room.cleared) return;

    const enemyCount = EntityManager.getAliveEnemyCount();
    if (enemyCount === 0) {
      // 防卡关：如果房间未清除但没有存活敌人，立即清除
      DungeonGenerator.clearCurrentRoom();
      _state.dungeon.roomsExplored++;
      EventBus.emit('dungeon:roomCleared', {
        roomId: room.id,
        roomType: room.type,
        layer: _state.dungeon.currentLayer
      });

      if (window.AudioManager) window.AudioManager.play('room_clear');

      // Sprint 5: 房间清除的额外视觉反馈
      FXManager.screenShake(3, 0.1);

      // 检查是否击败 Boss
      if (room.type === 'boss') {
        const bossRoomId = DungeonGenerator.getBossRoomId();
        if (room.id === bossRoomId) {
          // 尝试进入下一层
          const nextLayerData = DungeonGenerator.nextLayer();
          if (nextLayerData) {
            _state.dungeon.currentLayer++;
            _state.dungeon.layerData = nextLayerData;
            // 传送到新层出生点
            const newRoom = DungeonGenerator.getCurrentRoom();
            if (newRoom) {
              const spawnX = (newRoom.bounds.left + newRoom.bounds.right) / 2;
              const spawnY = (newRoom.bounds.top + newRoom.bounds.bottom) / 2;
              const player = EntityManager.getPlayer();
              if (player) {
                player.x = spawnX;
                player.y = spawnY;
              }
              Camera.setBounds(newRoom.bounds);
              Camera.snapTo(spawnX, spawnY);
              EntityManager.clearNonPlayerEntities();
              this._spawnRoomEnemies(newRoom);
              EventBus.emit('dungeon:roomEnter', { roomId: newRoom.id, roomType: newRoom.type, layer: _state.dungeon.currentLayer });
              if (window.AudioManager) window.AudioManager.setState('explore');
            }
          } else {
            // 通关！
            this.endRun('victory');
          }
        }
      }
    }
  },

  /** 在房间中生成敌人 */
  _spawnRoomEnemies(room) {
    if (!room || room.type === 'start' || room.type === 'shop') return;

    // 第一层第一个房间（起始房间）不生成敌人 → 安全教学区
    if (_state.dungeon.currentLayer === 1 && _state.dungeon.roomsExplored === 0 && !room._isSafeZoneChecked) {
      room._isSafeZoneChecked = true;
      room.cleared = true;
      EventBus.emit('dungeon:roomCleared', {
        roomId: room.id,
        roomType: room.type,
        layer: 1
      });
      return;
    }

    const layer = DungeonGenerator.getCurrentLayer();
    const isBossRoom = room.type === 'boss';
    const roomW = room.bounds.right - room.bounds.left;
    const roomH = room.bounds.bottom - room.bounds.top;
    const cx = room.bounds.left + roomW / 2;
    const cy = room.bounds.top + roomH / 2;

    if (isBossRoom) {
      // Boss 房间 — 从 levels.js 取正确的 bossId
      const layerConfig = LEVELS[layer - 1];
      const bossId = layerConfig ? layerConfig.bossId : 'boss_euler';
      EntityManager.createEnemy({ enemyId: bossId, x: cx, y: cy - 60, layer, isBoss: true });
      if (window.AudioManager) window.AudioManager.setState('boss');
    } else {
      // 使用 dungeon.js 预生成的 room.enemies 数据（包含正确的 enemyId）
      const enemies = room.enemies || [];

      if (enemies.length === 0) {
        // 防卡关：如果预生成数据为空（event 房间可能无敌人），直接标记清除
        room.cleared = true;
        DungeonGenerator.clearCurrentRoom();
        _state.dungeon.roomsExplored++;
        EventBus.emit('dungeon:roomCleared', {
          roomId: room.id,
          roomType: room.type,
          layer: _state.dungeon.currentLayer
        });
        return;
      }

      for (let i = 0; i < enemies.length; i++) {
        const enemyData = enemies[i];
        // 使用预生成的相对坐标计算实际位置
        const ex = room.bounds.left + enemyData.relativeX * roomW;
        const ey = room.bounds.top + enemyData.relativeY * roomH;

        EntityManager.createEnemy({
          enemyId: enemyData.enemyId,
          x: ex,
          y: ey,
          layer,
          isElite: enemyData.isElite || false
        });

        // 敌人 engagement delay — 刚出现时不会立即攻击
        const allEnts = EntityManager.getAllEntities();
        const lastEnemy = allEnts[allEnts.length - 1];
        if (lastEnemy && (lastEnemy.type === 'enemy' || lastEnemy.type === 'elite')) {
          lastEnemy._engageDelay = 0.5 + Math.random() * 0.7; // 0.5~1.2秒
          lastEnemy._originalSpeed = lastEnemy.speed || 1;
          lastEnemy.speed = 0; // 生成时静止
        }
      }
    }
  },

  // ─── 交互处理 ───

  /** 处理 E 键交互 */
  _handleInteraction() {
    const player = EntityManager.getPlayer();
    if (!player) return;

    const room = DungeonGenerator.getCurrentRoom();
    if (!room) return;

    // 检查门交互 — 房间清除后可以通过门
    if (room.cleared && room.doors) {
      for (const door of room.doors) {
        if (!door) continue;
        const doorX = door.x || 0;
        const doorY = door.y || 0;
        const dist = Math.sqrt((player.x - doorX) ** 2 + (player.y - doorY) ** 2);
        if (dist < 40) {
          // ── 房间过渡：淡出→切换→淡入 ──
          if (_state._roomTransition) return; // 正在过渡中，忽略
          _state._roomTransition = true;
          _state._transitionAlpha = 0;
          _state._transitionPhase = 'fadeOut'; // fadeOut → switch → fadeIn

          const targetDoor = door;
          const transitionUpdate = () => {
            const speed = 4; // alpha/秒 (约0.25秒全黑)
            if (_state._transitionPhase === 'fadeOut') {
              _state._transitionAlpha = Math.min(1, _state._transitionAlpha + speed * (1 / 60));
              if (_state._transitionAlpha >= 1) {
                // 执行房间切换
                const nextRoom = DungeonGenerator.moveToRoom(targetDoor.targetRoomId, targetDoor.id);
                if (nextRoom) {
                  player.x = nextRoom.spawnX;
                  player.y = nextRoom.spawnY;
                  const newRoom = DungeonGenerator.getCurrentRoom();
                  if (newRoom) {
                    Camera.setBounds(newRoom.bounds);
                    Camera.snapTo(player.x, player.y);
                    EntityManager.clearNonPlayerEntities();
                    this._spawnRoomEnemies(newRoom);
                    EventBus.emit('dungeon:roomEnter', {
                      roomId: newRoom.id,
                      roomType: newRoom.type,
                      layer: _state.dungeon.currentLayer
                    });
                    // 音频状态平滑切换
                    if (newRoom.type === 'shop') {
                      UIManager.showScreen('shop');
                      if (window.AudioManager) window.AudioManager.setState('explore');
                    } else if (newRoom.type === 'boss') {
                      if (window.AudioManager) window.AudioManager.setState('boss');
                    } else {
                      if (window.AudioManager) window.AudioManager.setState('explore');
                    }
                  }
                  if (window.AudioManager) window.AudioManager.play('door_open');
                }
                _state._transitionPhase = 'fadeIn';
              }
            } else if (_state._transitionPhase === 'fadeIn') {
              _state._transitionAlpha = Math.max(0, _state._transitionAlpha - speed * (1 / 60));
              if (_state._transitionAlpha <= 0) {
                _state._roomTransition = false;
                _state._transitionPhase = null;
                EventBus.off('engine:preRender', transitionUpdate);
                EventBus.off('engine:postRender', transitionDraw);
              }
            }
          };
          const transitionDraw = () => {
            if (_state._transitionAlpha > 0) {
              const hudCtx = Renderer.getContext('hud');
              if (hudCtx) {
                hudCtx.save();
                hudCtx.globalAlpha = _state._transitionAlpha;
                hudCtx.fillStyle = '#0a0a1a';
                hudCtx.fillRect(0, 0, W, H);
                hudCtx.restore();
              }
            }
          };
          EventBus.on('engine:preRender', transitionUpdate);
          EventBus.on('engine:postRender', transitionDraw);
          return;
        }
      }
    }

    // 检查宝箱（宝藏房间）
    if (room.type === 'treasure' && !room._treasureOpened) {
      room._treasureOpened = true;
      const loot = ItemSystem.generateLoot('chest', _state.dungeon.currentLayer);
      for (const drop of loot) {
        if (drop.goldAmount) {
          _state.player.gold += drop.goldAmount;
        } else {
          ItemSystem.addItem(drop.itemId);
          EventBus.emit('item:acquired', { itemId: drop.itemId, x: player.x, y: player.y });
        }
      }
      if (window.AudioManager) window.AudioManager.play('chest_open');
    }
  },

  // ─── 角色属性初始化 ───

  _applyCharacterStats(characterId) {
    const base = _state.player.stats;
    switch (characterId) {
      case 'voidwalker':
        base.hp = 90;  base.maxHp = 90;
        base.mp = 70;  base.maxMp = 70;
        base.sta = 100; base.maxSta = 100;
        base.atk = 8;  base.def = 4;
        base.crit = 0.05; base.critDmg = 1.5;
        base.spd = 200; base.aspd = 0.6;
        base.elem = 15;
        _state.player.element = 'void';
        break;
      case 'abyssal_knight':
        base.hp = 130; base.maxHp = 130;
        base.mp = 30;  base.maxMp = 30;
        base.sta = 120; base.maxSta = 120;
        base.atk = 13; base.def = 8;
        base.crit = 0.05; base.critDmg = 1.5;
        base.spd = 180; base.aspd = 0.6;
        base.elem = 0;
        _state.player.element = 'none';
        break;
      case 'shadow_hunter':
        base.hp = 80;  base.maxHp = 80;
        base.mp = 50;  base.maxMp = 50;
        base.sta = 100; base.maxSta = 100;
        base.atk = 11; base.def = 3;
        base.crit = 0.15; base.critDmg = 1.5;
        base.spd = 220; base.aspd = 0.5;
        base.elem = 0;
        _state.player.element = 'none';
        break;
      default:
        // 默认使用 voidwalker
        this._applyCharacterStats('voidwalker');
    }
  },

  /** 计算深渊碎片 */
  _calculateShards() {
    const kills = _state.combat.killCount;
    const layer = _state.dungeon.currentLayer;
    return Math.floor(kills * 0.5 * layer);
  },

  /** 跟踪 Boss 阶段切换并触发反馈 */
  _checkBossPhaseTransitions(enemies) {
    if (!enemies) return;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy || !enemy.isBoss || !enemy.stats) continue;

      const hpRatio = enemy.stats.hp / (enemy.stats.maxHp || 1);
      let currentPhase = 1;
      if (hpRatio <= 0.33) currentPhase = 3;
      else if (hpRatio <= 0.66) currentPhase = 2;

      const prevPhase = enemy._lastBossPhase || 1;
      if (currentPhase !== prevPhase) {
        enemy._lastBossPhase = currentPhase;

        // 阶段切换特效
        if (currentPhase === 2) {
          // Phase 2: 屏幕震动 + 黄色闪光 + 浮字
          Camera.shake(8, 0.4);
          FXManager.playEffect('element_reaction_void', enemy.x, enemy.y);
          UIManager.showFloatingText('⚡ PHASE 2', '#fbbf24', _width / 2, _height / 2 - 80, 2.0, 1.8);
          if (window.AudioManager) window.AudioManager.play('boss_roar');

          // 0.15秒全屏慢动作
          _state.frame.timeScale = 0.3;
          setTimeout(() => { _state.frame.timeScale = 1.0; }, 400);
        } else if (currentPhase === 3) {
          // Phase 3: 强烈震动 + 红色闪光 + 浮字 + Boss 属性增强
          Camera.shake(12, 0.6);
          FXManager.playEffect('element_reaction_fire', enemy.x, enemy.y);
          UIManager.showFloatingText('🔥 ENRAGE!', '#ef4444', _width / 2, _height / 2 - 80, 2.5, 2.2);
          if (window.AudioManager) window.AudioManager.play('boss_roar');

          // 狂暴增强
          enemy.stats.atk = Math.floor(enemy.stats.atk * 1.3);
          enemy.stats.spd = Math.floor((enemy.stats.spd || 100) * 1.2);

          // 0.3秒全屏慢动作
          _state.frame.timeScale = 0.2;
          setTimeout(() => { _state.frame.timeScale = 1.0; }, 600);
        }

        EventBus.emit('boss:phaseChange', {
          bossId: enemy.enemyId,
          phase: currentPhase,
          hpRatio
        });
      } else if (!enemy._lastBossPhase) {
        enemy._lastBossPhase = 1;
      }
    }
  },

  /** 停止引擎 */
  stop() {
    _running = false;
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  },

  /** 获取逻辑分辨率 */
  get width() { return _width; },
  get height() { return _height; }
};

