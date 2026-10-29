// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  soundVolume: 0.15, // 0 disables the coin sound
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};

// Difficulty presets (keys 1 / 2 / 3). Normal matches the top-level values above,
// so the default game is unchanged. Kept outside the object literal to leave `colors` untouched.
window.COIN_DASH.defaultDifficulty = 'Normal';
window.COIN_DASH.difficulties = {
  Easy: { droneSpeed: 75, droneCount: 2, playerSpeed: 250, roundSeconds: 50 },
  Normal: { droneSpeed: 105, droneCount: 3, playerSpeed: 240, roundSeconds: 45 },
  Hard: { droneSpeed: 150, droneCount: 5, playerSpeed: 240, roundSeconds: 40 }
};
