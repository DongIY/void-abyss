/**
 * ═══════════════════════════════════════════════════════════════
 *  📖 Void Abyss — Tutorial System v2
 *  核心改变：先告诉目标，再教操作
 *  Step 0: 欢迎 + 目标说明（无需操作）
 *  Step 1: 移动探索（安全区）
 *  Step 2: 攻击消灭敌人
 *  Step 3: 技能释放
 *  Step 4: 闪避/格挡防御
 *  Step 5: 找到出口前进
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';

// ─── 教学步骤定义（v2: 目标导向） ───
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: '🎯 你的目标',
    instruction: '消灭所有敌人 → 找到出口 → 击败Boss通关！',
    subtext: '按任意键继续...',
    keys: [],
    trigger: 'any_key',
    requirement: 1,
    icon: '🎯',
    isInfo: true  // 纯信息展示，无需特定操作
  },
  {
    id: 'move',
    title: '移动探索',
    instruction: '用 WASD 或方向键移动，探索房间',
    subtext: '',
    keys: ['W', 'A', 'S', 'D'],
    trigger: 'movement_detected',
    requirement: 3,
    icon: '🏃'
  },
  {
    id: 'attack',
    title: '消灭敌人',
    instruction: '按 J 或鼠标左键攻击！消灭所有敌人才能前进',
    subtext: '💡 敌人在下一个房间等你',
    keys: ['J', '🖱️左键'],
    trigger: 'player:attack',
    requirement: 2,
    icon: '⚔️'
  },
  {
    id: 'skill',
    title: '释放技能',
    instruction: '按 K 释放元素技能，造成大量伤害',
    subtext: '',
    keys: ['K'],
    trigger: 'player:skill',
    requirement: 1,
    icon: '✨'
  },
  {
    id: 'dodge',
    title: '闪避防御',
    instruction: '按 Space 闪避翻滚（0.3秒无敌！）',
    subtext: '💡 也可以按 Shift 格挡',
    keys: ['Space'],
    trigger: 'player:dodge',
    requirement: 1,
    icon: '💨'
  },
  {
    id: 'door',
    title: '找到出口',
    instruction: '消灭所有敌人后，靠近门按 E 进入下一房间',
    subtext: '💡 最后一个房间是Boss！击败它通关',
    keys: ['E'],
    trigger: 'dungeon:roomCleared',
    requirement: 1,
    icon: '🚪'
  }
];

// ─── 内部状态 ───
let _active = false;
let _currentStep = 0;
let _progress = 0;
let _completed = false;
let _visible = true;
let _fadeTimer = 0;
let _stepCompleteTimer = 0;
let _pulseTimer = 0;

// 动画状态
let _slideIn = 0;
let _successFlash = 0;

// 目标提示系统（持续显示在屏幕顶部的任务目标）
let _objectiveText = '';
let _objectiveAlpha = 0;
let _objectiveFlash = 0;

export const TutorialSystem = {
  /**
   * 初始化教学系统
   * @param {boolean} isFirstRun - 是否首次游戏
   */
  init(isFirstRun) {
    if (!isFirstRun) {
      _active = false;
      _completed = true;
      // 即使不是首次，也显示关卡目标
      _objectiveText = '🎯 消灭所有敌人 → 找到出口';
      _objectiveAlpha = 0.8;
      return;
    }

    _active = true;
    _currentStep = 0;
    _progress = 0;
    _completed = false;
    _visible = true;
    _fadeTimer = 0;
    _stepCompleteTimer = 0;
    _slideIn = 0;
    _successFlash = 0;
    _objectiveText = '';
    _objectiveAlpha = 0;
    _objectiveFlash = 0;

    this._subscribeEvents();
  },

  /**
   * 跳过教学
   */
  skip() {
    _active = false;
    _completed = true;
    _objectiveText = '🎯 消灭所有敌人 → 找到出口';
    _objectiveAlpha = 0.8;
    EventBus.emit('tutorial:complete', {});
  },

  /**
   * 是否正在教学中
   * @returns {boolean}
   */
  isActive() {
    return _active && !_completed;
  },

  /**
   * 每帧更新
   * @param {number} dt
   */
  update(dt) {
    // 始终更新目标提示
    if (_objectiveAlpha > 0 && _objectiveFlash > 0) {
      _objectiveFlash -= dt;
    }

    if (!_active || _completed) return;

    _pulseTimer += dt;
    _slideIn = Math.min(1, _slideIn + dt * 3);

    // 步骤完成动画
    if (_stepCompleteTimer > 0) {
      _stepCompleteTimer -= dt;
      _successFlash = Math.max(0, _stepCompleteTimer / 0.5);
    }
  },

  /**
   * 在 HUD 层绘制教学提示
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const W = 960, H = 640;

    // ── 始终绘制顶部目标提示 ──
    if (_objectiveText && _objectiveAlpha > 0) {
      ctx.save();
      const objAlpha = _objectiveFlash > 0 ?
        Math.min(1, _objectiveAlpha + Math.sin(_objectiveFlash * 8) * 0.3) :
        _objectiveAlpha;
      ctx.globalAlpha = objAlpha;

      // 顶部半透明条
      ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
      _roundRect(ctx, W / 2 - 250, 8, 500, 32, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 1;
      _roundRect(ctx, W / 2 - 250, 8, 500, 32, 8);
      ctx.stroke();

      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(_objectiveText, W / 2, 29);
      ctx.restore();
    }

    // ── 教学步骤面板 ──
    if (!_active || _completed) return;

    const step = TUTORIAL_STEPS[_currentStep];
    if (!step) return;

    ctx.save();

    const barH = step.subtext ? 95 : 80;
    const barY = H - barH - 60;
    const slideOffset = (1 - _slideIn) * 100;

    // 半透明底色条
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(10, 10, 26, 0.92)';
    _roundRect(ctx, 80 + slideOffset, barY, W - 160, barH, 12);
    ctx.fill();

    // 边框（步骤 0 用金色）
    ctx.strokeStyle = step.isInfo ? 'rgba(251, 191, 36, 0.6)' : 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = step.isInfo ? 2 : 1.5;
    _roundRect(ctx, 80 + slideOffset, barY, W - 160, barH, 12);
    ctx.stroke();

    ctx.globalAlpha = 1;

    // 步骤指示器
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    if (!step.isInfo) {
      ctx.fillText(`教学 ${_currentStep}/${TUTORIAL_STEPS.length - 1}`, 96 + slideOffset, barY + 18);
    }

    // 跳过按钮
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('[ESC 跳过教学]', W - 96 + slideOffset, barY + 18);

    // 图标
    ctx.font = '28px serif';
    ctx.textAlign = 'left';
    ctx.fillText(step.icon, 100 + slideOffset, barY + 52);

    // 标题
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = step.isInfo ? '#fbbf24' : '#a855f7';
    ctx.fillText(step.title, 140 + slideOffset, barY + 40);

    // 主指令
    ctx.font = '13px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(step.instruction, 140 + slideOffset, barY + 60);

    // 子提示
    if (step.subtext) {
      ctx.font = '11px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(step.subtext, 140 + slideOffset, barY + 78);
    }

    // 按键高亮（仅非信息步骤）
    if (step.keys.length > 0) {
      const keysText = step.keys.join('  ');
      const keysX = W - 260 + slideOffset;
      ctx.textAlign = 'center';

      const pulse = 0.7 + Math.sin(_pulseTimer * 3) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(keysText, keysX, barY + 52);
      ctx.globalAlpha = 1;
    } else if (step.isInfo) {
      // 信息步骤：闪烁提示按任意键
      const pulse = 0.4 + Math.sin(_pulseTimer * 2) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.textAlign = 'center';
      ctx.font = '14px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('按任意键继续', W / 2 + slideOffset, barY + barH - 10);
      ctx.globalAlpha = 1;
    }

    // 进度条（非信息步骤）
    if (!step.isInfo) {
      const progressW = W - 200;
      const progressH = 3;
      const progressY = barY + barH - 6;
      const progressRatio = _progress / (step.requirement || 1);

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(100 + slideOffset, progressY, progressW, progressH);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(100 + slideOffset, progressY, progressW * Math.min(1, progressRatio), progressH);
    }

    // 步骤完成闪光
    if (_successFlash > 0) {
      ctx.fillStyle = `rgba(74, 222, 128, ${_successFlash * 0.3})`;
      _roundRect(ctx, 80 + slideOffset, barY, W - 160, barH, 12);
      ctx.fill();
    }

    // 步骤圆点指示（底部）
    const dotY = barY + barH + 12;
    const dotSpacing = 16;
    const dotsWidth = TUTORIAL_STEPS.length * dotSpacing;
    const dotStartX = (W - dotsWidth) / 2;

    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      ctx.fillStyle = i < _currentStep ? '#4ade80' :
                     i === _currentStep ? (TUTORIAL_STEPS[i].isInfo ? '#fbbf24' : '#a855f7') : '#374151';
      ctx.beginPath();
      ctx.arc(dotStartX + i * dotSpacing + 4, dotY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  /**
   * 更新目标提示（供外部调用）
   * @param {string} text
   */
  setObjective(text) {
    _objectiveText = text;
    _objectiveAlpha = 0.8;
    _objectiveFlash = 2.0; // 2秒闪烁
  },

  // ─── 内部方法 ───

  /** 推进步骤 */
  _advanceProgress() {
    if (!_active || _completed) return;

    _progress++;
    const step = TUTORIAL_STEPS[_currentStep];

    if (_progress >= step.requirement) {
      // 当前步骤完成
      _stepCompleteTimer = 0.5;
      _progress = 0;
      _currentStep++;
      _slideIn = 0; // 重新滑入动画

      // 更新目标提示
      if (_currentStep === 2) {
        _objectiveText = '🎯 前进到下一个房间，消灭敌人！';
        _objectiveAlpha = 0.8;
        _objectiveFlash = 2.0;
      } else if (_currentStep === 5) {
        _objectiveText = '🎯 消灭所有敌人 → 找到出口';
        _objectiveAlpha = 0.8;
        _objectiveFlash = 2.0;
      }

      if (_currentStep >= TUTORIAL_STEPS.length) {
        // 全部完成
        _completed = true;
        _active = false;
        _objectiveText = '🎯 消灭所有敌人 → 找到出口 → 击败Boss';
        _objectiveAlpha = 0.8;
        _objectiveFlash = 3.0;
        EventBus.emit('tutorial:complete', {});
      } else {
        EventBus.emit('tutorial:stepComplete', {
          completedStep: step.id,
          nextStep: TUTORIAL_STEPS[_currentStep].id
        });
      }
    }
  },

  /** 订阅事件 */
  _subscribeEvents() {
    // Step 0: 任意键继续
    const anyKeyHandler = (e) => {
      if (_active && _currentStep === 0 && !e.repeat) {
        this._advanceProgress();
        // 不移除监听器，保持兼容
      }
    };
    window.addEventListener('keydown', anyKeyHandler);
    // 鼠标也算
    const anyClickHandler = () => {
      if (_active && _currentStep === 0) {
        this._advanceProgress();
      }
    };
    window.addEventListener('mousedown', anyClickHandler);

    // Step 1: 移动检测
    EventBus.on('player:move', () => {
      if (_active && _currentStep === 1) {
        this._advanceProgress();
      }
    });

    // Step 2: 攻击
    EventBus.on('player:attack', () => {
      if (_active && _currentStep === 2) {
        this._advanceProgress();
      }
    });

    // Step 3: 技能
    EventBus.on('player:skill', () => {
      if (_active && _currentStep === 3) {
        this._advanceProgress();
      }
    });

    // Step 4: 闪避
    EventBus.on('player:dodge', () => {
      if (_active && _currentStep === 4) {
        this._advanceProgress();
      }
    });

    // Step 4: 格挡也算
    EventBus.on('combat:block', () => {
      if (_active && _currentStep === 4) {
        this._advanceProgress();
      }
    });

    EventBus.on('combat:perfectParry', () => {
      if (_active && _currentStep === 4) {
        this._advanceProgress();
      }
    });

    // Step 5: 房间清除
    EventBus.on('dungeon:roomCleared', () => {
      if (_active && _currentStep === 5) {
        this._advanceProgress();
      }
    });
  }
};

// ─── 绘制辅助 ───

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
