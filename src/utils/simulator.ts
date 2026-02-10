import type { SimConfig, SimResult, SystemStatus } from "../types/system";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function statusFromWorstSat(worst: number): SystemStatus {
  if (worst < 0.75) return "healthy";
  if (worst < 1.0) return "degraded";
  return "overloaded";
}

// Simple cost assumptions (tweak later)
const COST = {
  appInstanceMonthly: 32,     // per instance / month
  cacheMonthly: 55,           // base cache
  cacheScalePerK: 18,         // per 1000 rps capacity
  dbMonthly: 140,             // base db
  dbScalePer100: 35,          // per 100 qps capacity
};

export function simulate(cfg: SimConfig): SimResult {
  const rps = Math.max(0, cfg.rps);
  const reads = rps * clamp(cfg.readRatio, 0, 1);
  const writes = rps - reads;

  // App capacity (autoscale gives you a small headroom bump)
  const appInstances = Math.max(1, cfg.appInstances);
  const appCapacity = appInstances * Math.max(1, cfg.appRpsPerInstance) * (cfg.autoscale ? 1.08 : 1.0);
  const satApp = rps / appCapacity;

  // Cache
  const cacheEnabled = cfg.cacheEnabled;
  const cacheCapacity = Math.max(1, cfg.cacheRpsCapacity);
  const hitRateBase = clamp(cfg.baseCacheHitRate, 0, 0.95);

  // Cache hit rate drops as app saturates & payload grows (very rough)
  const payloadPenalty = clamp((cfg.payloadKB - 8) / 80, 0, 0.25);
  const saturationPenalty = clamp((satApp - 0.7) * 0.22, 0, 0.18);
  const hitRate = cacheEnabled ? clamp(hitRateBase - payloadPenalty - saturationPenalty, 0.1, 0.95) : 0;

  const cacheReads = cacheEnabled ? reads : 0;
  const cacheHits = cacheReads * hitRate;
  const cacheMisses = cacheReads - cacheHits;

  const cacheRps = cacheReads;
  const satCache = cacheEnabled ? cacheRps / cacheCapacity : 0;

  // DB load = writes + cache misses (reads that go through)
  const dbEnabled = cfg.dbEnabled;
  const baseDbCap = Math.max(1, cfg.dbQpsCapacity);
  const readBoost = cfg.replicationEnabled ? 1.35 : 1.0;
  const writeBoost = cfg.partitioningEnabled ? 1.25 : 1.0;

  // Reads and writes affect DB differently; approximate:
  const dbReadLoad = cacheMisses;
  const dbWriteLoad = writes;

  const effReadCap = baseDbCap * readBoost;
  const effWriteCap = baseDbCap * writeBoost;

  // Combine into a single saturation metric using weighted max
  const satDbRead = dbEnabled ? dbReadLoad / effReadCap : 0;
  const satDbWrite = dbEnabled ? dbWriteLoad / effWriteCap : 0;
  const satDb = Math.max(satDbRead, satDbWrite);

  // Bottleneck
  const worst = Math.max(satApp, satCache, satDb);
  const bottleneck = worst === satDb ? "db" : worst === satCache ? "cache" : "app";
  const status = statusFromWorstSat(worst);

  // Latency model (heuristic): base + saturation curve + DB write penalty
  const satCurve = (s: number) => 1 + Math.pow(clamp(s, 0, 2.5), 2) * 0.7; // grows fast after 1.0
  const base = Math.max(5, cfg.baseLatencyMs);

  const appFactor = satCurve(satApp);
  const cacheFactor = cacheEnabled ? satCurve(satCache) * 0.35 + 0.85 : 1.0; // cache usually helps
  const dbFactor = dbEnabled ? satCurve(satDb) : 1.0;

  const writePenalty = 1 + (writes / Math.max(1, rps)) * (Math.max(1, cfg.dbWritePenalty) - 1);
  const p50 = base * appFactor * cacheFactor * dbFactor * writePenalty;

  // p95 increases with tail amplification + worst saturation
  const tailAmp = 1.35 + clamp((worst - 0.7) * 1.25, 0, 1.8);
  const p95 = p50 * tailAmp;

  // Errors model: if overloaded, errors rise quickly; if degraded, small errors
  let errorRate = 0;
  let errorReason = "None";
  if (worst >= 1) {
    errorRate = clamp((worst - 1) * 0.22 + 0.02, 0.02, 0.25);
    errorReason = bottleneck === "db" ? "DB saturation (timeouts)" : bottleneck === "app" ? "App queue overflow" : "Cache saturation";
  } else if (worst >= 0.85) {
    errorRate = clamp((worst - 0.85) * 0.05, 0, 0.03);
    errorReason = "Tail latency spikes";
  }

  const notes: string[] = [];
  if (bottleneck === "db" && satDbWrite > satDbRead) notes.push("Write pressure is dominating DB saturation.");
  if (bottleneck === "db" && satDbRead >= satDbWrite) notes.push("Read pressure (cache misses) is dominating DB saturation.");
  if (!cacheEnabled) notes.push("Cache disabled; DB reads will increase.");
  if (cacheEnabled && hitRate < 0.55) notes.push("Cache hit rate is low; consider bigger cache or better keys.");
  if (cfg.autoscale && satApp > 0.85) notes.push("Autoscaling helps slightly; add instances for more headroom.");

  // Cost model
  const monthlyCompute = appInstances * COST.appInstanceMonthly;
  const monthlyCache = cacheEnabled
    ? COST.cacheMonthly + (cacheCapacity / 1000) * COST.cacheScalePerK
    : 0;

  const monthlyDb = dbEnabled
    ? COST.dbMonthly + (baseDbCap / 100) * COST.dbScalePer100 + (cfg.replicationEnabled ? 55 : 0) + (cfg.partitioningEnabled ? 35 : 0)
    : 0;

  const monthlyTotal = monthlyCompute + monthlyCache + monthlyDb;

  const breakdown = [
    { label: "Compute (App tier)", value: monthlyCompute },
    { label: "Cache", value: monthlyCache },
    { label: "Database", value: monthlyDb },
  ];

  // Diagram nodes/edges/hotspots
  const nodeStatus = (s: number): SystemStatus => (s < 0.75 ? "healthy" : s < 1 ? "degraded" : "overloaded");

  const hotspots: SimResult["diagram"]["hotspots"] = [];
  if (satDb > 0.9) hotspots.push({ label: "DB saturation", severity: satDb > 1 ? "high" : "med" });
  if (cacheEnabled && satCache > 0.9) hotspots.push({ label: "Cache capacity", severity: satCache > 1 ? "high" : "med" });
  if (satApp > 0.9) hotspots.push({ label: "App tier saturation", severity: satApp > 1 ? "high" : "med" });
  if (hotspots.length === 0) hotspots.push({ label: "No hotspots", severity: "low" });

  return {
    status,
    traffic: { rps, reads, writes },
    saturation: {
      app: satApp,
      cache: satCache,
      db: satDb,
      worst,
      bottleneck,
    },
    latency: {
      p50,
      p95,
      notes,
    },
    errors: {
      rate: errorRate,
      reason: errorReason,
    },
    cost: {
      monthlyCompute,
      monthlyCache,
      monthlyDb,
      monthlyTotal,
      breakdown,
    },
    diagram: {
      nodes: [
        {
          id: "client",
          title: "Clients",
          subtitle: "Mobile/Web",
          status: "healthy",
          metrics: [{ k: "RPS", v: String(Math.round(rps)) }],
        },
        {
          id: "lb",
          title: "Load Balancer",
          subtitle: "TLS + routing",
          status: nodeStatus(satApp * 0.85),
          metrics: [{ k: "Tail", v: `${Math.round(p95)} ms` }],
        },
        {
          id: "app",
          title: "App Servers",
          subtitle: `${appInstances} instances`,
          status: nodeStatus(satApp),
          metrics: [
            { k: "Sat", v: `${Math.round(satApp * 100)}%` },
            { k: "Cap", v: `${Math.round(appCapacity)} rps` },
          ],
        },
        {
          id: "cache",
          title: "Cache",
          subtitle: cacheEnabled ? `Hit ${Math.round(hitRate * 100)}%` : "Disabled",
          status: cacheEnabled ? nodeStatus(satCache) : "healthy",
          metrics: cacheEnabled
            ? [
                { k: "Sat", v: `${Math.round(satCache * 100)}%` },
                { k: "Cap", v: `${Math.round(cacheCapacity)} rps` },
              ]
            : [{ k: "Note", v: "—" }],
        },
        {
          id: "db",
          title: "Database",
          subtitle: dbEnabled
            ? `${cfg.replicationEnabled ? "Replicated" : "Single"} · ${cfg.partitioningEnabled ? "Partitioned" : "No partitions"}`
            : "Disabled",
          status: dbEnabled ? nodeStatus(satDb) : "healthy",
          metrics: dbEnabled
            ? [
                { k: "Sat", v: `${Math.round(satDb * 100)}%` },
                { k: "QPS", v: `${Math.round(dbReadLoad + dbWriteLoad)}` },
              ]
            : [{ k: "Note", v: "—" }],
        },
      ],
      edges: [
        { from: "client", to: "lb", label: "HTTP" },
        { from: "lb", to: "app", label: "route" },
        { from: "app", to: "cache", label: cacheEnabled ? "read" : "—" },
        { from: "app", to: "db", label: "write + miss" },
        { from: "cache", to: "db", label: cacheEnabled ? "miss" : "—" },
      ],
      hotspots,
    },
  };
}
