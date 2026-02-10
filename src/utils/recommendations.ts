import type { SimResult, SimConfig } from "../types/system";

export type Recommendation = {
  title: string;
  reason: string;
  actions: string[];
};

export function getRecommendations(sim: SimResult, cfg: SimConfig): Recommendation[] {
  const recs: Recommendation[] = [];
  const { bottleneck, worst } = sim.saturation;

  if (worst < 0.75) {
    recs.push({
      title: "System is healthy",
      reason: "All tiers have sufficient headroom.",
      actions: ["No immediate scaling required", "Monitor traffic growth"],
    });
    return recs;
  }

  if (bottleneck === "app") {
    recs.push({
      title: "App tier is the bottleneck",
      reason: "App saturation is limiting throughput and increasing latency.",
      actions: [
        "Increase app instances",
        "Optimize per-request compute",
        cfg.cacheEnabled ? "Check downstream DB saturation" : "Enable cache for read-heavy traffic",
      ],
    });
  }

  if (bottleneck === "cache") {
    recs.push({
      title: "Cache is saturated",
      reason: "Cache throughput is limiting read scalability.",
      actions: [
        "Increase cache capacity",
        "Improve cache hit rate",
        "Reduce payload size if possible",
      ],
    });
  }

  if (bottleneck === "db") {
    const readHeavy = cfg.readRatio > 0.6;

    recs.push({
      title: "Database is the bottleneck",
      reason: "DB saturation is driving tail latency and errors.",
      actions: readHeavy
        ? [
            "Increase cache hit rate",
            cfg.replicationEnabled ? "Increase DB capacity" : "Enable replication for read scalability",
          ]
        : [
            cfg.partitioningEnabled
              ? "Increase DB capacity"
              : "Enable partitioning to improve write throughput",
            "Reduce write amplification",
          ],
    });
  }

  if (sim.latency.p95 > sim.latency.p50 * 2 && worst < 1.0) {
    recs.push({
      title: "High tail latency detected",
      reason: "p95 is elevated even before full saturation.",
      actions: [
        "Introduce rate limiting or buffering",
        "Reduce request variance",
        "Investigate uneven traffic distribution",
      ],
    });
  }

  return recs;
}
