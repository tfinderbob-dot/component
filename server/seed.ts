import type { Database, Job, Master } from "../shared/types.js";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const a = Buffer.from(key, "hex");
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function seed(demo: boolean): Database {
  const m = (
    id: string,
    type: Master["type"],
    name: string,
    extra: Partial<Master> = {},
  ): Master => ({ id, type, name, active: true, ...extra });
  const masters: Master[] = [
    ...["Laptop", "Desktop", "Server", "Monitor", "UPS"].map((n, i) =>
      m(`cat-${i}`, "categories", n),
    ),
    ...[
      "RAM",
      "Motherboard",
      "HDD",
      "SSD",
      "SMPS / Power supply",
      "Processor cooling fan",
      "Server fan",
      "Graphics card",
      "Battery",
      "Whole monitor",
      "UPS control board",
      "Adapter",
      "Processor",
    ].map((n, i) => m(`component-${i}`, "componentTypes", n)),
  ];
  if (demo)
    masters.push(
      m("model-1", "models", "ThinkPad T14 · Sample", {
        categoryId: "cat-0",
        modelNumber: "DEMO-T14",
        specs: "Sample configuration • Intel Core i5 • 16 GB RAM • 512 GB SSD",
      }),
      m("model-2", "models", "ThinkSystem · Sample", {
        categoryId: "cat-2",
        modelNumber: "DEMO-SERVER",
        specs: "Sample configuration • 32 GB RAM • 2 × 1 TB HDD",
      }),
      m("model-3", "models", "ThinkVision 24 · Sample", {
        categoryId: "cat-3",
        modelNumber: "DEMO-MONITOR",
        specs: "Sample configuration • 24-inch • IPS",
      }),
      m("part-1", "parts", "16 GB DDR4 memory", {
        componentTypeId: "component-0",
        partNumber: "DEMO-RAM-16",
        fruNumber: "DEMO-FRU-01",
        specs: "16 GB DDR4",
        compatibleModelIds: ["model-1", "model-2"],
        serialRequired: true,
      }),
      m("customer-1", "customers", "Northstar Technologies · Sample", {
        contact: "Priya Sharma",
        phone: "9000000001",
        email: "priya@example.com",
        address: "Sample office, Bengaluru",
      }),
      m("customer-2", "customers", "Meridian Systems · Sample", {
        contact: "Arun Kumar",
        phone: "9000000002",
        address: "Sample branch, Chennai",
      }),
      m("provider-1", "providers", "Regional service partner · Sample", {
        contact: "Claims desk",
        email: "claims@example.com",
      }),
      m("courier-1", "couriers", "Sample Express"),
      m("tech-1", "technicians", "Ravi · Sample", { phone: "9000000003" }),
    );
  const jobs: Job[] = [];
  if (demo) {
    const now = new Date();
    const day = (ago: number) =>
      new Date(now.getTime() - ago * 86400000).toISOString().slice(0, 10);
    for (let i = 0; i < 6; i++) {
      const status = (
        [
          "Received",
          "In progress",
          "Waiting for replacement",
          "Ready to dispatch",
          "Dispatched",
          "Completed",
        ] as const
      )[i];
      const j: Job = {
        id: `sample-job-${i}`,
        number: `SC-${now.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        version: 1,
        customerId: i % 2 ? "customer-2" : "customer-1",
        modelId: "model-1",
        deviceSerial: `DEMO-SN-100${i}`,
        actualSpecs: "Intel Core i5 • 16 GB RAM • 512 GB SSD",
        warranty: "Under warranty",
        warrantyEnd: "",
        warrantyVerified: i > 0,
        priority: i === 2 ? "Urgent" : i === 1 ? "High" : "Normal",
        receivedDate: day(8 - i),
        customerAddress: "Sample office, Bengaluru",
        complaint: [
          "Memory error during startup",
          "Intermittent shutdown under load",
          "RAM module not detected",
          "Replacement verified and ready",
          "Component sent to customer",
          "Installed and tested successfully",
        ][i],
        diagnosis: i > 0 ? "Memory diagnostics confirmed module fault." : "",
        serviceNotes: "Sample record for demonstration.",
        authorized: true,
        qualityPassed: i >= 3,
        status,
        items: [
          {
            id: `item-${i}`,
            componentTypeId: "component-0",
            partId: "part-1",
            quantity: 1,
            fault: "Memory module fault",
            faultySerial: `DEMO-FAULT-${i}`,
            faultyReceivedDate: "",
          },
        ],
        claims: [],
        receipts: [],
        dispatches: [],
        history: [
          {
            at: now.toISOString(),
            by: "Demo setup",
            message: "Sample job created",
          },
        ],
        createdAt: day(8 - i) + "T09:00:00.000Z",
        updatedAt: now.toISOString(),
      };
      if (i >= 2)
        j.claims.push({
          id: `claim-${i}`,
          itemId: `item-${i}`,
          providerId: "provider-1",
          reference: `DEMO-CLM-${i}`,
          submittedDate: day(5),
          status: i >= 3 ? "Fulfilled" : "Approved",
          notes: "",
        });
      if (i >= 3)
        j.receipts.push({
          id: `receipt-${i}`,
          itemId: `item-${i}`,
          quantity: 1,
          partNumber: "DEMO-RAM-16",
          serial: `DEMO-NEW-${i}`,
          receivedDate: day(2),
          returnRequired: false,
          returnSentDate: "",
          returnReference: "",
        });
      if (i >= 4)
        j.dispatches.push({
          id: `dispatch-${i}`,
          receiptId: `receipt-${i}`,
          quantity: 1,
          courierId: "courier-1",
          reference: `DEMO-AWB-${i}`,
          bookedDate: day(1),
          sentDate: day(1),
          receivedDate: i === 5 ? day(0) : "",
          receivedBy: i === 5 ? "Priya Sharma" : "",
          address: j.customerAddress,
          installationRequired: true,
          installationDate: i === 5 ? day(0) : "",
          technicianId: i === 5 ? "tech-1" : "",
          testResult: i === 5 ? "Memory diagnostic passed" : " ",
        });
      jobs.push(j);
    }
  }
  const password = process.env.ADMIN_PASSWORD || (demo ? "Demo@12345" : "");
  if (!password || password.length < 10)
    throw Error(
      "Set ADMIN_PASSWORD to at least 10 characters before initializing MySQL.",
    );
  return {
    masters,
    jobs,
    users: [
      {
        id: "admin",
        name: "Centre Administrator",
        email: process.env.ADMIN_EMAIL || "admin@componentcare.local",
        role: "Admin",
        passwordHash: hashPassword(password),
      },
    ],
  };
}
