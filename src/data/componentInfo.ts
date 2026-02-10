export type ComponentId =
  | "client"
  | "lb"
  | "app"
  | "cache"
  | "db"
  // Control panel sections
  | "preset_section"
  | "traffic_section"
  | "app_section"
  | "cache_section"
  | "db_section"
  | "latency_section";

export type ComponentInfo = {
  id: ComponentId;
  title: string;
  overview: string;
  affects: string[];
  affectedBy: string[];
  symptoms: string[];
  fixes: string[];
  notes?: string[];
};

export const COMPONENT_INFO: Record<ComponentId, ComponentInfo> = {
  // ---------------- Nodes ----------------
  client: {
    id: "client",
    title: "Clients",
    overview:
      "Traffic source for the system. Controls how many requests enter and the read/write mix.",
    affectedBy: ["RPS", "Read ratio", "Payload size"],
    affects: ["Load on App tier", "Cache/DB volume", "Latency & errors once downstream saturates"],
    symptoms: ["Not a bottleneck itself—exposes downstream bottlenecks as load increases"],
    fixes: ["Rate limit", "Smooth bursts (queue)", "Use CDN/edge caching (future extension)"],
    notes: ["This is a simplified single-service traffic model."],
  },

  lb: {
    id: "lb",
    title: "Load Balancer",
    overview:
      "Routes traffic to the app tier. In this simulator, LB effects are represented indirectly through app saturation and tail latency.",
    affectedBy: ["Total RPS", "App tier health"],
    affects: ["Distribution to app tier", "Tail latency under overload"],
    symptoms: ["Usually not the first bottleneck in the simplified model"],
    fixes: ["Fix app/DB bottleneck (LB alone won’t solve it)", "Health checks/circuit breakers (future extension)"],
    notes: ["Real LBs can bottleneck (TLS, conn limits), omitted for simplicity."],
  },

  app: {
    id: "app",
    title: "App Servers",
    overview:
      "Processes requests (compute + business logic). Capacity is driven by instances and per-instance throughput.",
    affectedBy: ["Instances", "RPS per instance", "Autoscaling toggle", "Incoming RPS"],
    affects: ["Latency via queueing", "Downstream load (cache/DB)", "Errors when overloaded"],
    symptoms: ["High saturation → p95 increases early", "Overload → queue overflow/timeouts → errors rise"],
    fixes: ["Add instances", "Increase per-instance capacity (optimize)", "Rate limiting/queueing (future extension)"],
    notes: ["Assumes near-linear scaling with instances."],
  },

  cache: {
    id: "cache",
    title: "Cache",
    overview:
      "Speeds up reads and reduces DB read load. Effectiveness depends on hit rate and cache capacity.",
    affectedBy: ["Cache enabled", "Hit rate", "Cache capacity", "Payload size (can reduce hit rate)"],
    affects: ["DB reads (misses become DB reads)", "Latency (hits fast, misses slow)", "Bottleneck shifts"],
    symptoms: ["Low hit rate → DB saturates", "Cache saturation → cascading misses/timeouts"],
    fixes: ["Increase cache capacity", "Improve hit rate (keys/TTL/warmup)", "Multi-layer caching (future extension)"],
    notes: ["Cache helps reads; doesn’t remove write load from DB."],
  },

  db: {
    id: "db",
    title: "Database",
    overview:
      "Persists data and serves cache-miss reads + writes. Usually hardest to scale and often becomes the bottleneck.",
    affectedBy: [
      "DB capacity (QPS)",
      "Write penalty",
      "Replication (read boost)",
      "Partitioning (write boost)",
      "Cache hit rate (reduces reads)",
    ],
    affects: ["Tail latency strongly near saturation", "Errors (timeouts) when overloaded", "Overall bottleneck"],
    symptoms: ["Near 100% → p95 spikes", "Overload → timeouts → errors", "Scaling app doesn’t fix DB bottleneck"],
    fixes: ["Increase DB capacity", "Replication for reads", "Partitioning for writes", "Improve cache hit rate"],
    notes: ["Real DB bottlenecks include locks, IO, indexes; approximated via QPS + penalties."],
  },

  // ---------------- Control Panel Sections ----------------
  preset_section: {
    id: "preset_section",
    title: "Quick Presets",
    overview:
      "Presets are curated configurations representing common real-world system profiles (baseline, read-heavy, write-heavy, spiky traffic, high-scale).",
    affectedBy: ["Preset selection"],
    affects: ["Updates all knobs at once (traffic + tiers + toggles)"],
    symptoms: ["Using a wrong preset may hide the real bottleneck you want to study"],
    fixes: ["Start with the closest preset then tune one knob at a time"],
    notes: ["Presets are meant for fast exploration and demos."],
  },

  traffic_section: {
    id: "traffic_section",
    title: "Traffic",
    overview:
      "Defines incoming demand characteristics: total throughput (RPS), read/write split, and payload size. These drive load and influence caching efficiency.",
    affectedBy: ["RPS slider", "Read ratio slider", "Payload size slider"],
    affects: [
      "App saturation (direct)",
      "Cache load (reads)",
      "DB load (writes + cache misses)",
      "p95 tail latency and errors as saturation grows",
    ],
    symptoms: ["Increasing RPS usually first reveals the weakest tier", "Spiky/high load causes p95 to climb before p50"],
    fixes: ["Reduce/shape traffic (rate limiting, queues)", "Increase capacity at bottleneck tier", "Improve caching for read-heavy traffic"],
    notes: ["Traffic is modeled uniformly across requests (no endpoint-level mix)."],
  },

  app_section: {
    id: "app_section",
    title: "App Tier",
    overview:
      "Controls compute capacity: number of instances and throughput per instance. App saturation increases latency via queueing and can produce errors when overloaded.",
    affectedBy: ["Instances", "RPS/instance", "Autoscaling toggle"],
    affects: ["Latency p50/p95", "Downstream pressure on cache/DB", "System status"],
    symptoms: ["p95 rises early as app nears saturation", "Overload causes timeouts/queue overflow"],
    fixes: ["Add instances", "Optimize work per request", "Add caching or async processing (future extension)"],
    notes: ["App scaling is not helpful if DB is already the bottleneck."],
  },

  cache_section: {
    id: "cache_section",
    title: "Cache",
    overview:
      "Cache reduces DB reads by serving a fraction of read traffic. Its value is highest in read-heavy systems.",
    affectedBy: ["Cache enabled", "Hit rate", "Cache capacity"],
    affects: ["DB read load", "Latency improvements for reads", "Bottleneck shift toward cache when undersized"],
    symptoms: ["Low hit rate keeps DB hot", "Cache saturation can cause cascading misses/timeouts"],
    fixes: ["Increase cache capacity", "Improve hit rate (key design, TTL, warmup)", "Use layered caches (future extension)"],
    notes: ["In this simplified model cache affects reads, not writes."],
  },

  db_section: {
    id: "db_section",
    title: "Database",
    overview:
      "DB handles writes and read misses. It strongly drives tail latency and errors near saturation.",
    affectedBy: ["DB QPS capacity", "Write penalty", "Replication toggle", "Partitioning toggle"],
    affects: ["p95 latency", "Error rate/timeouts", "Overall bottleneck"],
    symptoms: ["DB saturation causes p95 spikes", "Overload produces timeouts and errors"],
    fixes: ["Scale DB capacity", "Replication for reads", "Partitioning for writes", "Increase cache hit rate"],
    notes: ["This abstracts away IO/locks/indexes into throughput + penalty knobs."],
  },

  latency_section: {
    id: "latency_section",
    title: "Baseline Latency",
    overview:
      "Baseline latency represents network + serialization + base compute cost when the system is not saturated.",
    affectedBy: ["Base latency slider"],
    affects: ["p50 and p95 baseline floor", "Perceived responsiveness even when healthy"],
    symptoms: ["High baseline latency makes the system feel slow even without bottlenecks"],
    fixes: ["Reduce network hops", "Optimize serialization/compression", "Move closer to users/CDN (future extension)"],
    notes: ["Saturation-driven latency is added on top of this baseline."],
  },
};
