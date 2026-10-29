/* global Phaser, COIN_DASH */
const DIFFICULTY_STORAGE_KEY = 'coinDash.difficulty';
const DIFFICULTY_KEYS = { ONE: 'Easy', TWO: 'Normal', THREE: 'Hard' };

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    const d = this.difficulty = this.preset();
    this.score = 0;
    this.finished = false;
    this.paused = false;
    this.deadline = this.time.now + d.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, c.colors.grid, 0.55);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < d.droneCount; i++) {
      const drone = this.add.rectangle((i + 0.5) * c.width / d.droneCount, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * d.droneSpeed, Math.sin(angle) * d.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.playCoinSound();
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    Object.entries(DIFFICULTY_KEYS).forEach(([key, name]) =>
      this.input.keyboard.on(`keydown-${key}`, () => this.setDifficulty(name)));
    this.applyNeonStyle();
  }

  togglePause() {
    if (this.finished) return;
    const c = COIN_DASH;
    this.paused = !this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
      this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
        this.add.rectangle(0, 0, 460, 80, 0x0a1120, 0.95),
        this.add.text(0, 0, 'PAUSED — press P to resume',
          { font: '24px monospace', color: '#ffffff' }).setOrigin(0.5)
      ]);
    } else {
      this.deadline += this.time.now - this.pausedAt;
      this.physics.resume();
      this.pauseOverlay.destroy();
    }
  }

  playCoinSound() {
    const volume = COIN_DASH.soundVolume;
    if (!(volume > 0)) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = CoinDash.audio || (CoinDash.audio = new AudioCtx());
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const t = ctx.currentTime;
      [[988, 0], [1319, 0.05]].forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t + offset);
        gain.gain.exponentialRampToValueAtTime(volume, t + offset + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.07);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.075);
      });
    } catch (e) { /* audio is optional */ }
  }

  // Active preset merged over the top-level defaults; the choice lives in the
  // game registry so it survives scene.restart(), and in localStorage across reloads.
  preset() {
    const c = COIN_DASH;
    const presets = c.difficulties || {};
    let name = this.registry.get('difficulty');
    if (!presets[name]) {
      try { name = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY); } catch (e) { name = null; }
      if (!presets[name]) name = presets[c.defaultDifficulty] ? c.defaultDifficulty : Object.keys(presets)[0];
      this.registry.set('difficulty', name);
    }
    const base = { droneSpeed: c.droneSpeed, droneCount: c.droneCount,
      playerSpeed: c.playerSpeed, roundSeconds: c.roundSeconds };
    return Object.assign({ name: name || 'Normal' }, base, presets[name]);
  }

  setDifficulty(name) {
    this.registry.set('difficulty', name);
    try { window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, name); } catch (e) { /* storage unavailable */ }
    this.scene.restart();
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  toCss(color) { return '#' + color.toString(16).padStart(6, '0'); }

  // Neon visuals only: physics bodies keep their original sizes, extra shapes just follow them.
  applyNeonStyle() {
    const c = COIN_DASH.colors;
    const W = COIN_DASH.width;
    this.followers = [];
    const follow = (shape, target) => { this.followers.push({ shape, target }); return shape; };

    // Glowing line under the HUD strip (top edge of the play area).
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(c.horizon, 0.08).fillRect(0, 0, W, 44);
    g.lineStyle(6, c.horizon, 0.2).lineBetween(0, 44, W, 44);
    g.lineStyle(2, c.horizon, 0.9).lineBetween(0, 44, W, 44);

    this.hud.setStyle({ font: 'bold 18px monospace', color: this.toCss(c.hud) })
      .setShadow(0, 0, this.toCss(c.hudShadow), 8, true, true).setDepth(5);

    // Player: dark core with a bright neon outline and a soft pulsing halo.
    this.player.setFillStyle(c.player, 0.35).setStrokeStyle(2, c.player, 1).setDepth(4);
    const halo = follow(this.add.rectangle(0, 0, 36, 36, c.playerGlow, 0.18)
      .setStrokeStyle(1, c.playerGlow, 0.5).setDepth(3), this.player);
    follow(this.add.rectangle(0, 0, 8, 8, c.playerGlow, 1).setDepth(4), this.player);
    this.tweens.add({ targets: halo, alpha: 0.45, scale: 1.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Coin: pulsing glow ring plus a "spinning" face (the physics circle itself is never scaled).
    this.coin.setFillStyle(c.coin, 0).setDepth(4);
    const ring = follow(this.add.circle(0, 0, 14, c.coinGlow, 0.15)
      .setStrokeStyle(2, c.coinGlow, 0.7).setDepth(3), this.coin);
    const face = follow(this.add.circle(0, 0, 9, c.coin, 1).setStrokeStyle(2, c.coinShine, 0.8).setDepth(4), this.coin);
    this.tweens.add({ targets: ring, scale: 1.3, alpha: 0.4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: face, scaleX: 0.25, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Drones: neon diamonds with a glow and a bright core, spinning slowly.
    const diamond = (s) => [s / 2, 0, s, s / 2, s / 2, s, 0, s / 2];
    this.drones.getChildren().forEach((drone, i) => {
      drone.setFillStyle(c.drone, 0).setDepth(4);
      const glow = follow(this.add.polygon(0, 0, diamond(40), c.droneGlow, 0.18).setDepth(3), drone);
      const body = follow(this.add.polygon(0, 0, diamond(30), c.drone, 0.85)
        .setStrokeStyle(2, c.droneCore, 0.9).setDepth(4), drone);
      follow(this.add.circle(0, 0, 3, c.droneCore, 1).setDepth(5), drone);
      this.tweens.add({ targets: [glow, body], angle: i % 2 ? -360 : 360, duration: 4000, repeat: -1 });
      this.tweens.add({ targets: glow, alpha: 0.4, duration: 500 + i * 120, yoyo: true, repeat: -1 });
    });

    const sync = () => this.followers.forEach(({ shape, target }) => shape.setPosition(target.x, target.y));
    sync();
    this.events.on('postupdate', sync);
    this.events.once('shutdown', () => this.events.off('postupdate', sync));
  }

  update() {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.difficulty.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s · ${this.difficulty.name}`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 476, 166, c.colors.overlayGlow, 0.18).setDepth(10);
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, c.colors.overlay, 0.95)
      .setStrokeStyle(2, c.colors.overlayBorder, 1).setDepth(10);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.difficulty.name}: ${this.score} coins collected\nPress R to try again`,
      { font: 'bold 24px monospace', color: this.toCss(c.colors.overlayText), align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5).setShadow(0, 0, this.toCss(c.colors.overlayGlow), 10, true, true).setDepth(11);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
