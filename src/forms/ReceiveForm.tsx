import { Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useJobs, label } from "../api";
import ComponentSpecFields from "./ComponentSpecFields";
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
export default function ReceiveForm({ job, setJob, masters }: JobFormProps) {
  const history = useJobs();
  const previous = history.data?.find(
    (j) =>
      j.id !== job.id &&
      j.deviceSerial.toUpperCase() === job.deviceSerial.trim().toUpperCase(),
  );
  const set = (key: keyof typeof job, value: unknown) =>
    setJob({ ...job, [key]: value });
  return (
    <>
      <SectionTitle
        number="01"
        title="Customer & device"
        description="The parent device identifies the claim. Its components are tracked below."
      />
      {previous && (
        <div className="device-history-note">
          <div>
            <strong>Device found in service history</strong>
            <p>
              {label(masters, previous.customerId)} · {previous.number} ·{" "}
              {previous.status}
            </p>
          </div>
          {!job.id && previous.status === "Completed" ? (
            <Button
              variant="outline-primary"
              onClick={() =>
                setJob({
                  ...job,
                  customerId: previous.customerId,
                  customerAddress: previous.customerAddress,
                  modelId: previous.modelId,
                  actualSpecs: previous.actualSpecs,
                  warranty: previous.warranty,
                  warrantyEnd: previous.warrantyEnd,
                  warrantyVerified: false,
                })
              }
            >
              Reuse device details
            </Button>
          ) : (
            <Link to={"/jobs/" + previous.id}>Open previous job</Link>
          )}
        </div>
      )}
      <div className="form-grid">
        <SelectField
          label="Customer / site *"
          value={job.customerId}
          required
          options={masters.filter((m) => m.type === "customers")}
          onChange={(v) => {
            const c = masters.find((x) => x.id === v);
            setJob({
              ...job,
              customerId: v,
              customerAddress: c?.address || "",
            });
          }}
        />
        <TextField
          label="Request date *"
          type="date"
          required
          value={job.receivedDate}
          onChange={(v) => set("receivedDate", v)}
        />
        <SelectField
          label="Product model *"
          required
          value={job.modelId}
          options={masters
            .filter((m) => m.type === "models")
            .map((m) => ({ ...m, name: `${m.name} · ${m.modelNumber}` }))}
          onChange={(v) => {
            const model = masters.find((m) => m.id === v);
            setJob({
              ...job,
              modelId: v,
              actualSpecs: model?.specs || "",
              deviceSerial: model?.serialNumber || "",
            });
          }}
        />
        <TextField
          label="Device serial number *"
          hint="Filled from Product Models when available. Check or change it for this device."
          required
          value={job.deviceSerial}
          onChange={(v) => set("deviceSerial", v)}
        />
        <TextArea
          label="Actual device specifications"
          value={job.actualSpecs}
          onChange={(v) => set("actualSpecs", v)}
        />
        <TextArea
          label="Delivery / installation address *"
          required
          value={job.customerAddress}
          onChange={(v) => set("customerAddress", v)}
        />
        <SelectField
          label="Warranty status *"
          value={job.warranty}
          onChange={(v) => set("warranty", v)}
          options={["Under warranty", "Out of warranty", "Unconfirmed"].map(
            (s) => ({ id: s, name: s }),
          )}
        />
        <TextField
          label="Warranty end date"
          type="date"
          value={job.warrantyEnd}
          onChange={(v) => set("warrantyEnd", v)}
        />
        <SelectField
          label="Priority"
          value={job.priority}
          onChange={(v) => set("priority", v)}
          options={["Normal", "High", "Urgent"].map((s) => ({
            id: s,
            name: s,
          }))}
        />
        <div className="inline-help">
          Missing a customer or model?{" "}
          <Link to="/masters" target="_blank">
            Add master data in a new tab
          </Link>
          , then use Refresh masters above.
        </div>
      </div>
      <TextArea
        label="Customer-reported issue *"
        required
        value={job.complaint}
        onChange={(v) => set("complaint", v)}
      />
      <div className="section-divider" />
      <SectionTitle
        number="02"
        title="Requested components"
        description="Add each faulty component. For a monitor, select Whole monitor."
      />
      {job.items.map((item, index) => {
        const update = (key: string, value: unknown) =>
          set(
            "items",
            job.items.map((i) =>
              i.id === item.id ? { ...i, [key]: value } : i,
            ),
          );
        const used =
          job.claims.some((c) => c.itemId === item.id) ||
          job.receipts.some((r) => r.itemId === item.id);
        return (
          <div className="line-card" key={item.id}>
            <div className="line-heading">
              <strong>Component {index + 1}</strong>
              <RemoveLine
                disabled={used || job.items.length === 1}
                onClick={() =>
                  set(
                    "items",
                    job.items.filter((i) => i.id !== item.id),
                  )
                }
              />
            </div>
            <div className="form-grid">
              <SelectField
                label="Component type *"
                required
                value={item.componentTypeId}
                options={masters.filter((m) => m.type === "componentTypes")}
                onChange={(v) =>
                  set(
                    "items",
                    job.items.map((i) =>
                      i.id === item.id
                        ? {
                            ...i,
                            componentTypeId: v,
                            partId: "",
                            componentSpecs: {},
                          }
                        : i,
                    ),
                  )
                }
              />
              <SelectField
                label="Catalogue part (optional)"
                hint="Select a specific part from your Parts catalogue, such as 16 GB DDR4 RAM with its part/FRU number. Leave blank if unknown."
                value={item.partId}
                options={masters.filter(
                  (m) =>
                    m.type === "parts" &&
                    m.componentTypeId === item.componentTypeId &&
                    (!m.compatibleModelIds?.length ||
                      m.compatibleModelIds.includes(job.modelId)),
                )}
                onChange={(v) =>
                  set(
                    "items",
                    job.items.map((i) =>
                      i.id === item.id
                        ? {
                            ...i,
                            partId: v,
                            componentSpecs: structuredClone(
                              masters.find((m) => m.id === v)?.componentSpecs ||
                                {},
                            ),
                          }
                        : i,
                    ),
                  )
                }
              />
              <ComponentSpecFields
                componentName={
                  masters.find((m) => m.id === item.componentTypeId)?.name || ""
                }
                value={item.componentSpecs}
                onChange={(v) => update("componentSpecs", v)}
              />
              <Quantity
                value={item.quantity}
                onChange={(v) => update("quantity", v)}
              />
              <TextField
                label="Faulty component serial number"
                value={item.faultySerial}
                onChange={(v) => update("faultySerial", v)}
              />
              <TextField
                label="Faulty component physically received on"
                type="date"
                value={item.faultyReceivedDate}
                onChange={(v) => update("faultyReceivedDate", v)}
                hint="Leave blank if the faulty item is still at the customer site."
              />
              <TextArea
                label="Component fault *"
                required
                value={item.fault}
                onChange={(v) => update("fault", v)}
              />
            </div>
          </div>
        );
      })}
      <AddLine
        onClick={() =>
          set("items", [
            ...job.items,
            {
              id: crypto.randomUUID(),
              componentTypeId: "",
              partId: "",
              quantity: 1,
              fault: "",
              faultySerial: "",
              faultyReceivedDate: "",
            },
          ])
        }
      >
        Add component
      </AddLine>
    </>
  );
}
