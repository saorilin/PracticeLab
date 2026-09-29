import { Link } from "react-router-dom";
import { categoryDescriptions, categoryLabels } from "../lib/constants";
import { categories } from "../types/exercise";

export function HomePage() {
  return (
    <>
      <section className="hero section-frame">
        <div className="hero-copy">
          <p className="eyebrow">A quieter place to practise</p>
          <h1>Build control, one focused session at a time.</h1>
          <p className="lede">
            Use purpose-built tools, then turn musical problems into repeatable exercises you can
            understand and maintain.
          </p>
          <div className="button-row">
            <Link className="button button-primary" to="/tools/metronome">
              Start metronome
            </Link>
            <Link className="button button-secondary" to="/exercises">
              Browse exercises
            </Link>
          </div>
        </div>
        <div className="hero-pulse" role="note" aria-label="Practice reminder">
          <span className="pulse-number">60</span>
          <span>BPM</span>
          <p>Slow enough to notice. Clear enough to improve.</p>
        </div>
      </section>

      <section className="content-section section-frame">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Practice tools</p>
            <h2>Train the signal</h2>
          </div>
          <Link className="text-link" to="/tools">
            View all tools →
          </Link>
        </div>
        <div className="feature-grid two-columns">
          <Link className="feature-card card-brass" to="/tools/metronome">
            <span className="feature-index">01</span>
            <h3>Metronome</h3>
            <p>Tempo, accents, subdivisions, tap tempo, and a clean visual pulse.</p>
          </Link>
          <Link className="feature-card card-wine" to="/tools/interval-trainer">
            <span className="feature-index">02</span>
            <h3>Interval ear trainer</h3>
            <p>Hear two notes, choose the interval, and track your current accuracy.</p>
          </Link>
        </div>
      </section>

      <section className="content-section section-frame">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Exercise library</p>
            <h2>Organise the work</h2>
          </div>
          <Link className="text-link" to="/exercises/new">
            Add custom exercise →
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link key={category} className="category-card" to={`/exercises?category=${category}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{categoryLabels[category]}</h3>
              <p>{categoryDescriptions[category]}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
