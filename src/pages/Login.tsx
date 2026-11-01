import { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { ArrowRight, Boxes, Check, ShieldCheck } from "lucide-react";
import { api, setCsrf } from "../api";
import { ErrorNotice, Field } from "../components/UI";
import type { SessionUser } from "../../shared/types";
export default function Login({
  onLogin,
}: {
  onLogin: (u: SessionUser, mode: string) => void;
}) {
  const [mode, setMode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ mode: string }>("/health")
      .then((r) => {
        setMode(r.mode);
        if (r.mode === "demo") setEmail("admin@componentcare.local");
      })
      .catch(() =>
        setError("The API is unavailable. Start the server and try again."),
      );
  }, []);
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Boxes />
          </span>
          componentcare
        </div>
        <span className="eyebrow">A BETTER WAY TO RUN SERVICE</span>
        <h1>
          Small components.
          <br />
          <span>Complete control.</span>
        </h1>
        <p>
          One connected workspace for claims, replacements, delivery and
          installation.
        </p>
        <div className="login-flow">
          {[
            "Receive a request",
            "Manage the replacement",
            "Deliver with confidence",
          ].map((s, i) => (
            <div key={s}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s}
              <Check size={20} />
            </div>
          ))}
        </div>
        <div className="login-foot">
          <ShieldCheck size={20} /> Built for independent Lenovo service
          centres.
        </div>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">YOUR SERVICE WORKSPACE</span>
          <h2>Welcome back.</h2>
          <p>Sign in to keep every service request moving.</p>
          <ErrorNotice error={error} />
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const r = await api<{
                  user: SessionUser;
                  csrf: string;
                  mode: string;
                }>("/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email, password }),
                });
                setCsrf(r.csrf);
                onLogin(r.user, r.mode);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email address">
              <Form.Control
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <Form.Control
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" className="w-100 mt-3" disabled={busy}>
              {busy ? "Signing in…" : "Open workspace"}
              <ArrowRight size={18} />
            </Button>
          </Form>
          {mode === "demo" && (
            <div className="demo-login">
              <strong>Try the demo</strong>
              <p>
                admin@componentcare.local
                <br />
                Password: <code>Demo@12345</code>
              </p>
              <button
                onClick={() => {
                  setEmail("admin@componentcare.local");
                  setPassword("Demo@12345");
                }}
              >
                Fill demo credentials <ArrowRight size={15} />
              </button>
            </div>
          )}
          <small className="text-muted">
            Independent service centre software. No direct manufacturer
            connection.
          </small>
        </div>
      </section>
    </div>
  );
}
