import { Form } from "react-bootstrap";
import { label, today } from "../api";
import {
  AddLine,
  RemoveLine,
  Quantity,
  SectionTitle,
  SelectField,
  TextArea,
  TextField,
  type JobFormProps,
} from "../components/JobFields";
export default function ReplacementForm({
  job,
  setJob,
  masters,
}: JobFormProps) {
  const set = (key: keyof typeof job, value: unknown) =>
    setJob({ ...job, [key]: value });
  return (
    <>
      <SectionTitle
        number="03"
        title="Replacement & repair"
        description="Record only components received. Add separate lines for partial receipts or individual serial numbers."
      />
      {job.receipts.map((r, index) => {
        const update = (k: string, v: unknown) =>
          set(
            "receipts",
            job.receipts.map((x) => (x.id === r.id ? { ...x, [k]: v } : x)),
          );
        return (
          <div className="line-card" key={r.id}>
            <div className="line-heading">
              <strong>Replacement receipt {index + 1}</strong>
              <RemoveLine
                disabled={job.dispatches.some((d) => d.receiptId === r.id)}
                onClick={() =>
                  set(
                    "receipts",
                    job.receipts.filter((x) => x.id !== r.id),
                  )
                }
              />
            </div>
            <div className="form-grid">
              <SelectField
                label="Requested component *"
                required
                value={r.itemId}
                options={job.items.map((i) => ({
                  id: i.id,
                  name: `${label(masters, i.componentTypeId)} · ${i.quantity} requested`,
                }))}
                onChange={(v) => update("itemId", v)}
              />
              <TextField
                label="Replacement received date *"
                type="date"
                required
                value={r.receivedDate}
                onChange={(v) => update("receivedDate", v)}
              />
              <TextField
                label="Replacement part / FRU number"
                value={r.partNumber}
                onChange={(v) => update("partNumber", v)}
              />
              <TextField
                label="Replacement serial number"
                value={r.serial}
                onChange={(v) => update("serial", v)}
              />
              <Quantity
                value={r.quantity}
                onChange={(v) => update("quantity", v)}
              />
            </div>
            <Form.Check
              className="check-card"
              id={"return-" + r.id}
              label="Defective component must be returned to the provider"
              checked={r.returnRequired}
              onChange={(e) => update("returnRequired", e.target.checked)}
            />
            {r.returnRequired && (
              <div className="form-grid mt-3">
                <TextField
                  label="Defective component return date"
                  type="date"
                  value={r.returnSentDate}
                  onChange={(v) => update("returnSentDate", v)}
                />
                <TextField
                  label="Return courier / reference"
                  value={r.returnReference}
                  onChange={(v) => update("returnReference", v)}
                />
              </div>
            )}
          </div>
        );
      })}
      <AddLine
        onClick={() =>
          set("receipts", [
            ...job.receipts,
            {
              id: crypto.randomUUID(),
              itemId: job.items[0]?.id || "",
              quantity: 1,
              partNumber: "",
              serial: "",
              receivedDate: today(),
              returnRequired: false,
              returnSentDate: "",
              returnReference: "",
            },
          ])
        }
      >
        Receive replacement
      </AddLine>
      <div className="section-divider" />
      <TextArea
        label="Service work & quality-check notes"
        value={job.serviceNotes}
        onChange={(v) => set("serviceNotes", v)}
      />
      <Form.Check
        className="check-card"
        id="quality"
        label="Quality check passed — components are ready for dispatch"
        checked={job.qualityPassed}
        onChange={(e) => set("qualityPassed", e.target.checked)}
      />
    </>
  );
}
