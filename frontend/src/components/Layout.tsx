import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/tools", label: "Tools", end: false },
  { to: "/exercises", label: "Exercises", end: false },
];

export function Layout() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="PracticeLab home">
          <span className="brand-mark" aria-hidden="true">
            PL
          </span>
          <span>
            <strong>PracticeLab</strong>
            <small>Focused guitar practice</small>
          </span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>Practice deliberately. Keep the signal clean.</p>
        <p>PracticeLab MVP 0.1</p>
      </footer>
    </div>
  );
}
