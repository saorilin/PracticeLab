import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

export function ToolsPage() {
  return (
    <div className="page section-frame">
      <PageHeader
        eyebrow="Practice tools"
        title="Useful before impressive"
        description="Each tool solves one repeatable practice problem and works without an account or saved session."
      />
      <div className="feature-grid two-columns">
        <article className="tool-card">
          <div className="tool-symbol" aria-hidden="true">
            4/4
          </div>
          <p className="eyebrow">Rhythm & speed</p>
          <h2>Metronome</h2>
          <p>Control BPM, subdivisions, accents, volume, and tempo by tapping.</p>
          <Link className="button button-primary" to="/tools/metronome">
            Open metronome
          </Link>
        </article>
        <article className="tool-card">
          <div className="tool-symbol" aria-hidden="true">
            m3
          </div>
          <p className="eyebrow">Ear training</p>
          <h2>Interval trainer</h2>
          <p>Choose the intervals you want to practise and identify two-note questions.</p>
          <Link className="button button-primary" to="/tools/interval-trainer">
            Open trainer
          </Link>
        </article>
      </div>
    </div>
  );
}
