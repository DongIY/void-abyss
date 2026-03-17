/**
 * ═══════════════════════════════════════════════════════════════
 *  📖 Void Abyss — Tutorial System
 *  渐进式新手教学：第一局分步引导
 *  Step 1: 移动 (WASD) → Step 2: 攻击 (J) → Step 3: 技能 (K) →
 *  Step 4: 闪避 (Space) → Step 5: 格挡 (Shift)
 *  完成后不再显示（存入 SaveManager）
 * ═══════════════════════════════════════════════════════════════
 */

import { EventBus } from './event-bus.js';

// ─── 教学步骤定义 ───
const TUTORIAL_STEPS = [
  {
    id: 'move',
    title: '移动',
    instruction: '按 WASD 或方向键移动角色',
    keys: ['W', 'A', 'S', 'D'],
    trigger: 'movement_detected',
    requirement: 3,   // 移动 3 次方向变化
    icon: '🏃'
  },
  {
    id: 'attack',
    title: '攻击',
    instruction: '按 J 或鼠标左键攻击敌人',
    keys: ['J', '🖱️左键'],
    trigger: 'player:attack',
    requirement: 2,   // 攻击 2 次
    icon: '⚔️'
  },
  {
    id: 'skill',
    title: '技能',
    instruction: '按 K 释放元素技能',
    keys: ['K'],
    trigger: 'player:skill',
    requirement: 1,
    icon: '✨'
  },
  {
    id: 'dodge',
    title: '闪避',
    instruction: '按 Space 闪避翻滚（0.3秒无敌！）',
    keys: ['Space'],
    trigger: 'player:dodge',
    requirement: 1,
    icon: '💨'
  },
  {
    id: 'block',
    title: '格挡',
    instruction: '按住 Shift 格挡（刚按下时完美格挡！）',
    keys: ['Shift'],
    trigger: 'player:block',
    requirement: 1,
    icon: '🛡️'
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

export const TutorialSystem = {
  /**
   * 初始化教学系统
   * @param {boolean} isFirstRun - 是否首次游戏
   */
  init(isFirstRun) {
    if (!isFirstRun) {
      _active = false;
      _completed = true;
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

    this._subscribeEvents();
  },

  /**
   * 跳过教学
   */
  skip() {
    _active = false;
    _completed = true;
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
    if (!_active || _completed) return;

    const step = TUTORIAL_STEPS[_currentStep];
    if (!step) return;

    const W = 960, H = 640;

    ctx.save();

    // 半透明底色条
    const barH = 80;
    const barY = H - barH - 60;
    const slideOffset = (1 - _slideIn) * 100;

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
    _roundRect(ctx, 80 + slideOffset, barY, W - 160, barH, 12);
    ctx.fill();

    // 边框
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 1.5;
    _roundRect(ctx, 80 + slideOffset, barY, W - 160, barH, 12);
    ctx.stroke();

    ctx.globalAlpha = 1;

    // 步骤指示器（1/5 2/5 ...）
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(`教学 ${_currentStep + 1}/${TUTORIAL_STEPS.length}`, 96 + slideOffset, barY + 18);

    // 跳过按钮
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('[ESC 跳过教学]', W - 96 + slideOffset, barY + 18);

    // 图标
    ctx.font = '28px serif';
    ctx.textAlign = 'left';
    ctx.fillText(step.icon, 100 + slideOffset, barY + 55);

    // 标题
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#a855f7';
    ctx.fillText(step.title, 140 + slideOffset, barY + 42);

    // 指令
    ctx.font = '13px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(step.instruction, 140 + slideOffset, barY + 62);

    // 按键高亮
    const keysText = step.keys.join('  ');
    const keysX = W - 260 + slideOffset;
    ctx.textAlign = 'center';

    // 按键闪烁效果
    const pulse = 0.7 + Math.sin(_pulseTimer * 3) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(keysText, keysX, barY + 52);
    ctx.globalAlpha = 1;

    // 进度条
    const progressW = W - 200;
    const progressH = 3;
    const progressY = barY + barH - 6;
    const progressRatio = _progress / (step.requirement || 1);

    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(100 + slideOffset, progressY, progressW, progressH);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(100 + slideOffset, progressY, progressW * Math.min(1, progressRatio), progressH);

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
                     i === _currentStep ? '#a855f7' : '#374151';
      ctx.beginPath();
      ctx.arc(dotStartX + i * dotSpacing + 4, dotY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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

      if (_currentStep >= TUTORIAL_STEPS.length) {
        // 全部完成
        _completed = true;
        _active = false;
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
    // 移动检测
    let _lastMoveDir = null;
    EventBus.on('player:move', () => {
      if (_active && _currentStep === 0) {
        this._advanceProgress();
      }
    });

    // 攻击
    EventBus.on('player:attack', () => {
      if (_active && _currentStep === 1) {
        this._advanceProgress();
      }
    });

    // 技能
    EventBus.on('player:skill', () => {
      if (_active && _currentStep === 2) {
        this._advanceProgress();
      }
    });

    // 闪避
    EventBus.on('player:dodge', () => {
      if (_active && _currentStep === 3) {
        this._advanceProgress();
      }
    });

    // 格挡
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
