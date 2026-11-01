import type { ReactNode } from "react";
import { Alert, Form, Spinner } from "react-bootstrap";
import { ArrowUpRight, Search } from "lucide-react";
import type { Status } from "../../shared/types";
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function StatusBadge({ status }: { status: Status | string }) {
  return (
    <span
      className={
        "status-badge status-" + status.toLowerCase().replaceAll(" ", "-")
      }
    >
      <span />
      {status}
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ArrowUpRight size={28} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <Spinner size="sm" /> Loading your workspace…
    </div>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <Alert variant="danger" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </Alert>
  ) : null;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <Form.Group className="field">
      <Form.Label>
        {label}
        {children}
      </Form.Label>
      {hint && <Form.Text>{hint}</Form.Text>}
    </Form.Group>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box">
      <Search size={20} />
      <Form.Control
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
