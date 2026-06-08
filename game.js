const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.getElementById("levelText"),
  score: document.getElementById("scoreText"),
  life: document.getElementById("lifeText"),
  combo: document.getElementById("comboText"),
  startPanel: document.getElementById("startPanel"),
  introPanel: document.getElementById("introPanel"),
  upgradePanel: document.getElementById("upgradePanel"),
  upgradeGrid: document.getElementById("upgradeGrid"),
  endPanel: document.getElementById("endPanel"),
  endEyebrow: document.getElementById("endEyebrow"),
  endTitle: document.getElementById("endTitle"),
  endCopy: document.getElementById("endCopy"),
  startButton: document.getElementById("startButton"),
  introButton: document.getElementById("introButton"),
  introStartButton: document.getElementById("introStartButton"),
  introBackButton: document.getElementById("introBackButton"),
  difficultyButtons: [...document.querySelectorAll("[data-difficulty]")],
  difficultyNote: document.getElementById("difficultyNote"),
  restartButton: document.getElementById("restartButton"),
  pauseButton: document.getElementById("pauseButton"),
  pauseIcon: document.getElementById("pauseIcon"),
};

const W = canvas.width;
const H = canvas.height;
const brick = {
  cols: 20,
  rows: 17,
  size: 15,
  gap: 4,
  offsetX: 8,
  offsetY: 126,
};

const state = {
  mode: "start",
  level: 1,
  score: 0,
  lives: 3,
  difficulty: "normal",
  combo: 1,
  maxCombo: 1,
  comboTimer: 0,
  levelIntro: 0,
  balls: [],
  bricks: [],
  obstacles: [],
  particles: [],
  powerups: [],
  floaters: [],
  paddle: {
    x: W / 2 - 46,
    y: H - 88,
    w: 92,
    h: 12,
    targetX: W / 2 - 46,
    glow: 0,
  },
  upgrades: {
    paddleBonus: 0,
    ballBonus: 0,
    ballSize: 0,
    blastRadius: 1,
    splitChance: 0.06,
  },
  shake: 0,
  time: 0,
  last: 0,
  pointerActive: false,
};

const palette = {
  cyan: "#23f4ff",
  pink: "#ff3df2",
  gold: "#ffd23d",
  green: "#42ff8d",
  orange: "#ff8a1f",
  blue: "#6f8cff",
  red: "#ff4141",
  white: "#f6fbff",
  dark: "#020a18",
};

const BALL_MIN_SPEED = 3.8;

const difficulties = {
  easy: {
    label: "简单",
    note: "简单：5 条生命，球速较慢，障碍更温和，适合熟悉玩法。",
    lives: 5,
    startSpeed: 3.95,
    maxSpeed: 5.65,
    obstacleScale: 0.78,
    shieldHpBonus: -1,
    splitBonus: 0.03,
  },
  normal: {
    label: "普通",
    note: "普通：3 条生命，标准速度和障碍节奏，适合第一次完整体验。",
    lives: 3,
    startSpeed: 4.35,
    maxSpeed: 6.25,
    obstacleScale: 1,
    shieldHpBonus: 0,
    splitBonus: 0,
  },
  hard: {
    label: "困难",
    note: "困难：2 条生命，球速更快，障碍更活跃，护盾方块更硬。",
    lives: 2,
    startSpeed: 4.75,
    maxSpeed: 6.75,
    obstacleScale: 1.24,
    shieldHpBonus: 1,
    splitBonus: -0.015,
  },
};

const upgrades = [
  {
    title: "多重发射",
    copy: "下一关开局额外增加 1 颗能量球。",
    apply: () => {
      state.upgrades.ballBonus += 1;
    },
  },
  {
    title: "加长挡板",
    copy: "挡板宽度提升，接住高速球更稳。",
    apply: () => {
      state.upgrades.paddleBonus += 18;
    },
  },
  {
    title: "核心爆破",
    copy: "炸弹方块的爆炸范围提升一圈。",
    apply: () => {
      state.upgrades.blastRadius += 0.45;
    },
  },
  {
    title: "能量膨胀",
    copy: "小球半径增加，命中密集砖墙更爽。",
    apply: () => {
      state.upgrades.ballSize += 0.8;
    },
  },
  {
    title: "复制协议",
    copy: "击碎方块后更容易掉落 x3 分裂道具。",
    apply: () => {
      state.upgrades.splitChance += 0.05;
    },
  },
];

const levelForms = [
  {
    name: "霓虹入口",
    tip: "左右色块墙，中路能量门。",
    accent: palette.cyan,
    colors: [palette.green, palette.cyan, palette.orange, palette.pink],
    pattern: ({ r, c }) => {
      if (r < 2) return false;
      if (c === 9 || c === 10) return r < 12;
      if (r === 12 && c >= 6 && c <= 13) return true;
      if (c < 7 && r < 11) return true;
      if (c > 12 && r < 11) return true;
      if (r > 12 && c >= 1 && c <= 18) return true;
      return false;
    },
    obstacles: (speedBoost) => {
      addObstacle({ x: 62, y: 442, w: 86, h: 12, color: palette.blue });
      addObstacle({ x: 242, y: 442, w: 86, h: 12, color: palette.pink });
      addObstacle({ x: 156, y: 504, w: 78, h: 10, vx: 1.05 + speedBoost, range: 82, color: palette.cyan, type: "mover" });
    },
  },
  {
    name: "双翼矩阵",
    tip: "两翼展开，中间核心最厚。",
    accent: palette.green,
    colors: [palette.cyan, palette.green, palette.gold, palette.pink],
    pattern: ({ r, c }) => {
      const leftWing = c < 8 && r > 1 && r < 13 && c + r > 6;
      const rightWing = c > 11 && r > 1 && r < 13 && 25 - c + r > 6;
      const core = c >= 8 && c <= 11 && r >= 4 && r <= 14;
      const base = r >= 14 && c > 2 && c < 17;
      return leftWing || rightWing || core || base;
    },
    obstacles: (speedBoost) => {
      addObstacle({ x: 118, y: 402, w: 14, h: 84, color: palette.gold });
      addObstacle({ x: 258, y: 402, w: 14, h: 84, color: palette.gold });
      addObstacle({ x: 164, y: 486, w: 62, h: 12, vx: 1.25 + speedBoost, range: 104, phase: Math.PI, color: palette.green, type: "mover" });
    },
  },
  {
    name: "防火墙脸谱",
    tip: "外壳坚硬，眼部和嘴部藏有奖励。",
    accent: palette.orange,
    colors: [palette.orange, palette.red, palette.pink, palette.blue],
    pattern: ({ r, c }) => {
      const ring = r > 1 && r < 15 && c > 1 && c < 18 && (r < 4 || r > 12 || c < 4 || c > 15);
      const eyes = (r === 7 || r === 8) && ((c >= 5 && c <= 7) || (c >= 12 && c <= 14));
      const mouth = r >= 11 && r <= 12 && c >= 6 && c <= 13;
      const chips = (r + c) % 7 === 0 && r > 3 && r < 13;
      return ring || eyes || mouth || chips;
    },
    obstacles: (speedBoost) => {
      addObstacle({ x: 44, y: 430, w: 68, h: 12, color: palette.cyan });
      addObstacle({ x: 278, y: 430, w: 68, h: 12, color: palette.cyan });
      addObstacle({ x: 186, y: 388, w: 14, h: 92, vy: 0.95 + speedBoost, range: 54, color: palette.pink, type: "mover" });
    },
  },
  {
    name: "回路迷宫",
    tip: "多层回路会改变小球入射角。",
    accent: palette.blue,
    colors: [palette.blue, palette.cyan, palette.white, palette.green],
    pattern: ({ r, c }) => {
      if (r < 2) return false;
      const outer = r >= 2 && r <= 15 && c >= 1 && c <= 18 && (r === 2 || r === 15 || c === 1 || c === 18);
      const inner = r >= 5 && r <= 12 && c >= 4 && c <= 15 && (r === 5 || r === 12 || c === 4 || c === 15);
      const lane = (r === 8 && c >= 4 && c <= 11) || (c === 11 && r >= 8 && r <= 14) || (r === 14 && c >= 8 && c <= 15);
      const nodes = (r + c) % 9 === 0 && r > 3 && r < 15;
      return outer || inner || lane || nodes;
    },
    obstacles: (speedBoost) => {
      addObstacle({ x: 80, y: 452, w: 72, h: 10, color: palette.blue });
      addObstacle({ x: 238, y: 452, w: 72, h: 10, color: palette.blue });
      addObstacle({ x: 188, y: 410, w: 12, h: 96, vy: 1.1 + speedBoost, range: 42, color: palette.cyan, type: "mover" });
      addObstacle({ x: 126, y: 526, w: 138, h: 10, color: palette.pink });
    },
  },
  {
    name: "双塔夹击",
    tip: "两座高塔夹住中路，移动门会拦截球路。",
    accent: palette.pink,
    colors: [palette.pink, palette.orange, palette.gold, palette.red],
    pattern: ({ r, c }) => {
      if (r < 2 || r > 15) return false;
      const leftTower = c >= 3 && c <= 7;
      const rightTower = c >= 12 && c <= 16;
      const bridge = (r === 7 || r === 8) && c >= 5 && c <= 14;
      const windows = r % 3 === 0 && c % 2 === 0;
      return ((leftTower || rightTower) && !windows) || bridge || (r === 14 && c >= 2 && c <= 17);
    },
    obstacles: (speedBoost) => {
      addObstacle({ x: 70, y: 418, w: 12, h: 90, color: palette.pink });
      addObstacle({ x: 308, y: 418, w: 12, h: 90, color: palette.pink });
      addObstacle({ x: 134, y: 468, w: 122, h: 10, vx: 1.35 + speedBoost, range: 72, color: palette.orange, type: "mover" });
      addObstacle({ x: 156, y: 542, w: 78, h: 10, color: palette.gold });
    },
  },
  {
    name: "核心螺旋",
    tip: "最终核心是螺旋结构，障碍会形成十字封锁。",
    accent: palette.gold,
    colors: [palette.gold, palette.orange, palette.pink, palette.cyan],
    pattern: ({ r, c }) => {
      if (r < 2 || r > 15 || c < 1 || c > 18) return false;
      const frame = r === 2 || r === 15 || c === 1 || c === 18;
      const spiral =
        (r === 5 && c >= 5 && c <= 16) ||
        (c === 16 && r >= 5 && r <= 12) ||
        (r === 12 && c >= 6 && c <= 16) ||
        (c === 6 && r >= 8 && r <= 12) ||
        (r === 8 && c >= 6 && c <= 11) ||
        (c === 11 && r >= 8 && r <= 10);
      const core = Math.abs(c - 10) + Math.abs(r - 9) <= 3;
      const sparks = (r * 5 + c * 3) % 17 === 0;
      return frame || spiral || core || sparks;
    },
    obstacles: (speedBoost) => {
      addObstacle({ x: 84, y: 436, w: 222, h: 10, vx: 0.9 + speedBoost, range: 34, color: palette.gold, type: "mover" });
      addObstacle({ x: 188, y: 388, w: 12, h: 112, vy: 1.05 + speedBoost, range: 38, phase: Math.PI / 2, color: palette.cyan, type: "mover" });
      addObstacle({ x: 42, y: 524, w: 82, h: 10, color: palette.pink });
      addObstacle({ x: 266, y: 524, w: 82, h: 10, color: palette.pink });
    },
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function currentDifficulty() {
  return difficulties[state.difficulty] || difficulties.normal;
}

function levelCycle(level) {
  return Math.floor((level - 1) / levelForms.length);
}

function rotateColors(colors, offset) {
  return colors.map((_, index) => colors[(index + offset) % colors.length]);
}

function extraInfinitePattern({ r, c }, level, cycle) {
  if (cycle <= 0 || r < 2 || r > 15 || c < 1 || c > 18) return false;
  const interval = clamp(16 - cycle, 7, 16);
  const dataNoise = (r * (cycle + 3) + c * 5 + level) % interval === 0;
  const shiftingLane = cycle >= 2 && (r === 4 + ((level + cycle) % 9) || c === 3 + ((level * 2 + cycle) % 14));
  return dataNoise || shiftingLane;
}

function addInfiniteObstacles(level, cycle) {
  if (cycle <= 0) return;
  const colorPool = [palette.cyan, palette.pink, palette.gold, palette.green, palette.orange, palette.blue];
  const color = colorPool[level % colorPool.length];
  const secondColor = colorPool[(level + 3) % colorPool.length];
  const speed = 0.9 + Math.min(2.2, cycle * 0.18);
  const y = 392 + ((level * 37) % 126);
  const x = 58 + ((level * 43) % 120);

  if (level % 2 === 0) {
    addObstacle({ x, y, w: clamp(62 + cycle * 7, 62, 128), h: 10, vx: speed, range: clamp(42 + cycle * 8, 42, 112), color, type: "mover" });
  } else {
    addObstacle({ x: x + 72, y: y - 18, w: 12, h: clamp(64 + cycle * 6, 64, 118), vy: speed, range: clamp(32 + cycle * 5, 32, 86), color, type: "mover" });
  }

  if (cycle >= 2) {
    addObstacle({ x: 74 + ((level * 19) % 170), y: 532, w: 72, h: 10, color: secondColor });
  }
}

function currentLevelForm(level = state.level) {
  const base = levelForms[(level - 1) % levelForms.length];
  const cycle = levelCycle(level);
  const cycleTags = ["α", "β", "γ", "δ", "Σ", "Ω"];
  const suffix = cycle === 0 ? "" : ` ${cycleTags[cycle % cycleTags.length]}${cycle + 1}`;
  return {
    ...base,
    name: `${base.name}${suffix}`,
    tip: cycle === 0 ? base.tip : `${base.tip} 无限强化轮 ${cycle + 1}。`,
    colors: rotateColors(base.colors || [palette.cyan, palette.pink], level + cycle),
    pattern: (cell) => base.pattern(cell) || extraInfinitePattern(cell, level, cycle),
    obstacles: (speedBoost) => {
      base.obstacles(speedBoost + cycle * 0.14);
      addInfiniteObstacles(level, cycle);
    },
  };
}

function levelStartSpeed() {
  return currentDifficulty().startSpeed;
}

function maxBallSpeed() {
  return currentDifficulty().maxSpeed;
}

function setBallSpeed(ball, speed) {
  const angle = Math.atan2(ball.vy, ball.vx);
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
}

function accelerateBall(ball, amount) {
  const speed = Math.hypot(ball.vx, ball.vy);
  setBallSpeed(ball, clamp(speed + amount, BALL_MIN_SPEED, maxBallSpeed()));
}

function show(panel) {
  for (const el of [ui.startPanel, ui.introPanel, ui.upgradePanel, ui.endPanel]) {
    el.classList.remove("is-visible");
  }
  if (panel) panel.classList.add("is-visible");
}

function setMode(mode) {
  state.mode = mode;
  ui.pauseIcon.textContent = mode === "paused" ? "▶" : "II";
}

function updateHud() {
  ui.level.textContent = `${String(state.level).padStart(2, "0")} / ∞`;
  ui.score.textContent = state.score.toLocaleString("zh-CN");
  ui.life.textContent = state.lives;
  ui.combo.textContent = `x${state.combo}`;
}

function resetRun() {
  state.level = 1;
  state.score = 0;
  state.lives = currentDifficulty().lives;
  state.combo = 1;
  state.maxCombo = 1;
  state.comboTimer = 0;
  state.levelIntro = 0;
  state.upgrades = {
    paddleBonus: 0,
    ballBonus: 0,
    ballSize: 0,
    blastRadius: 1,
    splitChance: 0.06,
  };
  state.paddle.w = 92;
  setupLevel();
}

function setupLevel() {
  state.bricks = [];
  state.obstacles = [];
  state.balls = [];
  state.particles = [];
  state.powerups = [];
  state.floaters = [];
  state.combo = 1;
  state.comboTimer = 0;
  state.levelIntro = 130;
  state.paddle.w = clamp(92 + state.upgrades.paddleBonus, 76, 150);
  state.paddle.x = W / 2 - state.paddle.w / 2;
  state.paddle.targetX = state.paddle.x;

  buildBricks();
  buildObstacles();

  const ballCount = clamp(3 + state.upgrades.ballBonus, 3, 7);
  for (let i = 0; i < ballCount; i += 1) {
    const angle = -Math.PI / 2 + rand(-0.52, 0.52);
    spawnBall(W / 2 + i * 8 - ballCount * 4, H - 118, angle, levelStartSpeed());
  }
  updateHud();
}

function buildBricks() {
  const form = currentLevelForm();
  const pattern = form.pattern;
  const cycle = levelCycle(state.level);
  const difficulty = currentDifficulty();
  for (let r = 0; r < brick.rows; r += 1) {
    for (let c = 0; c < brick.cols; c += 1) {
      if (!pattern({ r, c })) continue;
      const x = brick.offsetX + c * (brick.size + brick.gap);
      const y = brick.offsetY + r * (brick.size + brick.gap);
      const colorBands = form.colors || [palette.green, palette.cyan, palette.orange, palette.pink, palette.red, palette.blue];
      let type = "normal";
      let hp = 1;
      const roll = Math.random();
      if ((r + c + state.level) % 19 === 0 || roll < 0.035 + Math.min(0.03, cycle * 0.004)) {
        type = "bomb";
      } else if ((r * 3 + c + state.level) % 23 === 0 || roll > 0.965 - difficulty.splitBonus - Math.min(0.025, cycle * 0.004)) {
        type = "split";
      } else if ((r + c) % 11 === 0 && state.level > 1) {
        type = "shield";
        hp = clamp(2 + Math.min(2, Math.floor(cycle / 2)) + difficulty.shieldHpBonus, 1, 5);
      } else if (cycle >= 2 && (r * 7 + c + state.level) % clamp(17 - cycle, 9, 17) === 0) {
        type = "shield";
        hp = clamp(2 + difficulty.shieldHpBonus, 1, 5);
      }
      state.bricks.push({
        x,
        y,
        w: brick.size,
        h: brick.size,
        row: r,
        col: c,
        hp,
        maxHp: hp,
        type,
        alive: true,
        flash: 0,
        color: colorBands[Math.floor((r / brick.rows) * colorBands.length)],
      });
    }
  }
}

function addObstacle(config) {
  state.obstacles.push({
    x: config.x,
    y: config.y,
    w: config.w,
    h: config.h,
    baseX: config.x,
    baseY: config.y,
    vx: config.vx || 0,
    vy: config.vy || 0,
    range: config.range || 0,
    phase: config.phase || 0,
    color: config.color || palette.cyan,
    type: config.type || "wall",
    hitGlow: 0,
  });
}

function buildObstacles() {
  const speedBoost = Math.min(1.8, 0.15 * state.level) * currentDifficulty().obstacleScale;
  currentLevelForm().obstacles(speedBoost);
}

function spawnBall(x, y, angle, speed, kind = "normal") {
  const radius = kind === "mega" ? 6.4 : 4.8 + state.upgrades.ballSize;
  state.balls.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: radius,
    kind,
    trail: [],
    hot: 0,
  });
}

function spawnParticles(x, y, color, amount = 10, power = 1) {
  for (let i = 0; i < amount; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.8, 3.2) * power;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(24, 46),
      maxLife: 46,
      size: rand(1.3, 3.6),
      color,
    });
  }
}

function spawnFloater(x, y, text, color = palette.gold) {
  state.floaters.push({
    x,
    y,
    text,
    color,
    life: 48,
  });
}

function spawnPowerup(x, y, type) {
  state.powerups.push({
    x,
    y,
    type,
    w: type === "split" ? 40 : 48,
    h: 24,
    vy: 1.35,
    phase: rand(0, Math.PI * 2),
  });
}

function brickColor(b) {
  if (b.type === "bomb") return palette.orange;
  if (b.type === "split") return palette.cyan;
  if (b.type === "shield") return b.hp === 2 ? palette.blue : palette.white;
  return b.color;
}

function hitBrick(b, ball) {
  b.hp -= ball.kind === "mega" ? 2 : 1;
  b.flash = 8;
  state.combo = clamp(state.combo + 1, 1, 99);
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.comboTimer = 105;
  state.score += 8 * state.combo;
  ball.hot = 10;
  accelerateBall(ball, 0.012);
  spawnParticles(ball.x, ball.y, brickColor(b), 6, 0.75);
  spawnFloater(b.x + b.w / 2, b.y, `+${8 * state.combo}`, brickColor(b));

  if (b.hp <= 0) {
    destroyBrick(b, ball);
  }
  updateHud();
}

function destroyBrick(b, ball) {
  b.alive = false;
  const color = brickColor(b);
  spawnParticles(b.x + b.w / 2, b.y + b.h / 2, color, b.type === "bomb" ? 28 : 14, b.type === "bomb" ? 1.45 : 1);

  if (b.type === "bomb") {
    state.shake = Math.max(state.shake, 9);
    explodeAt(b.x + b.w / 2, b.y + b.h / 2, 42 + state.upgrades.blastRadius * 16);
  }

  if (b.type === "split" || Math.random() < state.upgrades.splitChance) {
    spawnPowerup(b.x + b.w / 2 - 20, b.y + b.h / 2, "split");
  }

  if (Math.random() < 0.035) {
    spawnPowerup(b.x + b.w / 2 - 24, b.y + b.h / 2, "bomb");
  }

  if (ball && ball.kind === "mega") {
    explodeAt(b.x + b.w / 2, b.y + b.h / 2, 30);
  }
}

function explodeAt(x, y, radius) {
  for (const other of state.bricks) {
    if (!other.alive) continue;
    const cx = other.x + other.w / 2;
    const cy = other.y + other.h / 2;
    const d = Math.hypot(cx - x, cy - y);
    if (d <= radius) {
      other.hp -= 2;
      other.flash = 12;
      state.score += 16 * state.combo;
      spawnParticles(cx, cy, brickColor(other), 5, 1);
      if (other.hp <= 0) {
        other.alive = false;
        spawnParticles(cx, cy, brickColor(other), 10, 1.1);
      }
    }
  }
}

function splitBall(ball) {
  const speed = clamp(Math.hypot(ball.vx, ball.vy), 3.9, maxBallSpeed());
  const base = Math.atan2(ball.vy, ball.vx);
  spawnBall(ball.x, ball.y, base - 0.42, speed, ball.kind);
  spawnBall(ball.x, ball.y, base + 0.42, speed, ball.kind);
  spawnParticles(ball.x, ball.y, palette.cyan, 24, 1.1);
  state.shake = Math.max(state.shake, 4);
}

function giveBombBall() {
  for (const ball of state.balls) {
    ball.kind = "mega";
    ball.r = 6.8 + state.upgrades.ballSize;
    ball.hot = 80;
  }
  spawnFloater(W / 2, H - 132, "BOMB BALL", palette.orange);
  state.shake = Math.max(state.shake, 5);
}

function circleRectCollision(ball, rect) {
  const nearestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

function resolveBrickCollision(ball, b, forceBounce = false) {
  const prevX = ball.x - ball.vx;
  const prevY = ball.y - ball.vy;
  const fromLeft = prevX <= b.x - ball.r;
  const fromRight = prevX >= b.x + b.w + ball.r;
  const fromTop = prevY <= b.y - ball.r;
  const fromBottom = prevY >= b.y + b.h + ball.r;

  if (forceBounce || ball.kind !== "mega") {
    if (fromLeft || fromRight) {
      ball.vx *= -1;
    } else if (fromTop || fromBottom) {
      ball.vy *= -1;
    } else if (Math.abs(ball.vx) > Math.abs(ball.vy)) {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }
  }
}

function updateObstacles() {
  for (const obstacle of state.obstacles) {
    obstacle.hitGlow = Math.max(0, obstacle.hitGlow - 1);
    if (obstacle.vx) {
      obstacle.x = obstacle.baseX + Math.sin(state.time * 0.026 * obstacle.vx + obstacle.phase) * obstacle.range;
    }
    if (obstacle.vy) {
      obstacle.y = obstacle.baseY + Math.sin(state.time * 0.026 * obstacle.vy + obstacle.phase) * obstacle.range;
    }
  }
}

function updateBalls() {
  const paddle = state.paddle;
  for (let i = state.balls.length - 1; i >= 0; i -= 1) {
    const ball = state.balls[i];
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 9) ball.trail.shift();

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.hot = Math.max(0, ball.hot - 1);

    if (ball.x < ball.r) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x > W - ball.r) {
      ball.x = W - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y < 112 + ball.r) {
      ball.y = 112 + ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    if (
      ball.vy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.y - ball.r <= paddle.y + paddle.h &&
      ball.x >= paddle.x - ball.r &&
      ball.x <= paddle.x + paddle.w + ball.r
    ) {
      const t = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      const speed = clamp(Math.hypot(ball.vx, ball.vy) + 0.025, 4, maxBallSpeed());
      const angle = -Math.PI / 2 + t * 0.92;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.y = paddle.y - ball.r - 0.5;
      paddle.glow = 16;
      spawnParticles(ball.x, paddle.y, palette.cyan, 8, 0.8);
    }

    for (const obstacle of state.obstacles) {
      if (!circleRectCollision(ball, obstacle)) continue;
      resolveBrickCollision(ball, obstacle, true);
      accelerateBall(ball, 0.008);
      ball.x += ball.vx * 0.7;
      ball.y += ball.vy * 0.7;
      obstacle.hitGlow = 16;
      state.shake = Math.max(state.shake, 2.5);
      spawnParticles(ball.x, ball.y, obstacle.color, 9, 0.85);
      break;
    }

    for (const b of state.bricks) {
      if (!b.alive || !circleRectCollision(ball, b)) continue;
      resolveBrickCollision(ball, b);
      hitBrick(b, ball);
      break;
    }

    if (ball.y > H + 36) {
      state.balls.splice(i, 1);
    }
  }

  if (state.balls.length === 0 && state.mode === "playing") {
    loseLife();
  }
}

function loseLife() {
  state.lives -= 1;
  state.combo = 1;
  state.comboTimer = 0;
  updateHud();
  if (state.lives <= 0) {
    endRun(false);
    return;
  }
  const ballCount = clamp(2 + state.upgrades.ballBonus, 2, 6);
  for (let i = 0; i < ballCount; i += 1) {
    spawnBall(W / 2 + i * 9 - ballCount * 4, H - 122, -Math.PI / 2 + rand(-0.45, 0.45), levelStartSpeed());
  }
}

function updatePowerups() {
  const p = state.paddle;
  for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
    const item = state.powerups[i];
    item.phase += 0.08;
    item.y += item.vy;
    const caught =
      item.y + item.h >= p.y &&
      item.y <= p.y + p.h + 12 &&
      item.x + item.w >= p.x &&
      item.x <= p.x + p.w;
    if (caught) {
      if (item.type === "split") {
        const originals = [...state.balls];
        for (const ball of originals.slice(0, 5)) splitBall(ball);
        spawnFloater(p.x + p.w / 2, p.y - 12, "x3", palette.cyan);
      } else {
        giveBombBall();
      }
      state.powerups.splice(i, 1);
    } else if (item.y > H + 30) {
      state.powerups.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.988;
    p.vy *= 0.988;
    p.life -= 1;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y -= 0.65;
    f.life -= 1;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
}

function updateGame() {
  state.time += 1;
  state.levelIntro = Math.max(0, state.levelIntro - 1);
  state.shake = Math.max(0, state.shake - 0.6);
  state.paddle.glow = Math.max(0, state.paddle.glow - 1);
  state.paddle.x += (state.paddle.targetX - state.paddle.x) * 0.28;
  state.paddle.x = clamp(state.paddle.x, 10, W - state.paddle.w - 10);

  if (state.comboTimer > 0) {
    state.comboTimer -= 1;
  } else if (state.combo > 1) {
    state.combo = 1;
    updateHud();
  }

  updateObstacles();
  updateBalls();
  updatePowerups();
  updateParticles();

  if (state.bricks.every((b) => !b.alive) && state.mode === "playing") {
    completeLevel();
  }
}

function completeLevel() {
  state.score += 500 + state.level * 120 + state.maxCombo * 15;
  updateHud();
  setMode("upgrade");
  renderUpgrades();
  show(ui.upgradePanel);
}

function renderUpgrades() {
  ui.upgradeGrid.innerHTML = "";
  const heading = ui.upgradePanel.querySelector("h2");
  const nextForm = currentLevelForm(state.level + 1);
  if (heading && nextForm) {
    heading.textContent = `下一关：${nextForm.name}`;
  }
  const choices = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
  for (const choice of choices) {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.innerHTML = `<strong>${choice.title}</strong><span>${choice.copy}</span>`;
    button.addEventListener("click", () => {
      choice.apply();
      state.level += 1;
      setupLevel();
      show(null);
      setMode("playing");
    });
    ui.upgradeGrid.appendChild(button);
  }
}

function endRun(won) {
  setMode("ended");
  ui.endEyebrow.textContent = won ? "ALL STAGES CLEAR" : "CONNECTION LOST";
  ui.endTitle.textContent = won ? "全部关卡通关" : "能量耗尽";
  ui.endCopy.textContent = `最终分数 ${state.score.toLocaleString("zh-CN")}，最高连击 x${state.maxCombo}。`;
  show(ui.endPanel);
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#041a31");
  g.addColorStop(0.46, "#020b1d");
  g.addColorStop(1, "#06112a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = palette.cyan;
  ctx.lineWidth = 1;
  for (let y = 118; y < H; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + Math.sin(state.time * 0.02 + y) * 3);
    ctx.stroke();
  }
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 112);
    ctx.lineTo(x + Math.sin(state.time * 0.018 + x) * 4, H);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

function drawArena() {
  ctx.save();
  ctx.strokeStyle = "rgba(35,244,255,0.42)";
  ctx.lineWidth = 2;
  ctx.shadowColor = palette.cyan;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(8, 112);
  ctx.lineTo(W - 8, 112);
  ctx.stroke();

  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "rgba(255,61,242,0.18)";
  ctx.fillRect(0, H - 76, W, 76);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
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

function drawBricks() {
  for (const b of state.bricks) {
    if (!b.alive) continue;
    const color = brickColor(b);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 7 + b.flash;
    ctx.fillStyle = color;
    ctx.globalAlpha = b.hp < b.maxHp ? 0.72 : 0.92;
    roundRect(b.x, b.y, b.w, b.h, 3);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 2);
    if (b.type === "bomb") {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#fff3c8";
      ctx.fillRect(b.x + 6, b.y + 6, 3, 3);
    }
    if (b.type === "split") {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(b.x + 4, b.y + 4, 3, 3);
      ctx.fillRect(b.x + 9, b.y + 8, 3, 3);
    }
    b.flash = Math.max(0, b.flash - 1);
    ctx.restore();
  }
}

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    const pulse = 0.65 + Math.sin(state.time * 0.08 + obstacle.x * 0.03) * 0.22;
    const glow = 12 + obstacle.hitGlow * 1.8;
    ctx.save();
    ctx.shadowColor = obstacle.color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = "rgba(1, 7, 18, 0.82)";
    ctx.strokeStyle = obstacle.color;
    ctx.lineWidth = 2;
    roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 5);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = pulse;
    ctx.fillStyle = obstacle.color;
    if (obstacle.w >= obstacle.h) {
      const y = obstacle.y + obstacle.h / 2 - 1;
      for (let x = obstacle.x + 8; x < obstacle.x + obstacle.w - 8; x += 16) {
        ctx.fillRect(x, y, 8, 2);
      }
    } else {
      const x = obstacle.x + obstacle.w / 2 - 1;
      for (let y = obstacle.y + 8; y < obstacle.y + obstacle.h - 8; y += 16) {
        ctx.fillRect(x, y, 2, 8);
      }
    }

    if (obstacle.type === "mover") {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = palette.white;
      const markerX = obstacle.x + obstacle.w / 2 + Math.sin(state.time * 0.12) * Math.max(0, obstacle.w / 2 - 10);
      const markerY = obstacle.y + obstacle.h / 2 + Math.cos(state.time * 0.12) * Math.max(0, obstacle.h / 2 - 10);
      ctx.beginPath();
      ctx.arc(markerX, markerY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawPaddle() {
  const p = state.paddle;
  ctx.save();
  const glow = 16 + p.glow * 1.8;
  ctx.shadowColor = palette.blue;
  ctx.shadowBlur = glow;
  const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
  grad.addColorStop(0, palette.cyan);
  grad.addColorStop(0.52, palette.blue);
  grad.addColorStop(1, palette.pink);
  ctx.fillStyle = grad;
  roundRect(p.x, p.y, p.w, p.h, 6);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#ffffff";
  roundRect(p.x + 8, p.y + 2, p.w - 16, 3, 2);
  ctx.fill();
  ctx.restore();
}

function drawBalls() {
  for (const ball of state.balls) {
    const color = ball.kind === "mega" ? palette.orange : ball.hot > 0 ? palette.gold : palette.white;
    ctx.save();
    for (let i = 0; i < ball.trail.length; i += 1) {
      const t = ball.trail[i];
      ctx.globalAlpha = (i + 1) / ball.trail.length * 0.22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (i + 1) / ball.trail.length, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = ball.kind === "mega" ? 22 : 14;
    const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 3, 1, ball.x, ball.y, ball.r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.42, color);
    grad.addColorStop(1, ball.kind === "mega" ? "#9b3700" : "#6f8cff");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPowerups() {
  for (const item of state.powerups) {
    const color = item.type === "split" ? palette.cyan : palette.orange;
    ctx.save();
    ctx.translate(0, Math.sin(item.phase) * 2);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.fillStyle = "rgba(3, 15, 34, 0.86)";
    ctx.lineWidth = 1.5;
    roundRect(item.x, item.y, item.w, item.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "900 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.type === "split" ? "x3" : "BOMB", item.x + item.w / 2, item.y + item.h / 2 + 0.5);
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  }

  for (const f of state.floaters) {
    ctx.save();
    ctx.globalAlpha = clamp(f.life / 48, 0, 1);
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 12;
    ctx.font = "900 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function drawLevelBanner() {
  if (state.levelIntro <= 0 || state.mode !== "playing") return;
  const form = currentLevelForm();
  const alpha = clamp(state.levelIntro / 28, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(1, 7, 18, 0.78)";
  ctx.strokeStyle = form.accent;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = form.accent;
  ctx.shadowBlur = 18;
  roundRect(38, 292, W - 76, 112, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = form.accent;
  ctx.font = "900 14px Arial";
  ctx.fillText(`第 ${state.level} 关 / 无限`, W / 2, 319);

  ctx.fillStyle = palette.white;
  ctx.font = "900 31px Arial";
  ctx.fillText(form.name, W / 2, 354);

  ctx.fillStyle = "#c8d9f7";
  ctx.font = "700 13px Arial";
  ctx.fillText(form.tip, W / 2, 383);
  ctx.restore();
}

function drawPaused() {
  if (state.mode !== "paused") return;
  ctx.save();
  ctx.fillStyle = "rgba(2, 7, 18, 0.5)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = palette.cyan;
  ctx.shadowColor = palette.cyan;
  ctx.shadowBlur = 18;
  ctx.font = "900 30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", W / 2, H / 2);
  ctx.restore();
}

function render() {
  ctx.save();
  const sx = state.shake ? rand(-state.shake, state.shake) : 0;
  const sy = state.shake ? rand(-state.shake, state.shake) : 0;
  ctx.translate(sx, sy);
  drawBackground();
  drawArena();
  drawBricks();
  drawObstacles();
  drawPowerups();
  drawPaddle();
  drawBalls();
  drawParticles();
  drawLevelBanner();
  ctx.restore();
  drawPaused();
}

function loop(now = 0) {
  const elapsed = now - state.last;
  state.last = now;
  if (elapsed < 80 && state.mode === "playing") {
    updateGame();
  } else if (state.mode !== "playing") {
    updateParticles();
  }
  render();
  requestAnimationFrame(loop);
}

function gameXFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  return ((clientX - rect.left) / rect.width) * W;
}

function movePaddle(event) {
  if (state.mode !== "playing" && state.mode !== "paused") return;
  const x = gameXFromEvent(event);
  state.paddle.targetX = clamp(x - state.paddle.w / 2, 10, W - state.paddle.w - 10);
}

canvas.addEventListener("pointerdown", (event) => {
  state.pointerActive = true;
  movePaddle(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (state.pointerActive) movePaddle(event);
});

window.addEventListener("pointerup", () => {
  state.pointerActive = false;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    state.paddle.targetX -= 30;
  }
  if (event.key === "ArrowRight") {
    state.paddle.targetX += 30;
  }
  if (event.key === " " || event.key.toLowerCase() === "p") {
    togglePause();
  }
});

function togglePause() {
  if (state.mode === "playing") {
    setMode("paused");
  } else if (state.mode === "paused") {
    setMode("playing");
  }
}

function setDifficulty(difficulty) {
  if (!difficulties[difficulty]) return;
  state.difficulty = difficulty;
  const setting = currentDifficulty();
  for (const button of ui.difficultyButtons) {
    const selected = button.dataset.difficulty === difficulty;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }
  if (ui.difficultyNote) {
    ui.difficultyNote.textContent = setting.note;
  }
  if (state.mode === "start") {
    state.lives = setting.lives;
    updateHud();
  }
}

function startGame() {
  resetRun();
  show(null);
  setMode("playing");
}

for (const button of ui.difficultyButtons) {
  button.addEventListener("click", () => {
    setDifficulty(button.dataset.difficulty);
  });
}

ui.startButton.addEventListener("click", startGame);

ui.introButton.addEventListener("click", () => {
  show(ui.introPanel);
});

ui.introStartButton.addEventListener("click", startGame);

ui.introBackButton.addEventListener("click", () => {
  show(ui.startPanel);
});

ui.restartButton.addEventListener("click", () => {
  resetRun();
  show(null);
  setMode("playing");
});

ui.pauseButton.addEventListener("click", togglePause);

resetRun();
show(ui.startPanel);
setMode("start");
setDifficulty(state.difficulty);
updateHud();
requestAnimationFrame(loop);
