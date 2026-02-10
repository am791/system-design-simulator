import type { SimConfig } from "../types/system";

export type PresetKey = "baseline" | "readHeavy" | "writeHeavy" | "spikyTraffic" | "highScale";

type Preset = {
  name: string;
  description: string;
  config: SimConfig;
};

const base: SimConfig = {
  rps: 250,
  readRatio: 0.8,
  payloadKB: 12,

  appInstances: 4,
  appRpsPerInstance: 120,
  autoscale: true,

  cacheEnabled: true,
  baseCacheHitRate: 0.72,
  cacheRpsCapacity: 800,

  dbEnabled: true,
  dbQpsCapacity: 280,
  dbWritePenalty: 1.35,
  replicationEnabled: true,
  partitioningEnabled: false,

  baseLatencyMs: 55,
};

export const PRESETS: Record<PresetKey, Preset> = {
  baseline: {
    name: "Baseline",
    description: "Balanced workload with cache + DB replication.",
    config: base,
  },
  readHeavy: {
    name: "Read-heavy",
    description: "High read ratio; cache helps a lot.",
    config: {
      ...base,
      rps: 500,
      readRatio: 0.92,
      baseCacheHitRate: 0.82,
      appInstances: 6,
      dbQpsCapacity: 320,
    },
  },
  writeHeavy: {
    name: "Write-heavy",
    description: "Writes stress DB; partitioning helps.",
    config: {
      ...base,
      rps: 380,
      readRatio: 0.45,
      baseCacheHitRate: 0.55,
      dbWritePenalty: 1.65,
      partitioningEnabled: true,
      appInstances: 6,
      dbQpsCapacity: 320,
    },
  },
  spikyTraffic: {
    name: "Spiky traffic",
    description: "Short bursts exceed capacity; errors rise quickly.",
    config: {
      ...base,
      rps: 820,
      readRatio: 0.75,
      appInstances: 5,
      baseCacheHitRate: 0.68,
      cacheRpsCapacity: 650,
      dbQpsCapacity: 320,
    },
  },
  highScale: {
    name: "High scale",
    description: "Scaled out app + cache; DB kept stable.",
    config: {
      ...base,
      rps: 1200,
      readRatio: 0.86,
      appInstances: 14,
      cacheRpsCapacity: 2500,
      dbQpsCapacity: 650,
      replicationEnabled: true,
      partitioningEnabled: true,
      baseLatencyMs: 48,
    },
  },
};
