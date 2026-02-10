// src/components/RecommendedActions.tsx
import type { SimResult, SimConfig } from "../types/system";
import { getRecommendations } from "../utils/recommendations";

export default function RecommendedActions(props: {
  sim: SimResult;
  config: SimConfig;
  onJump: (anchorId: string) => void;
}) {
  const { sim, config, onJump } = props;
  const recs = getRecommendations(sim, config);

  if (!recs.length) return null;

  return (
    <div className="card recCard">
      <div className="card-title">Recommended actions</div>
      <div className="card-subtitle">
        Based on current bottleneck and saturation
      </div>

      <div className="recList">
        {recs.map((r, idx) => (
          <div key={idx} className="recItem">
            <div className="recHeader">
              <span className="recTitle">{r.title}</span>
              <span className={`pill pill-${sim.status}`}>
                {sim.saturation.bottleneck}
              </span>
            </div>

            <div className="recReason">{r.reason}</div>

            <ul className="recActions">
              {r.actions.map((a, i) => (
                <li key={i}>
                  <button
                    className="recActionBtn"
                    onClick={() => onJump(mapActionToSection(a))}
                  >
                    {a}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Maps action text to ControlPanel section IDs */
function mapActionToSection(action: string) {
  const a = action.toLowerCase();

  if (a.includes("cache")) return "sec-cache";
  if (a.includes("db")) return "sec-db";
  if (a.includes("partition")) return "sec-db";
  if (a.includes("replication")) return "sec-db";
  if (a.includes("instance") || a.includes("app")) return "sec-app";
  if (a.includes("traffic") || a.includes("rate")) return "sec-traffic";

  return "sec-app";
}
