import type { SimConfig, SimResult } from "../types/system";
import RecommendedActions from "./RecommendedActions";
import { COST_MODEL_NOTE } from "../data/notes";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default function MetricsPanel(props: {
  sim: SimResult;
  config: SimConfig;
  onJump: (anchorId: string) => void;
}) {
  const { sim } = props;

  return (
    <div className="card">
      <div className="section">
        <div className="h2">Performance</div>
        <div className="p">Latency and reliability derived from current saturation.</div>

        <table className="table">
          <tbody>
            <tr>
              <td>p50 latency</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{Math.round(sim.latency.p50)} ms</td>
            </tr>
            <tr>
              <td>p95 latency</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{Math.round(sim.latency.p95)} ms</td>
            </tr>
            <tr>
              <td>Error rate</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{(sim.errors.rate * 100).toFixed(2)}%</td>
            </tr>
            <tr>
              <td>Primary issue</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{sim.errors.reason}</td>
            </tr>
          </tbody>
        </table>

        {sim.latency.notes.length > 0 && (
          <div style={{ marginTop: 10 }} className="small">
            <b>Notes:</b>
            <ul style={{ margin: "6px 0 0 16px" }}>
              {sim.latency.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="section">
        <div className="h2">Saturation</div>
        <div className="p">Anything near 100% is risky (tail latency + timeouts).</div>

        <table className="table">
          <tbody>
            <tr>
              <td>App tier</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{pct(sim.saturation.app)}</td>
            </tr>
            <tr>
              <td>Cache</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{pct(sim.saturation.cache)}</td>
            </tr>
            <tr>
              <td>DB</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{pct(sim.saturation.db)}</td>
            </tr>
            <tr>
              <td>Bottleneck</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{sim.saturation.bottleneck.toUpperCase()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="h2">Traffic breakdown</div>
        <div className="p">Reads may be served by cache; misses hit DB.</div>

        <table className="table">
          <tbody>
            <tr>
              <td>Total RPS</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{Math.round(sim.traffic.rps)}</td>
            </tr>
            <tr>
              <td>Reads</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{Math.round(sim.traffic.reads)}</td>
            </tr>
            <tr>
              <td>Writes</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>{Math.round(sim.traffic.writes)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="labelWithInfo">
          <div className="h2">Cost (monthly estimate)</div>
          <button
            className="miniInfoBtn"
            title={COST_MODEL_NOTE}
            aria-label="Cost model note"
          >
            ⓘ
          </button>
        </div>

        {/* <div className="p">Simple cost model (change constants in simulator.ts).</div> */}

        <table className="table">
          <tbody>
            {sim.cost.breakdown.map((b) => (
              <tr key={b.label}>
                <td>{b.label}</td>
                <td style={{ textAlign: "right", fontWeight: 900 }}>${Math.round(b.value)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 900 }}>Total</td>
              <td style={{ textAlign: "right", fontWeight: 900 }}>${Math.round(sim.cost.monthlyTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="small" style={{ marginTop: 10 }}>
          <b>Cost Model Note: </b>
          This simulator uses a simplified cost model to highlight relative trade-offs (scale vs performance vs cost).<br />
          If we want cloud-accurate estimates, we can plug in AWS/GCP pricing tables and instance/DB/cache SKUs as a future enhancement.
        </div>
      </div>

      <RecommendedActions
        sim={props.sim}
        config={props.config}
        onJump={props.onJump}
      />

    </div>
  );
}
