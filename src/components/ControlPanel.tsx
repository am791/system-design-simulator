import type { SimConfig } from "../types/system";
import type { PresetKey } from "../data/presets";
import SectionHeader from "./SectionHeader";
import type { ComponentId } from "../data/ComponentInfo";

type Preset = {
  name: string;
  description: string;
  config: SimConfig;
};

export default function ControlPanel(props: {
  presetKey: PresetKey;
  presets: Record<PresetKey, Preset>;
  config: SimConfig;
  onApplyPreset: (k: PresetKey) => void;
  onChange: (c: SimConfig) => void;
  onOpenInfo: (id: ComponentId) => void;
}) {
  const { presets, presetKey, config, onApplyPreset, onChange, onOpenInfo } = props;

  const set = (patch: Partial<SimConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="card">
      <div className="section" id="sec-presets">
        <SectionHeader
          title="Quick presets"
          description="Start with a preset and tweak the knobs."
          infoId="preset_section"
          onOpenInfo={onOpenInfo}
        />

        <div className="btnRow">
          {(Object.keys(presets) as PresetKey[]).map((k) => (
            <button
              key={k}
              className={`btn ${k === presetKey ? "btn-primary" : ""}`}
              onClick={() => onApplyPreset(k)}
              title={presets[k].description}
            >
              {presets[k].name}
            </button>
          ))}
        </div>
      </div>

      <div className="section" id="sec-traffic">
        <SectionHeader
          title="Traffic"
          description="Incoming load characteristics that stress the system."
          infoId="traffic_section"
          onOpenInfo={onOpenInfo}
        />

        <div className="row">
          <div>
            <div className="label">Requests per second</div>
            <div className="help">Total incoming traffic to the system.</div>
          </div>
          <span className="badge">{Math.round(config.rps)} rps</span>
        </div>
        <input
          className="input"
          type="range"
          min={10}
          max={2000}
          step={10}
          value={config.rps}
          onChange={(e) => set({ rps: Number(e.target.value) })}
        />

        <div style={{ height: 10 }} />

        <div className="row">
          <div>
            <div className="label">Read ratio</div>
            <div className="help">0 = all writes, 1 = all reads.</div>
          </div>
          <span className="badge">{Math.round(config.readRatio * 100)}%</span>
        </div>
        <input
          className="input"
          type="range"
          min={0.1}
          max={0.98}
          step={0.01}
          value={config.readRatio}
          onChange={(e) => set({ readRatio: Number(e.target.value) })}
        />

        <div style={{ height: 10 }} />

        <div className="row">
          <div>
            <div className="label">Payload size</div>
            <div className="help">Affects cache efficiency & tail latency.</div>
          </div>
          <span className="badge">{Math.round(config.payloadKB)} KB</span>
        </div>
        <input
          className="input"
          type="range"
          min={2}
          max={200}
          step={1}
          value={config.payloadKB}
          onChange={(e) => set({ payloadKB: Number(e.target.value) })}
        />
      </div>

      <div className="section" id="sec-app">
        <SectionHeader
          title="App tier"
          description="Compute layer: scale instances and per-instance throughput."
          infoId="app_section"
          onOpenInfo={onOpenInfo}
        />

        <div className="grid2">
          <div>
            <div className="row">
              <div className="label">Instances</div>
              <span className="badge">{config.appInstances}</span>
            </div>
            <input
              className="input"
              type="range"
              min={1}
              max={30}
              step={1}
              value={config.appInstances}
              onChange={(e) => set({ appInstances: Number(e.target.value) })}
            />
          </div>

          <div>
            <div className="row">
              <div className="label">RPS / instance</div>
              <span className="badge">{config.appRpsPerInstance}</span>
            </div>
            <input
              className="input"
              type="range"
              min={30}
              max={300}
              step={5}
              value={config.appRpsPerInstance}
              onChange={(e) => set({ appRpsPerInstance: Number(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div className="row">
          <div>
            <div className="label">Autoscaling</div>
            <div className="help">Adds small headroom; not magic.</div>
          </div>
          <button className={`btn ${config.autoscale ? "btn-primary" : ""}`} onClick={() => set({ autoscale: !config.autoscale })}>
            {config.autoscale ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>

      <div className="section" id="sec-cache">
        <SectionHeader
          title="Cache"
          description="Improves read scalability by reducing DB reads."
          infoId="cache_section"
          onOpenInfo={onOpenInfo}
        />

        <div className="row">
          <div>
            <div className="label">Cache enabled</div>
            <div className="help">Improves read scalability, reduces DB load.</div>
          </div>
          <button
            className={`btn ${config.cacheEnabled ? "btn-primary" : ""}`}
            onClick={() => set({ cacheEnabled: !config.cacheEnabled })}
          >
            {config.cacheEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="grid2">
          <div>
            <div className="row">
              <div className="label">Base hit rate</div>
              <span className="badge">{Math.round(config.baseCacheHitRate * 100)}%</span>
            </div>
            <input
              className="input"
              type="range"
              min={0.15}
              max={0.95}
              step={0.01}
              value={config.baseCacheHitRate}
              disabled={!config.cacheEnabled}
              onChange={(e) => set({ baseCacheHitRate: Number(e.target.value) })}
            />
          </div>

          <div>
            <div className="row">
              <div className="label">Cache capacity</div>
              <span className="badge">{Math.round(config.cacheRpsCapacity)} rps</span>
            </div>
            <input
              className="input"
              type="range"
              min={100}
              max={3000}
              step={25}
              value={config.cacheRpsCapacity}
              disabled={!config.cacheEnabled}
              onChange={(e) => set({ cacheRpsCapacity: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="section" id="sec-db">
        <SectionHeader
          title="Database"
          description="Persistence layer; often the hardest bottleneck."
          infoId="db_section"
          onOpenInfo={onOpenInfo}
        />

        <div className="row">
          <div>
            <div className="label">DB enabled</div>
            <div className="help">Turn off to visualize a “no persistence” system.</div>
          </div>
          <button className={`btn ${config.dbEnabled ? "btn-primary" : ""}`} onClick={() => set({ dbEnabled: !config.dbEnabled })}>
            {config.dbEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="row">
          <div>
            <div className="label">DB capacity (QPS)</div>
            <div className="help">Total throughput available for reads/writes.</div>
          </div>
          <span className="badge">{Math.round(config.dbQpsCapacity)} qps</span>
        </div>
        <input
          className="input"
          type="range"
          min={80}
          max={1200}
          step={10}
          value={config.dbQpsCapacity}
          disabled={!config.dbEnabled}
          onChange={(e) => set({ dbQpsCapacity: Number(e.target.value) })}
        />

        <div style={{ height: 10 }} />

        <div className="row">
          <div>
            <div className="label">Write penalty</div>
            <div className="help">Higher means writes slow down DB more.</div>
          </div>
          <span className="badge">{config.dbWritePenalty.toFixed(2)}×</span>
        </div>
        <input
          className="input"
          type="range"
          min={1.0}
          max={2.2}
          step={0.05}
          value={config.dbWritePenalty}
          disabled={!config.dbEnabled}
          onChange={(e) => set({ dbWritePenalty: Number(e.target.value) })}
        />

        <div style={{ height: 10 }} />

        <div className="grid2">
          <div className="row" style={{ marginBottom: 0 }}>
            <div>
              <div className="label">Replication</div>
              <div className="help">Improves read capacity.</div>
            </div>
            <button
              className={`btn ${config.replicationEnabled ? "btn-primary" : ""}`}
              disabled={!config.dbEnabled}
              onClick={() => set({ replicationEnabled: !config.replicationEnabled })}
            >
              {config.replicationEnabled ? "ON" : "OFF"}
            </button>
          </div>

          <div className="row" style={{ marginBottom: 0 }}>
            <div>
              <div className="label">Partitioning</div>
              <div className="help">Improves write capacity.</div>
            </div>
            <button
              className={`btn ${config.partitioningEnabled ? "btn-primary" : ""}`}
              disabled={!config.dbEnabled}
              onClick={() => set({ partitioningEnabled: !config.partitioningEnabled })}
            >
              {config.partitioningEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      <div className="section" id="sec-latency">
        <SectionHeader
          title="Baseline latency"
          description="Minimum latency floor before saturation effects."
          infoId="latency_section"
          onOpenInfo={onOpenInfo}
        />

        <div className="row">
          <div className="label">Base latency</div>
          <span className="badge">{Math.round(config.baseLatencyMs)} ms</span>
        </div>
        <input
          className="input"
          type="range"
          min={10}
          max={180}
          step={1}
          value={config.baseLatencyMs}
          onChange={(e) => set({ baseLatencyMs: Number(e.target.value) })}
        />

        <div className="small" style={{ marginTop: 10 }}>
          Tip: Increase payload, disable cache, or reduce DB QPS to see bottlenecks shift.
        </div>
      </div>
    </div>
  );
}
