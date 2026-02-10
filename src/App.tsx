import { useMemo, useState } from "react";
import ControlPanel from "./components/ControlPanel";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import MetricsPanel from "./components/MetricsPanel";
import ComponentInfoDrawer from "./components/ComponentInfoDrawer";
import { PRESETS, type PresetKey } from "./data/presets";
import { simulate } from "./utils/simulator";
import type { SimConfig } from "./types/system";
import type { ComponentId } from "./data/componentInfo";

export default function App() {
  const [presetKey, setPresetKey] = useState<PresetKey>("baseline");
  const [config, setConfig] = useState<SimConfig>(PRESETS.baseline.config);

  const sim = useMemo(() => simulate(config), [config]);

  // Drawer state
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoComponent, setInfoComponent] = useState<ComponentId | null>(null);

  const openInfo = (id: ComponentId) => {
    setInfoComponent(id);
    setInfoOpen(true);
  };

  const scrollToSection = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onApplyPreset = (key: PresetKey) => {
    setPresetKey(key);
    setConfig(PRESETS[key].config);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-dot" />
          <div>
            <div className="brand-title">System Design Simulator</div>
            <div className="brand-subtitle">Play with traffic, scale, cache & DB constraints</div>
          </div>
        </div>

        <div className="status">
          <span className={`pill pill-${sim.status}`}>{sim.status.toUpperCase()}</span>
          <div className="status-metrics">
            <div className="kv">
              <span className="k">RPS</span>
              <span className="v">{Math.round(config.rps)}</span>
            </div>
            <div className="kv">
              <span className="k">p95</span>
              <span className="v">{Math.round(sim.latency.p95)} ms</span>
            </div>
            <div className="kv">
              <span className="k">Errors</span>
              <span className="v">{(sim.errors.rate * 100).toFixed(2)}%</span>
            </div>
            <div className="kv">
              <span className="k">Monthly</span>
              <span className="v">${Math.round(sim.cost.monthlyTotal)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="panel">
          <ControlPanel
            presetKey={presetKey}
            presets={PRESETS}
            config={config}
            onApplyPreset={onApplyPreset}
            onChange={setConfig}
            onOpenInfo={openInfo}
          />
        </aside>

        <main className="main">
          <div className="card">
            <div className="card-title">Architecture</div>
            <div className="card-subtitle">
              Click the ⓘ icon on any component to understand what it does and how it impacts the system.
            </div>
            <ArchitectureDiagram sim={sim} config={config} onOpenInfo={openInfo} />
          </div>
        </main>

        <aside className="panel">
          <MetricsPanel sim={sim}
            config={config}
            onJump={scrollToSection} />
        </aside>
      </div>

      <ComponentInfoDrawer
        open={infoOpen}
        componentId={infoComponent}
        onClose={() => setInfoOpen(false)}
        config={config}
        sim={sim}
        onScrollToSection={scrollToSection}
      />
    </div>
  );
}
