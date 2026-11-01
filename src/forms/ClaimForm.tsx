import { Form } from "react-bootstrap";
import { label, today } from "../api";
import {
  AddLine,
  RemoveLine,
  SectionTitle,
  SelectField,
  TextArea,
  TextField,
  type JobFormProps,
} from "../components/JobFields";
export default function ClaimForm({ job, setJob, masters }: JobFormProps) {
  const set = (key: keyof typeof job, value: unknown) =>
    setJob({ ...job, [key]: value });
  return (
    <>
      <SectionTitle
        number="02"
        title="Inspection & claim"
        description="Record the diagnosis and your service partner's claim reference."
      />
      <TextArea
        label="Diagnosis & findings"
        value={job.diagnosis}
        onChange={(v) => set("diagnosis", v)}
      />
      <Form.Check
        className="check-card"
        id="warranty-verified"
        label="Warranty verified with the service provider"
        checked={job.warrantyVerified}
        onChange={(e) => set("warrantyVerified", e.target.checked)}
      />
      <Form.Check
        className="check-card"
        id="authorized"
        label="Customer has authorized the service / replacement"
        checked={job.authorized}
        onChange={(e) => set("authorized", e.target.checked)}
      />
      {job.warranty === "Out of warranty" ? (
        <div className="info-note">
          This is a non-warranty request. Record service work in Replacement &
          repair. Existing claim lines, if any, must be removed before saving
          this route.
        </div>
      ) : (
        <p className="text-muted mt-4">
          You can save a draft claim before verification. Submission requires
          verified warranty, a reference and a date.
        </p>
      )}
      {job.claims.map((c, index) => {
        const update = (k: string, v: string) =>
          set(
            "claims",
            job.claims.map((x) => (x.id === c.id ? { ...x, [k]: v } : x)),
          );
        return (
          <div className="line-card" key={c.id}>
            <div className="line-heading">
              <strong>Claim {index + 1}</strong>
              <RemoveLine
                onClick={() =>
                  set(
                    "claims",
                    job.claims.filter((x) => x.id !== c.id),
                  )
                }
              />
            </div>
            <div className="form-grid">
              <SelectField
                label="Requested component *"
                required
                value={c.itemId}
                options={job.items.map((i) => ({
                  id: i.id,
                  name: `${label(masters, i.componentTypeId)} · ${i.fault}`,
                }))}
                onChange={(v) => update("itemId", v)}
              />
              <SelectField
                label="Service provider *"
                required
                value={c.providerId}
                options={masters.filter((m) => m.type === "providers")}
                onChange={(v) => update("providerId", v)}
              />
              <TextField
                label="Provider claim reference"
                value={c.reference}
                onChange={(v) => update("reference", v)}
              />
              <TextField
                label="Submitted date"
                type="date"
                value={c.submittedDate}
                onChange={(v) => update("submittedDate", v)}
              />
              <SelectField
                label="Claim status"
                value={c.status}
                options={[
                  "Draft",
                  "Submitted",
                  "Approved",
                  "Rejected",
                  "Fulfilled",
                ].map((s) => ({ id: s, name: s }))}
                onChange={(v) => update("status", v)}
              />
              <TextArea
                label="Provider response / notes"
                value={c.notes}
                onChange={(v) => update("notes", v)}
              />
            </div>
          </div>
        );
      })}
      {job.warranty !== "Out of warranty" && (
        <AddLine
          onClick={() =>
            set("claims", [
              ...job.claims,
              {
                id: crypto.randomUUID(),
                itemId: job.items[0]?.id || "",
                providerId: "",
                reference: "",
                submittedDate: "",
                status: "Draft",
                notes: "",
              },
            ])
          }
        >
          Add warranty claim
        </AddLine>
      )}
    </>
  );
}
