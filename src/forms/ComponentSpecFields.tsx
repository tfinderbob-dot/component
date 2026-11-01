import { Form } from "react-bootstrap";
import {
  componentProfile,
  type ComponentSpecs,
} from "../../shared/component-specs";
import { TextField, SelectField } from "../components/JobFields";
import { Field } from "../components/UI";
export default function ComponentSpecFields({
  componentName,
  value = {},
  onChange,
}: {
  componentName: string;
  value?: ComponentSpecs;
  onChange: (value: ComponentSpecs) => void;
}) {
  const profile = componentProfile(componentName);
  const update = (key: keyof ComponentSpecs, v: string) =>
    onChange({
      ...value,
      ...(key === "capacity"
        ? { capacityUnit: value.capacityUnit || "GB" }
        : {}),
      [key]: v,
    });
  const options = (values: string[]) => values.map((v) => ({ id: v, name: v }));
  if (profile === "other") return null;
  return (
    <div className="full-width component-spec-fields">
      <h3>Component specifications</h3>
      <div className="form-grid">
        {profile === "motherboard" && (
          <TextField
            label="BIOS version"
            value={value.biosVersion || ""}
            onChange={(v) => update("biosVersion", v)}
            hint="Record the BIOS version for this motherboard."
          />
        )}
        {profile === "storage" && (
          <SelectField
            label="Drive type"
            value={value.driveType || ""}
            onChange={(v) => update("driveType", v)}
            options={options(["HDD", "SATA SSD", "NVMe SSD"])}
          />
        )}
        {(profile === "storage" || profile === "ram") && (
          <>
            <Field
              label={profile === "ram" ? "Memory capacity" : "Storage capacity"}
            >
              <Form.Control
                type="number"
                min="0.01"
                step="any"
                value={value.capacity || ""}
                onChange={(e) => update("capacity", e.target.value)}
              />
            </Field>
            <SelectField
              label="Capacity unit"
              value={value.capacityUnit || "GB"}
              onChange={(v) => update("capacityUnit", v)}
              options={options(["GB", "TB"])}
            />
          </>
        )}
        {profile === "processor" && (
          <Field label="Processor speed (GHz)">
            <Form.Control
              type="number"
              min="0.01"
              step="any"
              value={value.speedGHz || ""}
              onChange={(e) => update("speedGHz", e.target.value)}
            />
          </Field>
        )}
        {profile === "cooling" && (
          <SelectField
            label="Cooling type"
            value={value.coolingType || ""}
            onChange={(v) => update("coolingType", v)}
            options={options(["Air fan", "Liquid cooling"])}
          />
        )}
      </div>
    </div>
  );
}
