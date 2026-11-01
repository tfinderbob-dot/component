import { z } from "zod";
import {
  masterTypes,
  statuses,
  type Database,
  type Job,
  type Master,
} from "./types.js";
const text = z.string().trim().max(4000);
const id = z.string().min(1).max(100);
const date = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Enter a valid date",
  );
const qty = z.number().int().min(1).max(10000);
const positiveSpec = z
  .string()
  .trim()
  .max(30)
  .refine(
    (v) => v === "" || (/^\d+(\.\d+)?$/.test(v) && Number(v) > 0),
    "Enter a positive number",
  );
export const componentSpecsSchema = z
  .object({
    biosVersion: z.string().trim().max(100).optional(),
    driveType: z.enum(["", "HDD", "SATA SSD", "NVMe SSD"]).optional(),
    capacity: positiveSpec.optional(),
    capacityUnit: z.enum(["", "GB", "TB"]).optional(),
    speedGHz: positiveSpec.optional(),
    coolingType: z.enum(["", "Air fan", "Liquid cooling"]).optional(),
  })
  .strict();
export const masterSchema = z.object({
  id: id.optional(),
  type: z.enum(masterTypes),
  name: z.string().trim().min(2).max(200),
  active: z.boolean(),
  categoryId: text.optional(),
  modelNumber: text.optional(),
  serialNumber: z.string().trim().max(100).optional(),
  specs: text.optional(),
  componentSpecs: componentSpecsSchema.optional(),
  componentTypeId: text.optional(),
  partNumber: text.optional(),
  fruNumber: text.optional(),
  compatibleModelIds: z.array(id).optional(),
  serialRequired: z.boolean().optional(),
  phone: text.optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  address: text.optional(),
  contact: text.optional(),
});
export const jobSchema = z.object({
  id: id.optional(),
  number: text.optional(),
  version: z.number().int().nonnegative().optional(),
  customerId: id,
  modelId: id,
  deviceSerial: z.string().trim().min(2).max(100),
  actualSpecs: text,
  warranty: z.enum(["Under warranty", "Out of warranty", "Unconfirmed"]),
  warrantyEnd: date,
  warrantyVerified: z.boolean(),
  priority: z.enum(["Normal", "High", "Urgent"]),
  receivedDate: date.refine(Boolean, "Request date is required"),
  customerAddress: z.string().trim().min(3).max(4000),
  complaint: z.string().trim().min(3).max(4000),
  diagnosis: text,
  serviceNotes: text,
  authorized: z.boolean(),
  qualityPassed: z.boolean(),
  status: z.enum(statuses),
  items: z
    .array(
      z.object({
        id,
        componentTypeId: id,
        partId: text,
        componentSpecs: componentSpecsSchema.optional(),
        quantity: qty,
        fault: z.string().trim().min(2).max(4000),
        faultySerial: text,
        faultyReceivedDate: date,
      }),
    )
    .min(1),
  claims: z.array(
    z.object({
      id,
      itemId: id,
      providerId: id,
      reference: text,
      submittedDate: date,
      status: z.enum([
        "Draft",
        "Submitted",
        "Approved",
        "Rejected",
        "Fulfilled",
      ]),
      notes: text,
    }),
  ),
  receipts: z.array(
    z.object({
      id,
      itemId: id,
      quantity: qty,
      partNumber: text,
      serial: text,
      receivedDate: date.refine(
        Boolean,
        "Replacement receipt date is required",
      ),
      returnRequired: z.boolean(),
      returnSentDate: date,
      returnReference: text,
    }),
  ),
  dispatches: z.array(
    z.object({
      id,
      receiptId: id,
      quantity: qty,
      courierId: id,
      reference: z.string().trim().min(1).max(200),
      bookedDate: date.refine(Boolean),
      sentDate: date.refine(Boolean),
      receivedDate: date,
      receivedBy: text,
      address: z.string().trim().min(3).max(4000),
      installationRequired: z.boolean(),
      installationDate: date,
      technicianId: text,
      testResult: text,
    }),
  ),
  history: z.array(z.unknown()).optional(),
  createdAt: text.optional(),
  updatedAt: text.optional(),
});
export function validateMaster(m: Master, db: Database) {
  const has = (key: string | undefined, type: string) =>
    db.masters.some((x) => x.id === key && x.type === type);
  if (
    m.type === "models" &&
    (!has(m.categoryId, "categories") || !m.modelNumber)
  )
    throw Error("A model requires a category and model number.");
  if (
    m.type === "parts" &&
    (!has(m.componentTypeId, "componentTypes") || !m.partNumber)
  )
    throw Error("A catalogue part requires a component type and part number.");
  if (m.compatibleModelIds?.some((x) => !has(x, "models")))
    throw Error("Select valid compatible models.");
  if (
    db.masters.some(
      (x) =>
        x.id !== m.id &&
        x.type === m.type &&
        (m.type === "models"
          ? x.modelNumber?.toLowerCase() === m.modelNumber?.toLowerCase()
          : m.type === "parts"
            ? x.partNumber?.toLowerCase() === m.partNumber?.toLowerCase()
            : x.name.toLowerCase() === m.name.toLowerCase()),
    )
  )
    throw Error("This name or catalogue/model number already exists.");
}
export function validateJob(j: Job, db: Database) {
  const fail = (s: string) => {
    throw Error(s);
  };
  const master = (key: string, type: string) =>
    db.masters.find((x) => x.id === key && x.type === type) ||
    fail(`Select a valid ${type} record.`);
  master(j.customerId, "customers");
  const model = master(j.modelId, "models");
  if (
    db.jobs.some(
      (x) =>
        x.id !== j.id &&
        x.modelId === j.modelId &&
        x.deviceSerial.toUpperCase() === j.deviceSerial.toUpperCase() &&
        x.status !== "Completed",
    )
  )
    fail(
      "This device already has an open job. Open that job to add components.",
    );
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const actualDate = (d: string) => {
    if (d && d > today) fail("Actual event dates cannot be in the future.");
  };
  actualDate(j.receivedDate);
  for (const arr of [j.items, j.claims, j.receipts, j.dispatches])
    if (new Set(arr.map((x) => x.id)).size !== arr.length)
      fail("Duplicate line identifiers are not allowed.");
  for (const i of j.items) {
    master(i.componentTypeId, "componentTypes");
    actualDate(i.faultyReceivedDate);
    if (i.partId) {
      const p = master(i.partId, "parts");
      if (p.componentTypeId !== i.componentTypeId)
        fail("The selected part does not match the component type.");
      if (
        p.compatibleModelIds?.length &&
        !p.compatibleModelIds.includes(model.id)
      )
        fail("The selected part is not compatible with this model.");
    }
  }
  for (const c of j.claims) {
    if (!j.items.some((i) => i.id === c.itemId)) fail("Claim item is missing.");
    master(c.providerId, "providers");
    if (j.warranty === "Out of warranty")
      fail("Non-warranty jobs do not use warranty claims.");
    if (
      c.status !== "Draft" &&
      (!c.reference ||
        !c.submittedDate ||
        !j.warrantyVerified ||
        j.warranty !== "Under warranty")
    )
      fail("Verify warranty and enter a claim reference and submitted date.");
    actualDate(c.submittedDate);
  }
  for (const r of j.receipts) {
    const i = j.items.find((i) => i.id === r.itemId);
    if (!i) fail("Replacement must reference a requested component.");
    if (
      j.receipts
        .filter((x) => x.itemId === r.itemId)
        .reduce((n, x) => n + x.quantity, 0) > i!.quantity
    )
      fail("Received quantity exceeds requested quantity.");
    const p = db.masters.find((x) => x.id === i!.partId);
    if (p?.serialRequired && (!r.serial || r.quantity !== 1))
      fail(
        "Serialized replacements require one receipt line per serial number.",
      );
    if (
      r.serial &&
      j.receipts.some((x) => x.id !== r.id && x.serial === r.serial)
    )
      fail("Replacement serial number is duplicated.");
    actualDate(r.receivedDate);
    actualDate(r.returnSentDate);
    if (r.receivedDate < j.receivedDate)
      fail("Replacement receipt cannot precede the request.");
    if (r.returnSentDate && !r.returnReference)
      fail("Enter the defective return reference.");
  }
  for (const d of j.dispatches) {
    const r = j.receipts.find((x) => x.id === d.receiptId);
    if (!r) fail("Dispatch must reference a received replacement.");
    master(d.courierId, "couriers");
    if (
      j.dispatches
        .filter((x) => x.receiptId === d.receiptId)
        .reduce((n, x) => n + x.quantity, 0) > r!.quantity
    )
      fail("Dispatch quantity exceeds received quantity.");
    if (!j.qualityPassed) fail("Complete the quality check before dispatch.");
    if (j.warranty === "Out of warranty" && !j.authorized)
      fail("Record customer authorization before non-warranty dispatch.");
    if (d.sentDate < r!.receivedDate || d.sentDate < d.bookedDate)
      fail("Dispatch cannot precede receipt or booking.");
    if (d.receivedDate && d.receivedDate < d.sentDate)
      fail("Delivery cannot precede dispatch.");
    if (d.receivedDate && !d.receivedBy)
      fail("Enter who received the delivery.");
    if (
      d.installationDate &&
      (!d.installationRequired ||
        !d.receivedDate ||
        d.installationDate < d.receivedDate ||
        !d.technicianId ||
        !d.testResult)
    )
      fail(
        "Installation requires delivery, a technician and test results, with a valid date.",
      );
    if (d.technicianId) master(d.technicianId, "technicians");
    [d.bookedDate, d.sentDate, d.receivedDate, d.installationDate].forEach(
      actualDate,
    );
  }
  if (
    ["Ready to dispatch", "Dispatched", "Completed"].includes(j.status) &&
    !j.qualityPassed
  )
    fail("A passed quality check is required for this stage.");
  if (j.status === "Dispatched" && !j.dispatches.length)
    fail("Record a component dispatch first.");
  if (j.status === "Completed") {
    if (!j.dispatches.length)
      fail("Record a dispatch before completing this job.");
    if (
      j.items.some(
        (i) =>
          j.dispatches
            .filter(
              (d) =>
                j.receipts.find((r) => r.id === d.receiptId)?.itemId === i.id,
            )
            .reduce((n, d) => n + d.quantity, 0) !== i.quantity,
      )
    )
      fail(
        "All requested component quantities must be dispatched before completion.",
      );
    if (
      j.dispatches.some(
        (d) =>
          !d.receivedDate || (d.installationRequired && !d.installationDate),
      )
    )
      fail(
        "Confirm every delivery and required installation before completion.",
      );
    if (j.receipts.some((r) => r.returnRequired && !r.returnSentDate))
      fail("Complete required defective component returns before closing.");
  }
}
