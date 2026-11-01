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
export default function DispatchForm({ job, setJob, masters }: JobFormProps) {
  const set = (value: typeof job.dispatches) =>
    setJob({ ...job, dispatches: value });
  return (
    <>
      <SectionTitle
        number="04"
        title="Component dispatch"
        description="Select a replacement you received, then record its courier and destination."
      />
      {!job.receipts.length && (
        <div className="info-note mb-4">
          Record a replacement receipt before creating a dispatch.
        </div>
      )}
      {job.dispatches.map((d, index) => {
        const update = (k: string, v: unknown) =>
          set(
            job.dispatches.map((x) => (x.id === d.id ? { ...x, [k]: v } : x)),
          );
        return (
          <div className="line-card" key={d.id}>
            <div className="line-heading">
              <strong>Dispatch {index + 1}</strong>
              <RemoveLine
                disabled={Boolean(d.receivedDate || d.installationDate)}
                onClick={() => set(job.dispatches.filter((x) => x.id !== d.id))}
              />
            </div>
            <div className="form-grid">
              <SelectField
                label="Received replacement *"
                required
                value={d.receiptId}
                options={job.receipts.map((r) => ({
                  id: r.id,
                  name: `${label(masters, job.items.find((i) => i.id === r.itemId)?.componentTypeId || "")} · ${r.serial || r.partNumber || r.id.slice(0, 8)} · Qty ${r.quantity}`,
                }))}
                onChange={(v) => update("receiptId", v)}
              />
              <Quantity
                value={d.quantity}
                onChange={(v) => update("quantity", v)}
              />
              <SelectField
                label="Courier *"
                required
                value={d.courierId}
                options={masters.filter((m) => m.type === "couriers")}
                onChange={(v) => update("courierId", v)}
              />
              <TextField
                label="Tracking / reference ID *"
                required
                value={d.reference}
                onChange={(v) => update("reference", v)}
              />
              <TextField
                label="Booked date *"
                type="date"
                required
                value={d.bookedDate}
                onChange={(v) => update("bookedDate", v)}
              />
              <TextField
                label="Actual dispatch date *"
                type="date"
                required
                value={d.sentDate}
                onChange={(v) => update("sentDate", v)}
              />
            </div>
            <TextArea
              label="Delivery address *"
              required
              value={d.address}
              onChange={(v) => update("address", v)}
            />
          </div>
        );
      })}
      {job.receipts.length > 0 && (
        <AddLine
          onClick={() =>
            set([
              ...job.dispatches,
              {
                id: crypto.randomUUID(),
                receiptId: job.receipts[0].id,
                quantity: 1,
                courierId: "",
                reference: "",
                bookedDate: today(),
                sentDate: today(),
                receivedDate: "",
                receivedBy: "",
                address: job.customerAddress,
                installationRequired: true,
                installationDate: "",
                technicianId: "",
                testResult: "",
              },
            ])
          }
        >
          Add component dispatch
        </AddLine>
      )}
    </>
  );
}
