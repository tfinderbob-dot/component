import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import { Database, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { PageHeader, ErrorNotice } from "../components/UI";
import { TextField } from "../components/JobFields";
import type { SessionUser } from "../../shared/types";
export default function SettingsPage({
  mode,
  user,
}: {
  mode: string;
  user: SessionUser;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE PREFERENCES"
        title="Settings"
        description="Your account and database connection."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <span className="metric-icon teal">
            <ShieldCheck />
          </span>
          <h2>Administrator account</h2>
          <p>{user.email}</p>
          <ErrorNotice error={error} />
          {success && <Alert variant="success">Password updated.</Alert>}
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setSuccess(false);
              if (next !== confirm) {
                setError("New passwords do not match.");
                return;
              }
              setBusy(true);
              try {
                await api("/auth/password", {
                  method: "POST",
                  body: JSON.stringify({ current, next }),
                });
                setCurrent("");
                setNext("");
                setConfirm("");
                setSuccess(true);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <TextField
              label="Current password"
              type="password"
              required
              value={current}
              onChange={setCurrent}
            />
            <TextField
              label="New password (at least 10 characters)"
              type="password"
              required
              value={next}
              onChange={setNext}
            />
            <TextField
              label="Confirm new password"
              type="password"
              required
              value={confirm}
              onChange={setConfirm}
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </Form>
        </section>
        <section className="panel settings-panel">
          <span className="metric-icon blue">
            <Database />
          </span>
          <h2>Database connection</h2>
          <span className={"storage-tag " + mode}>
            {mode === "demo" ? "Local demo storage" : "MySQL storage"}
          </span>
          <p className="mt-4">
            {mode === "demo"
              ? "This workspace uses a local JSON file. Sample records are fictional and edits persist on this computer."
              : "This workspace reads and writes to the configured MySQL database."}
          </p>
          <h3>Connect your MySQL database</h3>
          <ol className="setup-list">
            <li>Create an empty database and a dedicated database user.</li>
            <li>
              Copy <code>.env.example</code> to <code>.env</code> and set the
              MySQL connection values.
            </li>
            <li>
              Set <code>STORAGE_MODE=mysql</code> and a strong{" "}
              <code>ADMIN_PASSWORD</code>.
            </li>
            <li>
              Run <code>npm run db:init</code>, then restart the application.
            </li>
          </ol>
          <p className="text-muted">
            MySQL starts with categories, component types and your administrator
            account. Demo jobs are not copied automatically. See README.md for
            setup and deployment details.
          </p>
        </section>
      </div>
    </>
  );
}
