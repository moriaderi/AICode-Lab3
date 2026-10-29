// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: {
    // Neon arcade / synthwave palette.
    background: 0x0d0221, grid: 0x6a2c91, horizon: 0xff2a6d,
    player: 0x05d9e8, playerGlow: 0x00f0ff,
    coin: 0xffd319, coinGlow: 0xff9e00, coinShine: 0xffffff,
    drone: 0xff2a6d, droneGlow: 0xff006e, droneCore: 0xfff1f8,
    hud: 0xf9f871, hudShadow: 0xff2a6d,
    overlay: 0x12052b, overlayBorder: 0x05d9e8, overlayText: 0xfff1f8, overlayGlow: 0xff2a6d
  }
};
