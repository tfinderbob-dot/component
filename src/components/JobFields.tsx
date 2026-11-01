import { Form, Button } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "./UI";
import type { Job, Master } from "../../shared/types";
export interface JobFormProps {
  job: Job;
  setJob: (j: Job) => void;
  masters: Master[];
}
export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Form.Control
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: { id: string; name: string; active?: boolean }[];
  required?: boolean;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Form.Select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {options
          .filter((x) => x.active !== false || x.id === value)
          .map((x) => (
            <option value={x.id} key={x.id}>
              {x.name}
              {x.active === false ? " (inactive)" : ""}
            </option>
          ))}
      </Form.Select>
    </Field>
  );
}
export function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <Form.Control
        as="textarea"
        rows={3}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
export function Quantity({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field label="Quantity">
      <Form.Control
        type="number"
        required
        min={1}
        max={10000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
export function SectionTitle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="form-section-title">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
export function AddLine({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="outline-primary" onClick={onClick}>
      <Plus size={18} />
      {children}
    </Button>
  );
}
export function RemoveLine({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="link"
      className="remove-line"
      onClick={onClick}
      disabled={disabled}
      aria-label="Remove line"
    >
      <Trash2 size={18} /> Remove
    </Button>
  );
}
