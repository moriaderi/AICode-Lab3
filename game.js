/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
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
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.applyNeonStyle();
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
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
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
      `${reason}\n${this.score} coins collected\nPress R to try again`,
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
