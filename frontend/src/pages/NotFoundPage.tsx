import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="empty-page section-frame">
      <p className="eyebrow">404</p>
      <h1>This page is off the chart.</h1>
      <p>The address does not match a PracticeLab page.</p>
      <Link className="button button-primary" to="/">
        Return home
      </Link>
    </div>
  );
}
