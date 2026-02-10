import { useState } from "react";
import type { SimConfig, SimResult, SystemStatus } from "../types/system";
import type { ComponentId } from "../data/ComponentInfo";

const FLOW_VIZ_ENABLED = false;

function colorFor(status: SystemStatus) {
  if (status === "healthy") return "rgba(22,163,74,0.14)";
  if (status === "degraded") return "rgba(245,158,11,0.16)";
  return "rgba(239,68,68,0.14)";
}

function borderFor(status: SystemStatus) {
  if (status === "healthy") return "rgba(22,163,74,0.28)";
  if (status === "degraded") return "rgba(245,158,11,0.28)";
  return "rgba(239,68,68,0.28)";
}

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

export default function ArchitectureDiagram(props: {
  sim: SimResult;
  config: SimConfig;
  onOpenInfo: (id: ComponentId) => void;
}) {
  const { sim, config, onOpenInfo } = props;
  const [showFlow, setShowFlow] = useState(false);

  type FlowRow = {
    key: string;
    label: string;
    pct: number;          // 0..1
    active: boolean;
    emphasis?: "high" | "med" | "low";
  };

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  const readRatio = clamp01(config.readRatio);
  const writeRatio = 1 - readRatio;

  // derive effective hitRate from sim (preferred) or fallback to baseCacheHitRate
  const cacheNode = sim.diagram.nodes.find((n) => n.id === "cache");
  const hitFromSubtitle =
    cacheNode?.subtitle?.match(/Hit\s(\d+)%/i)?.[1] !== undefined
      ? Number(cacheNode?.subtitle?.match(/Hit\s(\d+)%/i)?.[1]) / 100
      : null;

  const hitRate = config.cacheEnabled ? clamp01(hitFromSubtitle ?? config.baseCacheHitRate) : 0;
  const missRate = config.cacheEnabled ? clamp01(1 - hitRate) : 1;

  // flows
  const flowRows: FlowRow[] = [
    { key: "c-lb", label: "client → lb · http", pct: 1, active: true },
    { key: "lb-app", label: "lb → app · route", pct: 1, active: true },

    // Reads attempt cache only if cache enabled
    {
      key: "app-cache",
      label: "app → cache · read",
      pct: readRatio,
      active: config.cacheEnabled && readRatio > 0,
    },

    // Cache hit serves response (optional row)
    {
      key: "cache-hit",
      label: "cache → app · hit (served)",
      pct: readRatio * (config.cacheEnabled ? hitRate : 0),
      active: config.cacheEnabled && readRatio > 0 && hitRate > 0,
    },

    // Cache miss goes to DB
    {
      key: "cache-db",
      label: "cache → db · miss",
      pct: readRatio * (config.cacheEnabled ? missRate : 1),
      active: readRatio > 0, // even if cache disabled, reads go to DB path effectively
    },

    // Writes go directly to DB
    {
      key: "app-db-write",
      label: "app → db · write",
      pct: writeRatio,
      active: writeRatio > 0,
    },
  ];

  const bottleneck = sim.saturation.bottleneck; // "app" | "cache" | "db"

  const withEmphasis = flowRows.map((r) => {
    // highlight DB-bound flows when DB is bottleneck
    if (bottleneck === "db" && (r.key === "cache-db" || r.key === "app-db-write")) {
      return { ...r, emphasis: "high" as const };
    }
    // highlight cache flow when cache is bottleneck
    if (bottleneck === "cache" && (r.key === "app-cache" || r.key === "cache-db" || r.key === "cache-hit")) {
      return { ...r, emphasis: "med" as const };
    }
    // highlight app route when app bottleneck
    if (bottleneck === "app" && (r.key === "lb-app" || r.key === "c-lb")) {
      return { ...r, emphasis: "med" as const };
    }
    return { ...r, emphasis: "low" as const };
  });


  return (
    <div style={{ marginTop: 12 }}>
      <div className="diagramWrap">
        <div className="nodes">
          {sim.diagram.nodes.map((n) => (
            <div
              key={n.id}
              className="node"
              style={{
                background: colorFor(n.status),
                borderColor: borderFor(n.status),
              }}
            >
              <div className="nodeTop">
                <div>
                  <div className="nodeTitle">{n.title}</div>
                  <div className="nodeSub">{n.subtitle}</div>
                </div>

                <div className="nodeActions">
                  <button
                    className="infoBtn"
                    onClick={() => onOpenInfo(n.id as ComponentId)}
                    title={`About ${n.title}`}
                    aria-label={`Open info for ${n.title}`}
                  >
                    <InfoIcon />
                  </button>

                </div>
              </div>

              <div className="nodeMetrics">
                {n.metrics.map((m, idx) => (
                  <div key={idx} className="nodeMetric">
                    <span className="k">{m.k}</span>
                    <span className="v">{m.v}</span>
                  </div>
                ))}
              </div>

              <div className="nodeMetrics" >
                <span className={`pill pill-${n.status}`}>{n.status}</span>
              </div>

            </div>
          ))}
        </div>

        <div className="flowToggleRow">
          <button
            className={`flowToggleBtn ${showFlow ? "active" : ""}`}
            onClick={() => setShowFlow((v) => !v)}
          >
            {showFlow ? "Hide request flow" : "Explain request flow (coming soon)"}

          </button>
          <div className="flowToggleHint">
            Shows how requests move through tiers (hits vs misses vs writes).
          </div>
        </div>

        {showFlow ? (
  FLOW_VIZ_ENABLED ? (
    <div className="edges">
      {withEmphasis
        .filter((r) => r.active && r.pct > 0.001)
        .map((r) => (
          <div
            key={r.key}
            className={`edge edge-${r.emphasis}`}
            title={`${Math.round(r.pct * 100)}% of total requests`}
          >
            <div className="edgeDot" />
            <div className="edgeLabel">
              {r.label}
              <span className="edgePct">{Math.round(r.pct * 100)}%</span>
            </div>
          </div>
        ))}
    </div>
  ) : (
    <div className="flowComingSoon">
      <div className="flowCSIcon">🧭</div>
      <div className="flowCSTitle">Request flow visualization</div>
      <div className="flowCSDesc">
        Dynamic request paths, percentages, and bottleneck highlighting
        will be available in the next release.
      </div>
    </div>
  )
) : null}
        <div className="hotspots">
          <div className="hotTitle">Hotspots</div>
          <div className="hotRow">
            {sim.diagram.hotspots.map((h, idx) => (
              <span
                key={idx}
                className="hot"
                style={{
                  borderColor:
                    h.severity === "high"
                      ? "rgba(239,68,68,0.35)"
                      : h.severity === "med"
                        ? "rgba(245,158,11,0.35)"
                        : "rgba(22,163,74,0.35)",
                }}
              >
                {h.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .diagramWrap{
          margin-top:12px;
          border:1px solid rgba(11,18,32,0.12);
          border-radius:16px;
          padding:14px;
          background: rgba(255,255,255,0.55);
        }
        .nodes{
          display:grid;
          grid-template-columns: repeat(5, minmax(140px, 1fr));
          gap:12px;
        }
        .node{
          border:1px solid rgba(11,18,32,0.18);
          border-radius:16px;
          padding:12px;
          box-shadow: 0 10px 26px rgba(14,24,44,0.06);
        }
        .nodeTop{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
        }
        .nodeTitle{ font-weight: 900; letter-spacing:-0.015em; }
        .nodeSub{ font-size: 12px; color: rgba(11,18,32,0.62); margin-top: 3px; }
        .nodeActions{
          display:flex;
          flex-direction: column;
          align-items:center;
          gap:8px;
        }
        .infoBtn{
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(11,18,32,0.14);
          background: rgba(255,255,255,0.65);
          cursor: pointer;
          color: rgba(11,18,32,0.78);
          transition: transform 0.08s ease, background 0.12s ease;
        }
        .infoBtn:hover{
          background: rgba(255,255,255,0.92);
          transform: translateY(-1px);
        }
        .infoBtn:active{ transform: translateY(0px); }

        .nodeMetrics{
          margin-top: 10px;
          display:grid;
          gap:6px;
        }
        .nodeMetric{
          display:flex;
          justify-content:space-between;
          gap:12px;
          font-size: 12px;
          padding: 6px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(11,18,32,0.10);
        }
        .nodeMetric .k{ color: rgba(11,18,32,0.62); font-weight:800; }
        .nodeMetric .v{ font-weight:900; }

        .edges{
          margin-top: 12px;
          display:grid;
          gap:8px;
        }
        .edge{
          display:flex;
          align-items:center;
          gap:10px;
          padding: 8px 10px;
          border:1px dashed rgba(11,18,32,0.16);
          border-radius: 14px;
          background: rgba(255,255,255,0.55);
        }
        .edgeLine{
          width: 18px; height: 18px;
          border-radius: 999px;
          background: rgba(79,70,229,0.14);
          border:1px solid rgba(79,70,229,0.22);
        }
        .edgeLabel{
          font-size: 12px;
          color: rgba(11,18,32,0.68);
          text-transform: lowercase;
        }

        .hotspots{
          margin-top:12px;
          padding-top:12px;
          border-top:1px solid rgba(11,18,32,0.10);
        }
        .hotTitle{ font-weight:900; font-size:12px; color: rgba(11,18,32,0.65); margin-bottom:8px; }
        .hotRow{ display:flex; flex-wrap:wrap; gap:8px; }
        .hot{
          font-size: 12px;
          font-weight: 900;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(11,18,32,0.14);
          background: rgba(255,255,255,0.7);
        }
        @media (max-width: 1100px){
          .nodes{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
