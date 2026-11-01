import { Form } from "react-bootstrap";
import { label } from "../api";
import { Empty } from "../components/UI";
import {
  SectionTitle,
  SelectField,
  TextArea,
  TextField,
  type JobFormProps,
} from "../components/JobFields";
export default function InstallationForm({
  job,
  setJob,
  masters,
}: JobFormProps) {
  return (
    <>
      <SectionTitle
        number="05"
        title="Delivery & installation"
        description="Customer receipt and installation are separate events. Record each dispatch individually."
      />
      {!job.dispatches.length && (
        <Empty title="No dispatches yet">
          Create a component dispatch to record delivery and installation.
        </Empty>
      )}
      {job.dispatches.map((d, index) => {
        const update = (k: string, v: unknown) =>
          setJob({
            ...job,
            dispatches: job.dispatches.map((x) =>
              x.id === d.id ? { ...x, [k]: v } : x,
            ),
          });
        return (
          <div className="line-card" key={d.id}>
            <div className="line-heading">
              <strong>
                Dispatch {index + 1} · {d.reference}
              </strong>
              <span className="text-muted">{label(masters, d.courierId)}</span>
            </div>
            <div className="form-grid">
              <TextField
                label="Customer received date"
                type="date"
                value={d.receivedDate}
                onChange={(v) => update("receivedDate", v)}
              />
              <TextField
                label="Received by"
                value={d.receivedBy}
                onChange={(v) => update("receivedBy", v)}
              />
            </div>
            <Form.Check
              className="check-card"
              id={"installation-" + d.id}
              label="Installation required at customer site"
              checked={d.installationRequired}
              onChange={(e) => update("installationRequired", e.target.checked)}
            />
            {d.installationRequired && (
              <div className="form-grid mt-4">
                <SelectField
                  label="Installation technician"
                  value={d.technicianId}
                  options={masters.filter((m) => m.type === "technicians")}
                  onChange={(v) => update("technicianId", v)}
                />
                <TextField
                  label="Actual installation date"
                  type="date"
                  value={d.installationDate}
                  onChange={(v) => update("installationDate", v)}
                />
                <div className="full-width">
                  <TextArea
                    label="Installation work / test result"
                    value={d.testResult}
                    onChange={(v) => update("testResult", v)}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
