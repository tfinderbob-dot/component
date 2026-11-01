import type { ComponentSpecs } from "./component-specs.js";
export const masterTypes = [
  "categories",
  "models",
  "componentTypes",
  "parts",
  "customers",
  "providers",
  "couriers",
  "technicians",
] as const;
export type MasterType = (typeof masterTypes)[number];
export interface Master {
  componentSpecs?: ComponentSpecs;
  id: string;
  type: MasterType;
  name: string;
  active: boolean;
  categoryId?: string;
  modelNumber?: string;
  serialNumber?: string;
  specs?: string;
  componentTypeId?: string;
  partNumber?: string;
  fruNumber?: string;
  compatibleModelIds?: string[];
  serialRequired?: boolean;
  phone?: string;
  email?: string;
  address?: string;
  contact?: string;
}
export const statuses = [
  "Received",
  "In progress",
  "Waiting for replacement",
  "Ready to dispatch",
  "Dispatched",
  "Completed",
] as const;
export type Status = (typeof statuses)[number];
export interface JobItem {
  componentSpecs?: ComponentSpecs;
  id: string;
  componentTypeId: string;
  partId: string;
  quantity: number;
  fault: string;
  faultySerial: string;
  faultyReceivedDate: string;
}
export interface Claim {
  id: string;
  itemId: string;
  providerId: string;
  reference: string;
  submittedDate: string;
  status: "Draft" | "Submitted" | "Approved" | "Rejected" | "Fulfilled";
  notes: string;
}
export interface Receipt {
  id: string;
  itemId: string;
  quantity: number;
  partNumber: string;
  serial: string;
  receivedDate: string;
  returnRequired: boolean;
  returnSentDate: string;
  returnReference: string;
}
export interface Dispatch {
  id: string;
  receiptId: string;
  quantity: number;
  courierId: string;
  reference: string;
  bookedDate: string;
  sentDate: string;
  receivedDate: string;
  receivedBy: string;
  address: string;
  installationRequired: boolean;
  installationDate: string;
  technicianId: string;
  testResult: string;
}
export interface History {
  at: string;
  by: string;
  message: string;
}
export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}
export interface Job {
  attachments?: Attachment[];
}
export interface Job {
  id: string;
  number: string;
  version: number;
  customerId: string;
  modelId: string;
  deviceSerial: string;
  actualSpecs: string;
  warranty: "Under warranty" | "Out of warranty" | "Unconfirmed";
  warrantyEnd: string;
  warrantyVerified: boolean;
  priority: "Normal" | "High" | "Urgent";
  receivedDate: string;
  customerAddress: string;
  complaint: string;
  diagnosis: string;
  serviceNotes: string;
  authorized: boolean;
  qualityPassed: boolean;
  status: Status;
  items: JobItem[];
  claims: Claim[];
  receipts: Receipt[];
  dispatches: Dispatch[];
  history: History[];
  createdAt: string;
  updatedAt: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin";
  passwordHash: string;
}
export interface Database {
  masters: Master[];
  jobs: Job[];
  users: User[];
}
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
export const masterLabels: Record<MasterType, string> = {
  categories: "Product categories",
  models: "Product models",
  componentTypes: "Component types",
  parts: "Parts catalogue",
  customers: "Customers & sites",
  providers: "Service providers",
  couriers: "Couriers",
  technicians: "Technicians",
};
export function nextAction(j: Job): string {
  if (j.status === "Completed") return "Job completed";
  if (j.dispatches.some((d) => !d.receivedDate))
    return "Confirm customer delivery";
  if (j.dispatches.some((d) => d.installationRequired && !d.installationDate))
    return "Complete installation";
  if (j.receipts.some((r) => r.returnRequired && !r.returnSentDate))
    return "Return defective component";
  if (j.status === "Ready to dispatch") return "Book component dispatch";
  if (j.status === "Waiting for replacement") return "Follow up with provider";
  if (j.status === "Received") return "Inspect & verify warranty";
  return "Update service progress";
}
