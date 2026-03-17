/**
 * ═══════════════════════════════════════════════════════════════
 *  🎨 Void Abyss — Procedural Sprite System
 *  程序化像素风角色精灵绘制（零外部资源）
 *  - 3 名玩家角色（虚空行者 / 深渊骑士 / 暗影猎手）
 *  - 14 种敌人 + 5 Boss 各有独立外观
 *  - 支持动画帧（idle 呼吸 / walk 摆动 / attack 挥击 / hurt 闪烁）
 *  - 缓存到离屏 canvas 避免每帧重绘
 * ═══════════════════════════════════════════════════════════════
 */

// ─── 离屏缓存 ───
const _spriteCache = new Map();

// ─── 颜色常量 ───
const C = {
  // 虚空行者 (法师 — 紫色系)
  voidwalker: {
    robe: '#7c3aed', robeDark: '#5b21b6', robeLight: '#a78bfa',
    skin: '#e2d5c0', hood: '#4c1d95', glow: '#c084fc',
    staff: '#a78bfa', staffGem: '#e9d5ff', eye: '#c084fc'
  },
  // 深渊骑士 (战士 — 深蓝钢铁)
  abyssal_knight: {
    armor: '#334155', armorDark: '#1e293b', armorLight: '#64748b',
    helmet: '#475569', visor: '#38bdf8', cape: '#1e1b4b',
    weapon: '#94a3b8', weaponEdge: '#e2e8f0', eye: '#38bdf8'
  },
  // 暗影猎手 (刺客 — 暗绿)
  shadow_hunter: {
    cloak: '#1a2e1a', cloakDark: '#0f1f0f', cloakLight: '#2d5a2d',
    skin: '#d4c5a9', mask: '#1f2937', eye: '#4ade80',
    blade: '#94a3b8', bladeEdge: '#e2e8f0', scarf: '#22c55e'
  },
  // 敌人色系
  enemy: {
    void_wisp: { body: '#7c3aed', core: '#e9d5ff', eye: '#ffffff' },
    rift_bat: { body: '#581c87', wing: '#7c3aed', eye: '#ef4444' },
    abyss_spider: { body: '#1e1b4b', legs: '#3b0764', eye: '#ef4444', fang: '#e2e8f0' },
    shadow_sentinel: { armor: '#374151', body: '#1f2937', eye: '#ef4444', weapon: '#6b7280' },
    crystal_golem: { body: '#164e63', crystal: '#38bdf8', core: '#7dd3fc', eye: '#e0f2fe' },
    void_mage: { robe: '#4c1d95', body: '#3b0764', eye: '#a855f7', staff: '#c084fc' },
    flame_wraith: { body: '#991b1b', flame: '#ef4444', core: '#fbbf24', eye: '#fde68a' },
    ice_construct: { body: '#155e75', ice: '#38bdf8', core: '#e0f2fe', eye: '#7dd3fc' },
    thunder_elemental: { body: '#854d0e', bolt: '#facc15', core: '#fef3c7', eye: '#fde68a' },
    chrono_shifter: { body: '#4c1d95', clock: '#a855f7', eye: '#c084fc', gear: '#d8b4fe' },
    abyss_knight: { armor: '#1e1b4b', body: '#0f0a2a', eye: '#ef4444', weapon: '#4b5563' },
    void_horror: { body: '#2e1065', tentacle: '#7c3aed', eye: '#a855f7', mouth: '#ef4444' },
    reality_breaker: { body: '#1a1a3a', crack: '#facc15', eye: '#fde68a', aura: '#a855f7' },
    doom_herald: { body: '#7f1d1d', flame: '#ef4444', eye: '#fbbf24', horn: '#991b1b' }
  },
  // Boss 色系
  boss: {
    boss_euler: { armor: '#334155', cape: '#1e1b4b', eye: '#38bdf8', gem: '#60a5fa', weapon: '#94a3b8' },
    boss_prism: { body: '#0c4a6e', crystal: '#38bdf8', core: '#bae6fd', eye: '#e0f2fe', aura: '#7dd3fc' },
    boss_nyx: { body: '#2e1065', cloak: '#4c1d95', eye: '#a855f7', blade: '#c084fc', aura: '#7c3aed' },
    boss_chronos: { body: '#422006', gear: '#facc15', eye: '#fef3c7', clock: '#fbbf24', aura: '#fde68a' },
    boss_ophelia: { body: '#0f0526', void: '#7c3aed', eye: '#c084fc', heart: '#a855f7', aura: '#e9d5ff' }
  }
};

// ─── 缓存键生成 ───
function cacheKey(type, id, state, frame, w, h) {
  return `${type}_${id}_${state}_${frame}_${w}x${h}`;
}

// ─── 获取/创建离屏 canvas ───
function getOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ─── 像素绘制辅助 ───
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ═══════════════════════════════════════
//  玩家角色精灵绘制
// ═══════════════════════════════════════

function drawVoidwalker(ctx, w, h, state, frame) {
  const c = C.voidwalker;
  const cx = w / 2, cy = h / 2;
  const u = Math.max(1, Math.floor(w / 12)); // 单位像素

  // 呼吸动画偏移
  const breathe = state === 'idle' ? Math.sin(frame * 0.15) * u * 0.5 : 0;
  const walkBob = state === 'moving' ? Math.sin(frame * 0.4) * u : 0;
  const hurtFlash = state === 'hurt' ? (frame % 4 < 2) : false;

  if (hurtFlash) {
    ctx.globalAlpha = 0.5;
  }

  // 脚（2个小方块）
  const footY = cy + 4 * u + walkBob * 0.3;
  px(ctx, cx - 2.5 * u, footY, 2 * u, u, c.robeDark);
  px(ctx, cx + 0.5 * u, footY, 2 * u, u, c.robeDark);

  // 长袍身体
  px(ctx, cx - 3 * u, cy + breathe, 6 * u, 4 * u, c.robe);
  // 袍边高光
  px(ctx, cx - 3 * u, cy + breathe, u, 4 * u, c.robeLight);
  px(ctx, cx + 2 * u, cy + breathe, u, 4 * u, c.robeDark);

  // 腰带
  px(ctx, cx - 3 * u, cy + u + breathe, 6 * u, u * 0.6, '#fbbf24');

  // 头部（圆形兜帽）
  px(ctx, cx - 2.5 * u, cy - 3 * u + breathe, 5 * u, 3.5 * u, c.hood);
  // 面部
  px(ctx, cx - 1.5 * u, cy - 2 * u + breathe, 3 * u, 2 * u, c.skin);
  // 眼睛 (发光)
  px(ctx, cx - u, cy - 1.5 * u + breathe, u * 0.8, u * 0.8, c.eye);
  px(ctx, cx + 0.3 * u, cy - 1.5 * u + breathe, u * 0.8, u * 0.8, c.eye);

  // 法杖（右手）
  const staffX = cx + 3.5 * u;
  const staffAngle = state === 'attacking' ? -0.5 + Math.sin(frame * 0.8) * 0.3 : 0;
  ctx.save();
  ctx.translate(staffX, cy + breathe);
  ctx.rotate(staffAngle);
  px(ctx, -u * 0.4, -4 * u, u * 0.8, 7 * u, c.staff);
  // 法杖宝石
  ctx.fillStyle = c.staffGem;
  ctx.beginPath();
  ctx.arc(0, -4.5 * u, u, 0, Math.PI * 2);
  ctx.fill();
  // 宝石发光
  ctx.fillStyle = c.glow;
  ctx.globalAlpha = 0.4 + Math.sin(frame * 0.2) * 0.3;
  ctx.beginPath();
  ctx.arc(0, -4.5 * u, u * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // 左臂
  px(ctx, cx - 4 * u, cy - u + breathe, u * 1.5, 3 * u, c.robe);
  // 手
  px(ctx, cx - 4 * u, cy + 2 * u + breathe, u * 1.2, u, c.skin);

  ctx.globalAlpha = 1;
}

function drawAbyssalKnight(ctx, w, h, state, frame) {
  const c = C.abyssal_knight;
  const cx = w / 2, cy = h / 2;
  const u = Math.max(1, Math.floor(w / 14));

  const breathe = state === 'idle' ? Math.sin(frame * 0.12) * u * 0.3 : 0;
  const walkBob = state === 'moving' ? Math.sin(frame * 0.35) * u * 0.8 : 0;
  const hurtFlash = state === 'hurt' ? (frame % 4 < 2) : false;

  if (hurtFlash) ctx.globalAlpha = 0.5;

  // 披风
  px(ctx, cx - 3.5 * u, cy - 2 * u + breathe, 7 * u, 7 * u, c.cape);

  // 护腿
  const legY = cy + 3 * u + walkBob * 0.3;
  px(ctx, cx - 2.5 * u, legY, 2 * u, 3 * u, c.armorDark);
  px(ctx, cx + 0.5 * u, legY, 2 * u, 3 * u, c.armorDark);
  // 靴子
  px(ctx, cx - 3 * u, legY + 2.5 * u, 2.5 * u, u, c.armor);
  px(ctx, cx + 0.5 * u, legY + 2.5 * u, 2.5 * u, u, c.armor);

  // 铠甲身体
  px(ctx, cx - 3 * u, cy - u + breathe, 6 * u, 4.5 * u, c.armor);
  // 胸甲高光
  px(ctx, cx - 2 * u, cy + breathe, 4 * u, u * 0.5, c.armorLight);
  // 肩甲
  px(ctx, cx - 4.5 * u, cy - 1.5 * u + breathe, 2.5 * u, 2 * u, c.armorLight);
  px(ctx, cx + 2 * u, cy - 1.5 * u + breathe, 2.5 * u, 2 * u, c.armorLight);

  // 头盔
  px(ctx, cx - 2.5 * u, cy - 4.5 * u + breathe, 5 * u, 3.5 * u, c.helmet);
  // T形面罩开口
  px(ctx, cx - 1.5 * u, cy - 3 * u + breathe, 3 * u, u * 0.6, c.armorDark);
  px(ctx, cx - 0.3 * u, cy - 3 * u + breathe, 0.6 * u, 2 * u, c.armorDark);
  // 眼睛（面罩内发光）
  px(ctx, cx - u, cy - 3 * u + breathe, u * 0.7, u * 0.5, c.visor);
  px(ctx, cx + 0.3 * u, cy - 3 * u + breathe, u * 0.7, u * 0.5, c.visor);

  // 大剑（右手）
  const swordAngle = state === 'attacking' ? -1.0 + Math.sin(frame * 1.0) * 0.8 : -0.2;
  ctx.save();
  ctx.translate(cx + 4 * u, cy - u + breathe);
  ctx.rotate(swordAngle);
  // 剑柄
  px(ctx, -u * 0.5, -u, u, 2.5 * u, '#78716c');
  // 护手
  px(ctx, -u * 1.5, -u, 3 * u, u * 0.6, c.armorLight);
  // 剑刃
  px(ctx, -u * 0.6, -7 * u, u * 1.2, 6 * u, c.weaponEdge);
  px(ctx, -u * 0.3, -7 * u, u * 0.6, 6 * u, '#ffffff');
  ctx.restore();

  // 盾牌（左手）
  if (state === 'blocking') {
    px(ctx, cx - 6 * u, cy - 2 * u + breathe, 3 * u, 5 * u, c.armorLight);
    px(ctx, cx - 5.5 * u, cy - 1 * u + breathe, 2 * u, 3 * u, c.visor);
  }

  ctx.globalAlpha = 1;
}

function drawShadowHunter(ctx, w, h, state, frame) {
  const c = C.shadow_hunter;
  const cx = w / 2, cy = h / 2;
  const u = Math.max(1, Math.floor(w / 11));

  const breathe = state === 'idle' ? Math.sin(frame * 0.18) * u * 0.4 : 0;
  const walkBob = state === 'moving' ? Math.sin(frame * 0.5) * u : 0;
  const hurtFlash = state === 'hurt' ? (frame % 4 < 2) : false;

  if (hurtFlash) ctx.globalAlpha = 0.5;

  // 围巾飘动
  const scarfWave = Math.sin(frame * 0.3) * u;
  px(ctx, cx + 2 * u, cy - 3 * u + breathe + scarfWave * 0.5, u * 1.5, 4 * u, c.scarf);
  px(ctx, cx + 3 * u, cy - 2 * u + breathe + scarfWave, u, 3 * u, c.scarf);

  // 腿部
  const legY = cy + 2 * u + walkBob * 0.3;
  px(ctx, cx - 2 * u, legY, 1.5 * u, 3 * u, c.cloakDark);
  px(ctx, cx + 0.5 * u, legY, 1.5 * u, 3 * u, c.cloakDark);

  // 身体（修长）
  px(ctx, cx - 2.5 * u, cy - u + breathe, 5 * u, 3.5 * u, c.cloak);
  px(ctx, cx - 2 * u, cy + breathe, 4 * u, u * 0.4, c.cloakLight);

  // 头部（面具）
  px(ctx, cx - 2 * u, cy - 3.5 * u + breathe, 4 * u, 3 * u, c.mask);
  // 眼睛（绿色发光，只露一条缝）
  px(ctx, cx - 1.5 * u, cy - 2.2 * u + breathe, 3 * u, u * 0.5, c.eye);

  // 双匕首
  const daggerAngle = state === 'attacking' ? Math.sin(frame * 1.2) * 0.5 : 0.1;
  // 右匕首
  ctx.save();
  ctx.translate(cx + 3 * u, cy + breathe);
  ctx.rotate(daggerAngle);
  px(ctx, 0, -3 * u, u * 0.5, 3 * u, c.bladeEdge);
  px(ctx, -u * 0.3, 0, u, u * 0.4, '#78716c');
  ctx.restore();
  // 左匕首
  ctx.save();
  ctx.translate(cx - 3 * u, cy + breathe);
  ctx.rotate(-daggerAngle);
  px(ctx, -u * 0.5, -3 * u, u * 0.5, 3 * u, c.bladeEdge);
  px(ctx, -u * 0.7, 0, u, u * 0.4, '#78716c');
  ctx.restore();

  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════
//  敌人精灵绘制
// ═══════════════════════════════════════

const ENEMY_DRAW = {
  void_wisp(ctx, w, h, state, frame) {
    const c = C.enemy.void_wisp;
    const cx = w / 2, cy = h / 2;
    const bob = Math.sin(frame * 0.25) * 2;
    // 发光核心
    ctx.fillStyle = c.core;
    ctx.globalAlpha = 0.3 + Math.sin(frame * 0.2) * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, w * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 身体
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = c.eye;
    ctx.fillRect(cx - w * 0.12, cy - w * 0.05 + bob, w * 0.08, w * 0.08);
    ctx.fillRect(cx + w * 0.05, cy - w * 0.05 + bob, w * 0.08, w * 0.08);
  },

  rift_bat(ctx, w, h, state, frame) {
    const c = C.enemy.rift_bat;
    const cx = w / 2, cy = h / 2;
    const flapAmt = Math.sin(frame * 0.5) * w * 0.15;
    // 翅膀
    ctx.fillStyle = c.wing;
    // 左翼
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - w * 0.45, cy - flapAmt);
    ctx.lineTo(cx - w * 0.3, cy + h * 0.1);
    ctx.closePath();
    ctx.fill();
    // 右翼
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + w * 0.45, cy - flapAmt);
    ctx.lineTo(cx + w * 0.3, cy + h * 0.1);
    ctx.closePath();
    ctx.fill();
    // 身体
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = c.eye;
    ctx.fillRect(cx - w * 0.08, cy - w * 0.05, w * 0.06, w * 0.06);
    ctx.fillRect(cx + w * 0.02, cy - w * 0.05, w * 0.06, w * 0.06);
  },

  abyss_spider(ctx, w, h, state, frame) {
    const c = C.enemy.abyss_spider;
    const cx = w / 2, cy = h / 2;
    const legWave = Math.sin(frame * 0.4) * 2;
    // 8条腿
    ctx.strokeStyle = c.legs;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 0.6 + 0.3;
      const legLen = w * 0.4;
      const midX = cx - Math.cos(angle) * legLen * 0.5;
      const midY = cy + Math.sin(angle) * legLen * 0.3 + legWave * (i % 2 ? 1 : -1);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.15, cy);
      ctx.lineTo(midX, midY - legLen * 0.2);
      ctx.lineTo(midX - legLen * 0.15, midY + legLen * 0.1);
      ctx.stroke();
      // 右侧镜像
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.15, cy);
      ctx.lineTo(w - midX, midY - legLen * 0.2);
      ctx.lineTo(w - midX + legLen * 0.15, midY + legLen * 0.1);
      ctx.stroke();
    }
    // 身体
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // 头
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.1, w * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛（多眼）
    ctx.fillStyle = c.eye;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - w * 0.1 + i * w * 0.06, cy - h * 0.15, 3, 3);
    }
    // 獠牙
    ctx.fillStyle = c.fang;
    ctx.fillRect(cx - w * 0.06, cy - h * 0.04, 2, 4);
    ctx.fillRect(cx + w * 0.04, cy - h * 0.04, 2, 4);
  },

  shadow_sentinel(ctx, w, h, state, frame) {
    const c = C.enemy.shadow_sentinel;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 13);
    // 身体
    px(ctx, cx - 2.5 * u, cy - u, 5 * u, 4 * u, c.armor);
    // 头盔
    px(ctx, cx - 2 * u, cy - 3.5 * u, 4 * u, 3 * u, c.armor);
    px(ctx, cx - 1.5 * u, cy - 2.5 * u, 3 * u, u, c.body);
    // 红眼
    px(ctx, cx - u, cy - 2.2 * u, u * 0.7, u * 0.5, c.eye);
    px(ctx, cx + 0.3 * u, cy - 2.2 * u, u * 0.7, u * 0.5, c.eye);
    // 腿
    px(ctx, cx - 2 * u, cy + 3 * u, 1.5 * u, 2 * u, c.body);
    px(ctx, cx + 0.5 * u, cy + 3 * u, 1.5 * u, 2 * u, c.body);
    // 长矛
    px(ctx, cx + 3 * u, cy - 4 * u, u * 0.5, 8 * u, c.weapon);
    px(ctx, cx + 2.5 * u, cy - 4.5 * u, u * 1.5, u, '#ef4444');
  },

  crystal_golem(ctx, w, h, state, frame) {
    const c = C.enemy.crystal_golem;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 16);
    const pulse = Math.sin(frame * 0.15) * 0.15;
    // 大块身体
    px(ctx, cx - 4 * u, cy - 2 * u, 8 * u, 6 * u, c.body);
    // 水晶突起
    ctx.fillStyle = c.crystal;
    ctx.globalAlpha = 0.7 + pulse;
    ctx.beginPath();
    ctx.moveTo(cx - 2 * u, cy - 2 * u);
    ctx.lineTo(cx - u, cy - 5 * u);
    ctx.lineTo(cx, cy - 2 * u);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + u, cy - 2 * u);
    ctx.lineTo(cx + 2 * u, cy - 4.5 * u);
    ctx.lineTo(cx + 3 * u, cy - 2 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 核心发光
    ctx.fillStyle = c.core;
    ctx.globalAlpha = 0.5 + pulse;
    ctx.beginPath();
    ctx.arc(cx, cy, u * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 眼睛
    px(ctx, cx - 1.5 * u, cy - u, u, u * 0.8, c.eye);
    px(ctx, cx + 0.5 * u, cy - u, u, u * 0.8, c.eye);
    // 手臂
    px(ctx, cx - 6 * u, cy - u, 2.5 * u, 4 * u, c.body);
    px(ctx, cx + 3.5 * u, cy - u, 2.5 * u, 4 * u, c.body);
    // 腿
    px(ctx, cx - 3 * u, cy + 4 * u, 2.5 * u, 2 * u, c.body);
    px(ctx, cx + 0.5 * u, cy + 4 * u, 2.5 * u, 2 * u, c.body);
  },

  void_mage(ctx, w, h, state, frame) {
    const c = C.enemy.void_mage;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 11);
    const float = Math.sin(frame * 0.2) * u;
    // 长袍
    px(ctx, cx - 2.5 * u, cy - u + float, 5 * u, 4 * u, c.robe);
    // 兜帽
    px(ctx, cx - 2 * u, cy - 3.5 * u + float, 4 * u, 3 * u, c.robe);
    // 脸（阴暗）
    px(ctx, cx - 1.5 * u, cy - 2.5 * u + float, 3 * u, 1.5 * u, c.body);
    // 发光眼
    px(ctx, cx - u, cy - 2 * u + float, u * 0.7, u * 0.5, c.eye);
    px(ctx, cx + 0.3 * u, cy - 2 * u + float, u * 0.7, u * 0.5, c.eye);
    // 法杖
    px(ctx, cx + 3 * u, cy - 3 * u + float, u * 0.5, 6 * u, c.staff);
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(cx + 3.2 * u, cy - 3.5 * u + float, u * 0.8, 0, Math.PI * 2);
    ctx.fill();
  },

  flame_wraith(ctx, w, h, state, frame) {
    const c = C.enemy.flame_wraith;
    const cx = w / 2, cy = h / 2;
    const flicker = Math.sin(frame * 0.4) * 2;
    // 火焰轮廓
    ctx.fillStyle = c.flame;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy + flicker, w * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 身体
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(cx, cy + flicker, w * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // 核心
    ctx.fillStyle = c.core;
    ctx.beginPath();
    ctx.arc(cx, cy + flicker, w * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 火焰尖端
    ctx.fillStyle = c.flame;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + frame * 0.1;
      const r = w * 0.3 + Math.sin(frame * 0.3 + i) * 3;
      const fx = cx + Math.cos(a) * r;
      const fy = cy + Math.sin(a) * r + flicker;
      ctx.beginPath();
      ctx.arc(fx, fy, w * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    // 眼睛
    px(ctx, cx - w * 0.1, cy - w * 0.06 + flicker, w * 0.07, w * 0.07, c.eye);
    px(ctx, cx + w * 0.03, cy - w * 0.06 + flicker, w * 0.07, w * 0.07, c.eye);
  },

  ice_construct(ctx, w, h, state, frame) {
    const c = C.enemy.ice_construct;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 14);
    const pulse = Math.sin(frame * 0.12) * 0.1;
    // 冰块身体
    ctx.fillStyle = c.body;
    ctx.globalAlpha = 0.85;
    px(ctx, cx - 3.5 * u, cy - 3 * u, 7 * u, 7 * u, c.body);
    ctx.globalAlpha = 1;
    // 冰晶高光
    ctx.fillStyle = c.ice;
    ctx.globalAlpha = 0.5 + pulse;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4 * u);
    ctx.lineTo(cx - 2 * u, cy - 2 * u);
    ctx.lineTo(cx + 2 * u, cy - 2 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 核心
    ctx.fillStyle = c.core;
    ctx.beginPath();
    ctx.arc(cx, cy, u * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    px(ctx, cx - 1.5 * u, cy - 1.5 * u, u, u * 0.7, c.eye);
    px(ctx, cx + 0.5 * u, cy - 1.5 * u, u, u * 0.7, c.eye);
    // 肩部冰刺
    ctx.fillStyle = c.ice;
    ctx.beginPath();
    ctx.moveTo(cx - 3.5 * u, cy - u);
    ctx.lineTo(cx - 5 * u, cy - 3 * u);
    ctx.lineTo(cx - 3 * u, cy - 2 * u);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 3.5 * u, cy - u);
    ctx.lineTo(cx + 5 * u, cy - 3 * u);
    ctx.lineTo(cx + 3 * u, cy - 2 * u);
    ctx.fill();
  },

  thunder_elemental(ctx, w, h, state, frame) {
    const c = C.enemy.thunder_elemental;
    const cx = w / 2, cy = h / 2;
    const jitter = (Math.random() - 0.5) * 2;
    // 身体（球形雷电）
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(cx + jitter, cy, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // 电弧
    ctx.strokeStyle = c.bolt;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7 + Math.sin(frame * 0.5) * 0.3;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + frame * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const steps = 4;
      for (let s = 1; s <= steps; s++) {
        const r = (s / steps) * w * 0.4;
        const jx = (Math.random() - 0.5) * 4;
        const jy = (Math.random() - 0.5) * 4;
        ctx.lineTo(cx + Math.cos(a) * r + jx, cy + Math.sin(a) * r + jy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 核心
    ctx.fillStyle = c.core;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    px(ctx, cx - w * 0.08, cy - w * 0.05, w * 0.06, w * 0.06, c.eye);
    px(ctx, cx + w * 0.02, cy - w * 0.05, w * 0.06, w * 0.06, c.eye);
  },

  chrono_shifter(ctx, w, h, state, frame) {
    const c = C.enemy.chrono_shifter;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 12);
    const phase = Math.sin(frame * 0.15) * 0.3;
    // 身体（半透明，相移效果）
    ctx.fillStyle = c.body;
    ctx.globalAlpha = 0.6 + phase;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // 残影
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(cx + u * 2 * Math.cos(frame * 0.1), cy, w * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 齿轮符号
    ctx.strokeStyle = c.gear;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    // 时钟指针
    const angle1 = frame * 0.1;
    const angle2 = frame * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle1) * w * 0.12, cy + Math.sin(angle1) * w * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle2) * w * 0.08, cy + Math.sin(angle2) * w * 0.08);
    ctx.stroke();
    // 眼睛
    px(ctx, cx - w * 0.08, cy - w * 0.06, w * 0.06, w * 0.05, c.eye);
    px(ctx, cx + w * 0.02, cy - w * 0.06, w * 0.06, w * 0.05, c.eye);
  },

  abyss_knight(ctx, w, h, state, frame) {
    const c = C.enemy.abyss_knight;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 15);
    // 身体铠甲
    px(ctx, cx - 3.5 * u, cy - u, 7 * u, 5 * u, c.armor);
    px(ctx, cx - 2.5 * u, cy + breatheOffset(frame, 0.1, u), 5 * u, u * 0.5, '#374151');
    // 头盔（带角）
    px(ctx, cx - 3 * u, cy - 4 * u, 6 * u, 3.5 * u, c.armor);
    // 角
    ctx.fillStyle = c.armor;
    ctx.beginPath();
    ctx.moveTo(cx - 3 * u, cy - 4 * u);
    ctx.lineTo(cx - 4 * u, cy - 6 * u);
    ctx.lineTo(cx - 2 * u, cy - 4 * u);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 2 * u, cy - 4 * u);
    ctx.lineTo(cx + 4 * u, cy - 6 * u);
    ctx.lineTo(cx + 3 * u, cy - 4 * u);
    ctx.fill();
    // 红眼
    px(ctx, cx - 1.5 * u, cy - 2.5 * u, u, u * 0.6, c.eye);
    px(ctx, cx + 0.5 * u, cy - 2.5 * u, u, u * 0.6, c.eye);
    // 腿
    px(ctx, cx - 3 * u, cy + 4 * u, 2 * u, 3 * u, c.body);
    px(ctx, cx + u, cy + 4 * u, 2 * u, 3 * u, c.body);
    // 大斧
    px(ctx, cx + 4 * u, cy - 3 * u, u * 0.6, 7 * u, c.weapon);
    px(ctx, cx + 3 * u, cy - 4 * u, 3 * u, 2 * u, c.weapon);
  },

  void_horror(ctx, w, h, state, frame) {
    const c = C.enemy.void_horror;
    const cx = w / 2, cy = h / 2;
    // 身体（不规则blob）
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2);
    ctx.fill();
    // 触手
    ctx.strokeStyle = c.tentacle;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const wave = Math.sin(frame * 0.2 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * w * 0.25, cy + Math.sin(a) * w * 0.25);
      const mx = cx + Math.cos(a) * w * 0.4 + wave;
      const my = cy + Math.sin(a) * w * 0.4 + wave;
      ctx.quadraticCurveTo(mx, my, cx + Math.cos(a + 0.3) * w * 0.45, cy + Math.sin(a + 0.3) * w * 0.45);
      ctx.stroke();
    }
    // 大眼
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.05, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.05, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // 口
    ctx.fillStyle = c.mouth;
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.1, w * 0.08, 0, Math.PI);
    ctx.fill();
  },

  reality_breaker(ctx, w, h, state, frame) {
    const c = C.enemy.reality_breaker;
    const cx = w / 2, cy = h / 2;
    const glitch = (Math.random() - 0.5) * 3;
    // 身体（带裂纹效果）
    ctx.fillStyle = c.body;
    ctx.fillRect(cx - w * 0.25, cy - h * 0.3, w * 0.5, h * 0.6);
    // 裂纹
    ctx.strokeStyle = c.crack;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6 + Math.sin(frame * 0.3) * 0.4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const sx = cx + (Math.random() - 0.5) * w * 0.3;
      const sy = cy + (Math.random() - 0.5) * h * 0.4;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + glitch * 3, sy + glitch * 2);
      ctx.lineTo(sx + glitch, sy + glitch * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 眼睛
    px(ctx, cx - w * 0.1, cy - h * 0.08, w * 0.07, w * 0.07, c.eye);
    px(ctx, cx + w * 0.03, cy - h * 0.08, w * 0.07, w * 0.07, c.eye);
    // 光晕
    ctx.fillStyle = c.aura;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  doom_herald(ctx, w, h, state, frame) {
    const c = C.enemy.doom_herald;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 16);
    const flameWave = Math.sin(frame * 0.3) * 2;
    // 身体
    px(ctx, cx - 3.5 * u, cy - 2 * u, 7 * u, 6 * u, c.body);
    // 角
    ctx.fillStyle = c.horn;
    ctx.beginPath();
    ctx.moveTo(cx - 2 * u, cy - 2 * u);
    ctx.lineTo(cx - 3.5 * u, cy - 5 * u);
    ctx.lineTo(cx - u, cy - 2 * u);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + u, cy - 2 * u);
    ctx.lineTo(cx + 3.5 * u, cy - 5 * u);
    ctx.lineTo(cx + 2 * u, cy - 2 * u);
    ctx.fill();
    // 火焰围绕
    ctx.fillStyle = c.flame;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + frame * 0.08;
      const r = w * 0.35;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r + flameWave, w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 眼睛
    px(ctx, cx - 1.5 * u, cy - u, u, u * 0.7, c.eye);
    px(ctx, cx + 0.5 * u, cy - u, u, u * 0.7, c.eye);
    // 腿
    px(ctx, cx - 2.5 * u, cy + 4 * u, 2 * u, 2.5 * u, c.body);
    px(ctx, cx + 0.5 * u, cy + 4 * u, 2 * u, 2.5 * u, c.body);
  }
};

function breatheOffset(frame, speed, unit) {
  return Math.sin(frame * speed) * unit * 0.3;
}

// ═══════════════════════════════════════
//  Boss 精灵绘制
// ═══════════════════════════════════════

const BOSS_DRAW = {
  boss_euler(ctx, w, h, state, frame) {
    const c = C.boss.boss_euler;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 24);
    const breathe = Math.sin(frame * 0.1) * u;
    // 巨大披风
    px(ctx, cx - 7 * u, cy - 4 * u + breathe, 14 * u, 12 * u, c.cape);
    // 铠甲身体
    px(ctx, cx - 5 * u, cy - 2 * u + breathe, 10 * u, 7 * u, c.armor);
    px(ctx, cx - 4 * u, cy - u + breathe, 8 * u, u, '#4b5563');
    // 大肩甲
    px(ctx, cx - 8 * u, cy - 3 * u + breathe, 4 * u, 3 * u, '#64748b');
    px(ctx, cx + 4 * u, cy - 3 * u + breathe, 4 * u, 3 * u, '#64748b');
    // 肩甲宝石
    ctx.fillStyle = c.gem;
    ctx.beginPath();
    ctx.arc(cx - 6 * u, cy - 1.5 * u + breathe, u * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 6 * u, cy - 1.5 * u + breathe, u * 1.2, 0, Math.PI * 2);
    ctx.fill();
    // 头盔
    px(ctx, cx - 4 * u, cy - 7 * u + breathe, 8 * u, 5 * u, c.armor);
    // 冠冕
    ctx.fillStyle = c.gem;
    ctx.beginPath();
    ctx.moveTo(cx - 3 * u, cy - 7 * u + breathe);
    ctx.lineTo(cx - 2 * u, cy - 9 * u + breathe);
    ctx.lineTo(cx - u, cy - 7 * u + breathe);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - u, cy - 7 * u + breathe);
    ctx.lineTo(cx, cy - 10 * u + breathe);
    ctx.lineTo(cx + u, cy - 7 * u + breathe);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + u, cy - 7 * u + breathe);
    ctx.lineTo(cx + 2 * u, cy - 9 * u + breathe);
    ctx.lineTo(cx + 3 * u, cy - 7 * u + breathe);
    ctx.fill();
    // 蓝色发光眼
    px(ctx, cx - 2 * u, cy - 5 * u + breathe, u * 1.5, u, c.eye);
    px(ctx, cx + 0.5 * u, cy - 5 * u + breathe, u * 1.5, u, c.eye);
    // 巨剑
    const sAngle = state === 'attacking' ? Math.sin(frame * 0.8) * 0.5 : -0.1;
    ctx.save();
    ctx.translate(cx + 8 * u, cy + breathe);
    ctx.rotate(sAngle);
    px(ctx, -u, -12 * u, u * 2, 14 * u, c.weapon);
    px(ctx, -u * 0.5, -12 * u, u, 14 * u, '#e2e8f0');
    px(ctx, -u * 2, 0, u * 4, u, '#94a3b8');
    ctx.restore();
    // 腿
    px(ctx, cx - 4 * u, cy + 5 * u, 3 * u, 5 * u, c.armor);
    px(ctx, cx + u, cy + 5 * u, 3 * u, 5 * u, c.armor);
  },

  boss_prism(ctx, w, h, state, frame) {
    const c = C.boss.boss_prism;
    const cx = w / 2, cy = h / 2;
    const pulse = Math.sin(frame * 0.12) * 0.2;
    // 光环
    ctx.fillStyle = c.aura;
    ctx.globalAlpha = 0.15 + pulse * 0.1;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 棱镜身体（菱形）
    ctx.fillStyle = c.body;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.4);
    ctx.lineTo(cx + w * 0.35, cy);
    ctx.lineTo(cx, cy + h * 0.4);
    ctx.lineTo(cx - w * 0.35, cy);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // 内部水晶折射
    ctx.fillStyle = c.crystal;
    ctx.globalAlpha = 0.5 + pulse;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.2);
    ctx.lineTo(cx + w * 0.15, cy);
    ctx.lineTo(cx, cy + h * 0.2);
    ctx.lineTo(cx - w * 0.15, cy);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // 核心
    ctx.fillStyle = c.core;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = c.eye;
    ctx.fillRect(cx - w * 0.06, cy - w * 0.03, w * 0.04, w * 0.03);
    ctx.fillRect(cx + w * 0.02, cy - w * 0.03, w * 0.04, w * 0.03);
    // 轨道冰晶
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + frame * 0.05;
      const r = w * 0.38;
      const ix = cx + Math.cos(a) * r;
      const iy = cy + Math.sin(a) * r;
      ctx.fillStyle = c.crystal;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(ix, iy - 4);
      ctx.lineTo(ix + 3, iy);
      ctx.lineTo(ix, iy + 4);
      ctx.lineTo(ix - 3, iy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  boss_nyx(ctx, w, h, state, frame) {
    const c = C.boss.boss_nyx;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 24);
    const wave = Math.sin(frame * 0.12) * u;
    // 虚空光环
    ctx.fillStyle = c.aura;
    ctx.globalAlpha = 0.1 + Math.sin(frame * 0.08) * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 披风（飘动）
    ctx.fillStyle = c.cloak;
    ctx.beginPath();
    ctx.moveTo(cx - 6 * u, cy - 2 * u);
    ctx.quadraticCurveTo(cx - 8 * u, cy + 8 * u + wave, cx - 3 * u, cy + 10 * u);
    ctx.lineTo(cx + 3 * u, cy + 10 * u);
    ctx.quadraticCurveTo(cx + 8 * u, cy + 8 * u - wave, cx + 6 * u, cy - 2 * u);
    ctx.closePath();
    ctx.fill();
    // 身体
    px(ctx, cx - 4 * u, cy - 3 * u, 8 * u, 8 * u, c.body);
    // 面具/脸
    px(ctx, cx - 3 * u, cy - 7 * u, 6 * u, 4.5 * u, c.body);
    // 发光裂缝面具
    ctx.strokeStyle = c.aura;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7 * u);
    ctx.lineTo(cx, cy - 3 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 2.5 * u, cy - 5 * u);
    ctx.lineTo(cx + 2.5 * u, cy - 5 * u);
    ctx.stroke();
    // 紫色发光双眼
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(cx - 1.5 * u, cy - 5 * u, u * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 1.5 * u, cy - 5 * u, u * 1.2, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛发光拖影
    ctx.fillStyle = c.eye;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(cx - 1.5 * u, cy - 5 * u, -3 * u, u * 0.5);
    ctx.fillRect(cx + 1.5 * u, cy - 5 * u, 3 * u, u * 0.5);
    ctx.globalAlpha = 1;
    // 双镰
    ctx.save();
    ctx.translate(cx - 6 * u, cy - u);
    ctx.rotate(-0.3 + Math.sin(frame * 0.15) * 0.15);
    ctx.fillStyle = c.blade;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4 * u, -6 * u, 0, -8 * u);
    ctx.lineTo(u, -7 * u);
    ctx.quadraticCurveTo(-2 * u, -5 * u, 0, 0);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 6 * u, cy - u);
    ctx.rotate(0.3 - Math.sin(frame * 0.15) * 0.15);
    ctx.fillStyle = c.blade;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4 * u, -6 * u, 0, -8 * u);
    ctx.lineTo(-u, -7 * u);
    ctx.quadraticCurveTo(2 * u, -5 * u, 0, 0);
    ctx.fill();
    ctx.restore();
  },

  boss_chronos(ctx, w, h, state, frame) {
    const c = C.boss.boss_chronos;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 28);
    // 光环
    ctx.strokeStyle = c.aura;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // 巨大齿轮环
    ctx.strokeStyle = c.gear;
    ctx.lineWidth = 3;
    const gearR = w * 0.38;
    const teeth = 12;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2 + frame * 0.02;
      const r = i % 2 === 0 ? gearR : gearR - u * 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    // 身体
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // 时钟面板
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.clock;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    // 时钟刻度
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = w * 0.15;
      const r2 = w * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }
    // 时针分针
    ctx.strokeStyle = c.gear;
    ctx.lineWidth = 2;
    const h1 = frame * 0.03;
    const h2 = frame * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(h1) * w * 0.1, cy + Math.sin(h1) * w * 0.1);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(h2) * w * 0.14, cy + Math.sin(h2) * w * 0.14);
    ctx.stroke();
    // 眼睛（时钟上方）
    ctx.fillStyle = c.eye;
    ctx.fillRect(cx - w * 0.06, cy - w * 0.22, w * 0.04, w * 0.04);
    ctx.fillRect(cx + w * 0.02, cy - w * 0.22, w * 0.04, w * 0.04);
    // 内齿轮（反向旋转）
    ctx.strokeStyle = c.clock;
    ctx.lineWidth = 1.5;
    const igR = w * 0.24;
    const igTeeth = 8;
    ctx.beginPath();
    for (let i = 0; i < igTeeth * 2; i++) {
      const a = (i / (igTeeth * 2)) * Math.PI * 2 - frame * 0.04;
      const r = i % 2 === 0 ? igR : igR - u * 1.5;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
  },

  boss_ophelia(ctx, w, h, state, frame) {
    const c = C.boss.boss_ophelia;
    const cx = w / 2, cy = h / 2;
    const u = Math.max(1, w / 32);
    const pulse = Math.sin(frame * 0.08);
    // 巨大虚空光环
    ctx.fillStyle = c.aura;
    ctx.globalAlpha = 0.08 + pulse * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 虚空能量环
    ctx.strokeStyle = c.void;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + pulse * 0.2;
    for (let ring = 0; ring < 3; ring++) {
      const r = w * (0.3 + ring * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, r, frame * 0.03 * (ring % 2 ? -1 : 1), frame * 0.03 * (ring % 2 ? -1 : 1) + Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 身体（优雅的人形轮廓）
    ctx.fillStyle = c.body;
    // 上身
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2 * u, w * 0.15, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 下身裙摆（飘动）
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.15, cy + 2 * u);
    ctx.quadraticCurveTo(cx - w * 0.25, cy + h * 0.35 + pulse * 3, cx - w * 0.1, cy + h * 0.4);
    ctx.lineTo(cx + w * 0.1, cy + h * 0.4);
    ctx.quadraticCurveTo(cx + w * 0.25, cy + h * 0.35 - pulse * 3, cx + w * 0.15, cy + 2 * u);
    ctx.closePath();
    ctx.fill();
    // 头部
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.25, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 虚空之冠
    ctx.fillStyle = c.void;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * w * 0.08, cy - h * 0.25 + Math.sin(a) * w * 0.08);
      ctx.lineTo(cx + Math.cos(a) * w * 0.16, cy - h * 0.25 + Math.sin(a) * w * 0.16 - 4);
      ctx.lineTo(cx + Math.cos(a + 0.15) * w * 0.09, cy - h * 0.25 + Math.sin(a + 0.15) * w * 0.09);
      ctx.fill();
    }
    // 心脏核心（胸口发光）
    ctx.fillStyle = c.heart;
    ctx.globalAlpha = 0.6 + pulse * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy - 2 * u, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 眼睛（三眼）
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(cx - w * 0.04, cy - h * 0.27, w * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + w * 0.04, cy - h * 0.27, w * 0.02, 0, Math.PI * 2);
    ctx.fill();
    // 第三只眼（额头）
    ctx.fillStyle = c.heart;
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.32, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
    // 手臂/触手
    ctx.strokeStyle = c.void;
    ctx.lineWidth = 2.5;
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + side * w * 0.12, cy - u);
      const waveArm = Math.sin(frame * 0.1 + side) * 5;
      ctx.quadraticCurveTo(
        cx + side * w * 0.3, cy - 3 * u + waveArm,
        cx + side * w * 0.35, cy + 2 * u + waveArm
      );
      ctx.stroke();
    }
  }
};

// ═══════════════════════════════════════
//  导出的渲染 API
// ═══════════════════════════════════════

let _frameCounter = 0;

export const SpriteRenderer = {
  /**
   * 增加全局帧计数器（每帧调用一次）
   */
  tick() {
    _frameCounter++;
  },

  /**
   * 绘制实体精灵
   * @param {CanvasRenderingContext2D} ctx - 目标 context
   * @param {Object} entity - 实体对象
   * @param {number} screenX - 屏幕坐标 X (中心)
   * @param {number} screenY - 屏幕坐标 Y (中心)
   */
  drawEntity(ctx, entity, screenX, screenY) {
    if (!entity) return;

    const w = entity.width || 32;
    const h = entity.height || 32;
    const drawW = w * 1.8;  // 精灵绘制区域比碰撞盒大
    const drawH = h * 1.8;

    ctx.save();
    ctx.translate(screenX, screenY);

    // 受伤闪白
    if (entity.flashTimer && entity.flashTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(entity.flashTimer * 20) * 0.5;
    }

    // I-Frame 闪烁
    if (entity.iFrames && entity.iFrames > 0) {
      ctx.globalAlpha = Math.sin(performance.now() * 0.02) * 0.3 + 0.5;
    }

    // 选择绘制函数
    const type = entity.type;
    const state = entity.state || 'idle';

    if (type === 'player') {
      this._drawPlayer(ctx, entity, drawW, drawH, state, _frameCounter);
    } else if (type === 'boss') {
      this._drawBoss(ctx, entity, drawW, drawH, state, _frameCounter);
    } else if (type === 'enemy' || type === 'elite') {
      this._drawEnemy(ctx, entity, drawW, drawH, state, _frameCounter, type === 'elite');
    } else if (type === 'projectile') {
      this._drawProjectile(ctx, entity, w, h);
    } else if (type === 'item') {
      this._drawItem(ctx, entity, w, h);
    }

    // 血条（敌人/Boss）
    if ((type === 'enemy' || type === 'elite' || type === 'boss') && entity.stats) {
      this._drawHealthBar(ctx, entity, drawW);
    }

    ctx.restore();
  },

  _drawPlayer(ctx, entity, w, h, state, frame) {
    ctx.save();
    ctx.translate(-w / 2, -h / 2);

    const charId = entity.characterId || 'voidwalker';

    switch (charId) {
      case 'voidwalker':
        drawVoidwalker(ctx, w, h, state, frame);
        break;
      case 'abyssal_knight':
        drawAbyssalKnight(ctx, w, h, state, frame);
        break;
      case 'shadow_hunter':
        drawShadowHunter(ctx, w, h, state, frame);
        break;
      default:
        drawVoidwalker(ctx, w, h, state, frame);
    }
    ctx.restore();
  },

  _drawEnemy(ctx, entity, w, h, state, frame, isElite) {
    ctx.save();
    ctx.translate(-w / 2, -h / 2);

    // 精英光环
    if (isElite) {
      ctx.fillStyle = '#fbbf24';
      ctx.globalAlpha = 0.12 + Math.sin(frame * 0.15) * 0.08;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const enemyId = entity.enemyId || 'void_wisp';
    const drawFn = ENEMY_DRAW[enemyId];
    if (drawFn) {
      drawFn(ctx, w, h, state, frame);
    } else {
      // 降级：通用敌人绘制
      this._drawGenericEnemy(ctx, w, h, entity, frame);
    }
    ctx.restore();
  },

  _drawBoss(ctx, entity, w, h, state, frame) {
    ctx.save();
    ctx.translate(-w / 2, -h / 2);

    const bossId = entity.enemyId || 'boss_euler';
    const drawFn = BOSS_DRAW[bossId];
    if (drawFn) {
      drawFn(ctx, w, h, state, frame);
    } else {
      // 降级：通用 Boss 绘制
      this._drawGenericBoss(ctx, w, h, entity, frame);
    }
    ctx.restore();
  },

  _drawProjectile(ctx, entity, w, h) {
    const elem = entity.element;
    const colors = {
      void: '#a855f7', fire: '#ef4444', ice: '#38bdf8', lightning: '#facc15'
    };
    const color = colors[elem] || '#60a5fa';

    // 投射物光效
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 核心
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // 白心
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // 拖尾（用面朝方向）
    if (entity.facing !== undefined) {
      const tailX = -Math.cos(entity.facing) * w;
      const tailY = -Math.sin(entity.facing) * w;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(tailX, tailY, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.arc(tailX * 1.5, tailY * 1.5, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  _drawItem(ctx, entity, w, h) {
    const bob = Math.sin(_frameCounter * 0.15) * 3;
    ctx.fillStyle = '#4ade80';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, bob, w * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(-w * 0.3, -h * 0.3 + bob, w * 0.6, h * 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w * 0.15, -h * 0.15 + bob, w * 0.3, h * 0.3);
  },

  _drawHealthBar(ctx, entity, drawW) {
    const hp = entity.stats.hp;
    const maxHp = entity.stats.maxHp;
    if (!maxHp || hp >= maxHp) return;

    const barW = drawW * 0.7;
    const barH = 3;
    const barY = -drawW / 2 - 6;
    const ratio = Math.max(0, hp / maxHp);

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    // 血条
    const hpColor = entity.type === 'boss' ? '#ef4444' :
                    entity.type === 'elite' ? '#fbbf24' : '#ef4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(-barW / 2, barY, barW * ratio, barH);
    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-barW / 2, barY, barW, barH);
  },

  _drawGenericEnemy(ctx, w, h, entity, frame) {
    const cx = w / 2, cy = h / 2;
    const elemColors = {
      void: '#7c3aed', fire: '#ef4444', ice: '#38bdf8', lightning: '#facc15'
    };
    const bodyColor = elemColors[entity.element] || '#ef4444';
    // 身体
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - w * 0.1, cy - w * 0.06, w * 0.06, w * 0.06);
    ctx.fillRect(cx + w * 0.04, cy - w * 0.06, w * 0.06, w * 0.06);
  },

  _drawGenericBoss(ctx, w, h, entity, frame) {
    const cx = w / 2, cy = h / 2;
    // 光环
    ctx.fillStyle = '#a855f7';
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 身体
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - w * 0.1, cy - w * 0.06, w * 0.07, w * 0.05);
    ctx.fillRect(cx + w * 0.03, cy - w * 0.06, w * 0.07, w * 0.05);
  }
};
