import { useEffect, useMemo } from "react";
import { COMPONENT_INFO, type ComponentId } from "../data/ComponentInfo";
import type { SimConfig, SimResult } from "../types/system";

function InfoIcon(props: { size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-18a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M12 10.6a1 1 0 0 0-1 1V17a1 1 0 0 0 2 0v-5.4a1 1 0 0 0-1-1Zm0-3.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Map each "info id" to a ControlPanel section anchor
const CONTROL_ANCHORS: Partial<Record<ComponentId, string>> = {
  preset_section: "sec-presets",
  traffic_section: "sec-traffic",
  app_section: "sec-app",
  cache_section: "sec-cache",
  db_section: "sec-db",
  latency_section: "sec-latency",

  // Node info can link to relevant knobs too:
  client: "sec-traffic",
  lb: "sec-app",
  app: "sec-app",
  cache: "sec-cache",
  db: "sec-db",
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function fmtMs(n: number) {
  return `${Math.round(n)} ms`;
}

function fmtMoney(n: number) {
  return `$${Math.round(n)}`;
}

export default function ComponentInfoDrawer(props: {
  open: boolean;
  componentId: ComponentId | null;
  onClose: () => void;
  // For live values (#4)
  config: SimConfig;
  sim: SimResult;
  // For related-controls quick links (#3)
  onScrollToSection: (anchorId: string) => void;
}) {
  const { open, componentId, onClose, sim, config, onScrollToSection } = props;

  // #1 ESC closes
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const info = useMemo(() => {
    if (!componentId) return null;
    return COMPONENT_INFO[componentId];
  }, [componentId]);

  if (!open || !componentId || !info) return null;

  const anchorId = CONTROL_ANCHORS[componentId];
  const live = buildLiveMetrics(componentId, sim, config);

  return (
    // #2 Click outside closes: overlay handles clicks, drawer stops propagation
    <div
      className="drawerOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onClose()}
    >
      <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawerHeader">
          <div className="drawerTitle">
            <span className="drawerIcon">
              <InfoIcon size={18} />
            </span>
            <span>{info.title}</span>
          </div>

          <button className="drawerCloseBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="drawerBody">
          {/* #4 live values */}
          {live.length > 0 ? (
            <div className="drawerBlock">
              <div className="drawerH">Live values (current simulation)</div>
              <div className="drawerChips">
                {live.map((x) => (
                  <span key={x.k} className="drawerChip">
                    <span className="k">{x.k}</span>
                    <span className="v">{x.v}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Overview */}
          <div className="drawerBlock">
            <div className="drawerH">Overview</div>
            <div className="drawerP">{info.overview}</div>

            {/* #3 Related controls quick link */}
            {anchorId ? (
              <div style={{ marginTop: 10 }}>
                <button
                  className="drawerLinkBtn"
                  onClick={() => {onScrollToSection(anchorId); onClose(); }}
                >
                  Jump to related controls →
                </button>
              </div>
            ) : null}
          </div>

          <div className="drawerGrid">
            <div className="drawerBlock">
              <div className="drawerH">Affected by</div>
              <ul className="drawerList">
                {info.affectedBy.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>

            <div className="drawerBlock">
              <div className="drawerH">Affects</div>
              <ul className="drawerList">
                {info.affects.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="drawerGrid">
            <div className="drawerBlock">
              <div className="drawerH">Symptoms when it’s the bottleneck</div>
              <ul className="drawerList">
                {info.symptoms.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>

            <div className="drawerBlock">
              <div className="drawerH">Typical fixes</div>
              <ul className="drawerList">
                {info.fixes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>

          {info.notes?.length ? (
            <div className="drawerBlock">
              <div className="drawerH">Notes</div>
              <ul className="drawerList">
                {info.notes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildLiveMetrics(id: ComponentId, sim: SimResult, cfg: SimConfig) {
  const base = [
    { k: "Status", v: sim.status.toUpperCase() },
    { k: "RPS", v: String(Math.round(cfg.rps)) },
    { k: "p95", v: fmtMs(sim.latency.p95) },
    { k: "Errors", v: `${(sim.errors.rate * 100).toFixed(2)}%` },
    { k: "Monthly", v: fmtMoney(sim.cost.monthlyTotal) },
  ];

  const sat = sim.saturation;

  switch (id) {
    case "client":
    case "traffic_section":
      return [
        ...base,
        { k: "Reads", v: String(Math.round(sim.traffic.reads)) },
        { k: "Writes", v: String(Math.round(sim.traffic.writes)) },
        { k: "Payload", v: `${Math.round(cfg.payloadKB)} KB` },
      ];

    case "app":
    case "app_section":
      return [
        ...base,
        { k: "App sat", v: pct(sat.app) },
        { k: "Instances", v: String(cfg.appInstances) },
        { k: "RPS/inst", v: String(cfg.appRpsPerInstance) },
        { k: "Autoscale", v: cfg.autoscale ? "ON" : "OFF" },
      ];

    case "cache":
    case "cache_section": {
      const cacheNode = sim.diagram.nodes.find((n) => n.id === "cache");
      const hit = cacheNode?.subtitle?.match(/Hit\s(\d+)%/i)?.[1]; // from subtitle like "Hit 72%"
      return [
        ...base,
        { k: "Cache sat", v: pct(sat.cache) },
        { k: "Enabled", v: cfg.cacheEnabled ? "ON" : "OFF" },
        { k: "Hit rate", v: cfg.cacheEnabled ? `${hit ?? Math.round(cfg.baseCacheHitRate * 100)}%` : "—" },
        { k: "Cap", v: `${Math.round(cfg.cacheRpsCapacity)} rps` },
      ];
    }

    case "db":
    case "db_section":
      return [
        ...base,
        { k: "DB sat", v: pct(sat.db) },
        { k: "DB cap", v: `${Math.round(cfg.dbQpsCapacity)} qps` },
        { k: "Write penalty", v: `${cfg.dbWritePenalty.toFixed(2)}×` },
        { k: "Replication", v: cfg.replicationEnabled ? "ON" : "OFF" },
        { k: "Partitioning", v: cfg.partitioningEnabled ? "ON" : "OFF" },
      ];

    case "lb":
      return [
        ...base,
        { k: "Bottleneck", v: sat.bottleneck.toUpperCase() },
        { k: "Worst sat", v: pct(sat.worst) },
      ];

    case "latency_section":
      return [
        ...base,
        { k: "Base latency", v: fmtMs(cfg.baseLatencyMs) },
        { k: "p50", v: fmtMs(sim.latency.p50) },
        { k: "p95", v: fmtMs(sim.latency.p95) },
      ];

    case "preset_section":
      return base;

    default:
      return base;
  }
}
