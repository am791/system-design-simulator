export type SystemStatus = "healthy" | "degraded" | "overloaded";

export type SimConfig = {
  // Traffic
  rps: number;          // requests per second total
  readRatio: number;    // 0..1
  payloadKB: number;    // average payload

  // App tier
  appInstances: number;
  appRpsPerInstance: number; // capacity
  autoscale: boolean;

  // Cache
  cacheEnabled: boolean;
  baseCacheHitRate: number; // 0..1
  cacheRpsCapacity: number;

  // DB
  dbEnabled: boolean;
  dbQpsCapacity: number; // reads+writes
  dbWritePenalty: number; // >1 increases latency for writes
  replicationEnabled: boolean; // improves read capacity
  partitioningEnabled: boolean; // improves write capacity

  // Network / base
  baseLatencyMs: number;
};

export type SimResult = {
  status: SystemStatus;

  // Derived throughputs
  traffic: {
    rps: number;
    reads: number;
    writes: number;
  };

  // Saturation [0..>1]
  saturation: {
    app: number;
    cache: number;
    db: number;
    worst: number;
    bottleneck: "app" | "cache" | "db";
  };

  // Latency (ms)
  latency: {
    p50: number;
    p95: number;
    notes: string[];
  };

  // Errors
  errors: {
    rate: number; // 0..1
    reason: string;
  };

  // Costs
  cost: {
    monthlyCompute: number;
    monthlyCache: number;
    monthlyDb: number;
    monthlyTotal: number;
    breakdown: Array<{ label: string; value: number }>;
  };

  // Diagram data
  diagram: {
    nodes: Array<{
      id: string;
      title: string;
      subtitle: string;
      status: SystemStatus;
      metrics: Array<{ k: string; v: string }>;
    }>;
    edges: Array<{ from: string; to: string; label: string }>;
    hotspots: Array<{ label: string; severity: "low" | "med" | "high" }>;
  };
};
