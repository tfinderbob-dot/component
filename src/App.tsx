import { useEffect, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Button } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  LayoutDashboard,
  ClipboardList,
  Truck,
  Database,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ArrowUpRight,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import { api, setCsrf } from "./api";
import type { SessionUser } from "../shared/types";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobEditor from "./pages/JobEditor";
import Masters from "./pages/Masters";
import Dispatches from "./pages/Dispatches";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import { Empty, Loading } from "./components/UI";
export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState("demo");
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const cache = useQueryClient();
  useEffect(() => {
    api<{ user: SessionUser; csrf: string; mode: string }>("/auth/me")
      .then((r) => {
        setUser(r.user);
        setMode(r.mode);
        setCsrf(r.csrf);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => setOpen(false), [location.pathname]);
  if (checking) return <Loading />;
  if (!user)
    return (
      <Login
        onLogin={(u, m) => {
          setUser(u);
          setMode(m);
        }}
      />
    );
  const links = [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/jobs", label: "Service jobs", icon: ClipboardList },
    { to: "/dispatches", label: "Delivery & installation", icon: Truck },
    { to: "/masters", label: "Master data", icon: Database },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ];
  return (
    <div className="app-shell">
      <button
        className={"sidebar-scrim " + (open ? "visible" : "")}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Boxes size={26} />
          </span>
          <span>
            component<span className="brand-light">care</span>
            <small>SERVICE OPERATIONS</small>
          </span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} end={to === "/"} to={to}>
              <Icon size={21} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={25} />
          <strong>
            Every component.
            <br />
            Every step, connected.
          </strong>
          <p>
            Independent service centre
            <br />
            for Lenovo products
          </p>
        </div>
        <nav className="sidebar-bottom">
          <NavLink to="/settings">
            <Settings size={20} /> Settings
          </NavLink>
          <button
            onClick={async () => {
              try {
                await api("/auth/logout", { method: "POST" });
                setUser(null);
                cache.clear();
                setCsrf("");
                navigate("/");
              } catch (e) {
                setLogoutError((e as Error).message);
              }
            }}
          >
            <LogOut size={20} /> Sign out
          </button>
          {logoutError && <small role="alert">{logoutError}</small>}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">CA</span>
          <span>
            <strong>Centre admin</strong>
            <small>Administrator</small>
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span className="workspace-dot" /> Service centre{" "}
            <span className="top-divider">/</span>
            <strong>Operations workspace</strong>
          </div>
          <div className="topbar-right">
            <span className={"storage-tag " + mode}>
              {mode === "demo" ? "Demo workspace" : "MySQL connected"}
            </span>
            <span className="avatar light">CA</span>
          </div>
        </header>
        {mode === "demo" && (
          <div className="demo-banner">
            <Wrench size={15} /> Demo mode · sample records are fictional. Your
            changes are saved locally.
            <Link to="/settings">
              Database setup <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/new" element={<JobEditor />} />
            <Route path="/jobs/:id" element={<JobEditor />} />
            <Route path="/dispatches" element={<Dispatches />} />
            <Route path="/masters" element={<Masters />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/settings"
              element={<SettingsPage mode={mode} user={user} />}
            />
            <Route
              path="*"
              element={
                <Empty title="Page not found">
                  <Link to="/">Return to overview</Link>
                </Empty>
              }
            />
          </Routes>
        </main>
        <footer>
          ComponentCare{" "}
          <span>
            Independent service operations · Not an official Lenovo portal
          </span>
        </footer>
      </div>
    </div>
  );
}
