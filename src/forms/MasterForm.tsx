import { Form } from "react-bootstrap";
import type { Master } from "../../shared/types";
import { SelectField, TextArea, TextField } from "../components/JobFields";
import { Field } from "../components/UI";
import ComponentSpecFields from "./ComponentSpecFields";
export default function MasterForm({
  value,
  onChange,
  masters,
}: {
  value: Master;
  onChange: (m: Master) => void;
  masters: Master[];
}) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });
  const contact = [
    "customers",
    "providers",
    "couriers",
    "technicians",
  ].includes(value.type);
  return (
    <>
      <TextField
        label={value.type === "customers" ? "Customer / site name *" : "Name *"}
        required
        value={value.name}
        onChange={(v) => set("name", v)}
      />
      {value.type === "models" && (
        <>
          <SelectField
            label="Product category *"
            required
            value={value.categoryId || ""}
            options={masters.filter((m) => m.type === "categories")}
            onChange={(v) => set("categoryId", v)}
          />
          <TextField
            label="Model number / machine type *"
            required
            value={value.modelNumber || ""}
            onChange={(v) => set("modelNumber", v)}
          />
          <TextArea
            label="Default specifications"
            value={value.specs || ""}
            onChange={(v) => set("specs", v)}
          />
          <TextField
            label="Device serial number (optional)"
            value={value.serialNumber || ""}
            onChange={(v) => set("serialNumber", v)}
            hint="Auto-fills on new jobs. Leave blank for a common model used by multiple devices; each physical device has its own serial number."
          />
          <p className="text-muted">
            These specifications fill automatically on new requests. Existing
            jobs keep their actual configuration.
          </p>
        </>
      )}
      {value.type === "parts" && (
        <>
          <SelectField
            label="Component type *"
            required
            value={value.componentTypeId || ""}
            options={masters.filter((m) => m.type === "componentTypes")}
            onChange={(v) =>
              onChange({ ...value, componentTypeId: v, componentSpecs: {} })
            }
          />
          <div className="form-grid">
            <TextField
              label="Part number *"
              required
              value={value.partNumber || ""}
              onChange={(v) => set("partNumber", v)}
            />
            <TextField
              label="FRU number"
              value={value.fruNumber || ""}
              onChange={(v) => set("fruNumber", v)}
            />
          </div>
          <TextArea
            label="Part specifications"
            value={value.specs || ""}
            onChange={(v) => set("specs", v)}
          />
          <ComponentSpecFields
            componentName={
              masters.find((m) => m.id === value.componentTypeId)?.name || ""
            }
            value={value.componentSpecs}
            onChange={(v) => set("componentSpecs", v)}
          />
          <Field
            label="Compatible models"
            hint="Leave unchecked to allow this part for any model. Confirm compatibility with your provider."
          >
            <div className="model-checks">
              {masters
                .filter((m) => m.type === "models")
                .map((m) => (
                  <Form.Check
                    id={"compatible-" + m.id}
                    label={m.name}
                    key={m.id}
                    checked={value.compatibleModelIds?.includes(m.id) || false}
                    onChange={(e) =>
                      set(
                        "compatibleModelIds",
                        e.target.checked
                          ? [...(value.compatibleModelIds || []), m.id]
                          : (value.compatibleModelIds || []).filter(
                              (x) => x !== m.id,
                            ),
                      )
                    }
                  />
                ))}
            </div>
          </Field>
          <Form.Check
            className="check-card"
            id="serial-tracking"
            label="Require a unique serial number for each replacement"
            checked={value.serialRequired || false}
            onChange={(e) => set("serialRequired", e.target.checked)}
          />
        </>
      )}
      {contact && (
        <>
          <div className="form-grid">
            <TextField
              label="Contact person"
              value={value.contact || ""}
              onChange={(v) => set("contact", v)}
            />
            <TextField
              label="Phone"
              type="tel"
              value={value.phone || ""}
              onChange={(v) => set("phone", v)}
            />
          </div>
          <TextField
            label="Email"
            type="email"
            value={value.email || ""}
            onChange={(v) => set("email", v)}
          />
          <TextArea
            label="Address"
            value={value.address || ""}
            onChange={(v) => set("address", v)}
          />
        </>
      )}
      <Form.Check
        className="check-card mt-3"
        id="master-active"
        label="Active — available for new entries"
        checked={value.active}
        onChange={(e) => set("active", e.target.checked)}
      />
    </>
  );
}
