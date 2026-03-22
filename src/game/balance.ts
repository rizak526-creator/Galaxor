export const BALANCE = {
  level: {
    divisor: 390,
    rewardPerLevel: 170,
  },
  tick: {
    passiveMs: 3000,
    energyMs: 10000,
  },
  offline: {
    maxMs: 24 * 60 * 60 * 1000,
    boost: 1.5,
  },
  drops: {
    baseEnergyChance: 0.05,
    harvesterStardustPerLevel: 0.42,
    anomalyStardustBonus: 2.2,
  },
  shop: {
    passive: { base: 85, power: 1.4, passiveAdd: 0.5, multiplierAdd: 0.33 },
    tap: { base: 120, power: 1.34, tapAdd: 1 },
    energy: { base: 240, power: 1.58, multiplierAdd: 0.35 },
    rare: { base: 660, power: 1.32, chanceAdd: 0.4 },
  },
  missions: {
    tapsGoal: 200,
    crystalsGoal: 500,
    upgradesGoal: 2,
    tapRewardBase: 100,
    tapRewardPerLevel: 22,
    upgradesRewardBase: 200,
    upgradesRewardPerLevel: 26,
    energyRewardPerLevelStep: 14,
  },
  events: {
    minDelayMin: 5,
    maxDelayMin: 15,
    triggerChance: 0.27,
    meteorDurationMs: 60_000,
    anomalyDurationMs: 60_000,
    meteorTapMultiplier: 2,
    anomalyPassiveMultiplier: 0.5,
    meteorRoll: 0.34,
    anomalyRoll: 0.68,
  },
  ships: {
    mining: { base: 210, growth: 1.68 },
    explorer: { base: 250, growth: 1.7 },
    harvester: { base: 290, growth: 1.73 },
    passivePerLevel: 1.2,
  },
  expedition: {
    rewardBaseFactor: 48,
    energyDivider: 3,
    stardustDivider: 6,
    artifactChance: 0.1,
  },
  daily: {
    rewardPerLevel: 50,
    cooldownMs: 24 * 60 * 60 * 1000,
  },
} as const
