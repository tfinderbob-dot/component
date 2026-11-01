import "dotenv/config";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import mysql, { type PoolConnection, type RowDataPacket } from "mysql2/promise";
import { seed } from "./seed.js";
import {
  masterTypes,
  type Database,
  type Job,
  type MasterType,
} from "../shared/types.js";
export const mode = process.env.STORAGE_MODE || "demo";
if (!["demo", "mysql"].includes(mode))
  throw Error("STORAGE_MODE must be demo or mysql");
const tableNames: Record<MasterType, string> = {
  categories: "product_categories",
  models: "product_models",
  componentTypes: "component_types",
  parts: "parts",
  customers: "customers",
  providers: "service_providers",
  couriers: "couriers",
  technicians: "technicians",
};
const children = {
  items: "job_items",
  claims: "warranty_claims",
  receipts: "replacement_receipts",
  dispatches: "dispatch_items",
  history: "job_history",
  attachments: "job_attachments",
} as const;
const pool =
  mode === "mysql"
    ? mysql.createPool({
        host: process.env.MYSQL_HOST || "127.0.0.1",
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 5,
      })
    : null;
const file = path.resolve(process.env.DATA_FILE || "data/demo.json");
let queue: Promise<unknown> = Promise.resolve();
const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);
async function load(c?: PoolConnection): Promise<Database> {
  if (!c) return JSON.parse(await readFile(file, "utf8"));
  const db: Database = { masters: [], jobs: [], users: [] };
  for (const t of masterTypes) {
    const [rows] = await c.query<RowDataPacket[]>(
      `SELECT details FROM ${tableNames[t]}`,
    );
    db.masters.push(...rows.map((r) => parse(r.details)));
  }
  const [users] = await c.query<RowDataPacket[]>("SELECT details FROM users");
  db.users = users.map((r) => parse(r.details));
  const [jobs] = await c.query<RowDataPacket[]>(
    "SELECT details FROM service_jobs",
  );
  db.jobs = jobs.map((r) => ({
    ...parse(r.details),
    items: [],
    claims: [],
    receipts: [],
    dispatches: [],
    history: [],
    attachments: [],
  }));
  for (const [key, table] of Object.entries(children)) {
    const [rows] = await c.query<RowDataPacket[]>(
      `SELECT job_id, details FROM ${table} ORDER BY position_index`,
    );
    for (const r of rows) {
      const job = db.jobs.find((j) => j.id === r.job_id);
      if (job)
        (job[key as keyof typeof children] as unknown[]).push(parse(r.details));
    }
  }
  return db;
}
async function save(db: Database, c?: PoolConnection) {
  if (!c) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file + ".tmp", JSON.stringify(db, null, 2));
    await rename(file + ".tmp", file);
    return;
  }
  for (const t of masterTypes)
    for (const m of db.masters.filter((x) => x.type === t))
      await c.execute(
        `INSERT INTO ${tableNames[t]} (id,name,active,details) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),active=VALUES(active),details=VALUES(details)`,
        [m.id, m.name, m.active, JSON.stringify(m)],
      );
  for (const u of db.users)
    await c.execute(
      "INSERT INTO users (id,email,details) VALUES (?,?,?) ON DUPLICATE KEY UPDATE email=VALUES(email),details=VALUES(details)",
      [u.id, u.email, JSON.stringify(u)],
    );
  for (const j of db.jobs) {
    const {
      items,
      claims,
      receipts,
      dispatches,
      history,
      attachments,
      ...details
    } = j;
    await c.execute(
      "INSERT INTO service_jobs (id,job_number,customer_id,model_id,device_serial,status,version,details) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE customer_id=VALUES(customer_id),model_id=VALUES(model_id),device_serial=VALUES(device_serial),status=VALUES(status),version=VALUES(version),details=VALUES(details)",
      [
        j.id,
        j.number,
        j.customerId,
        j.modelId,
        j.deviceSerial,
        j.status,
        j.version,
        JSON.stringify(details),
      ],
    );
    for (const [key, table] of Object.entries(children)) {
      await c.execute(`DELETE FROM ${table} WHERE job_id=?`, [j.id]);
      let index = 0;
      for (const row of j[key as keyof typeof children] || [])
        await c.execute(
          `INSERT INTO ${table} (id,job_id,position_index,details) VALUES (?,?,?,?)`,
          [
            "id" in row ? row.id : `${j.id}-${index}`,
            j.id,
            index++,
            JSON.stringify(row),
          ],
        );
    }
  }
}
export async function initialize() {
  if (pool) {
    const c = await pool.getConnection();
    try {
      await c.query("SELECT id FROM users LIMIT 1");
    } finally {
      c.release();
    }
    return;
  }
  try {
    await readFile(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    await save(seed(process.env.DEMO_SEED !== "false"));
  }
}
export async function initMysql() {
  if (!pool) throw Error("Set STORAGE_MODE=mysql in .env before db:init.");
  const c = await pool.getConnection();
  try {
    for (const t of Object.values(tableNames))
      await c.query(
        `CREATE TABLE IF NOT EXISTS ${t} (id VARCHAR(100) PRIMARY KEY,name VARCHAR(200) NOT NULL,active BOOLEAN NOT NULL DEFAULT TRUE,details JSON NOT NULL)`,
      );
    await c.query(
      "CREATE TABLE IF NOT EXISTS users (id VARCHAR(100) PRIMARY KEY,email VARCHAR(254) NOT NULL UNIQUE,details JSON NOT NULL)",
    );
    await c.query(
      "CREATE TABLE IF NOT EXISTS service_jobs (id VARCHAR(100) PRIMARY KEY,job_number VARCHAR(50) NOT NULL UNIQUE,customer_id VARCHAR(100) NOT NULL,model_id VARCHAR(100) NOT NULL,device_serial VARCHAR(100) NOT NULL,status VARCHAR(40) NOT NULL,version INT NOT NULL,details JSON NOT NULL,INDEX ix_serial(device_serial),INDEX ix_status(status),FOREIGN KEY(customer_id) REFERENCES customers(id),FOREIGN KEY(model_id) REFERENCES product_models(id))",
    );
    for (const t of Object.values(children))
      await c.query(
        `CREATE TABLE IF NOT EXISTS ${t} (id VARCHAR(150) PRIMARY KEY,job_id VARCHAR(100) NOT NULL,position_index INT NOT NULL,details JSON NOT NULL,FOREIGN KEY(job_id) REFERENCES service_jobs(id))`,
      );
    const [rows] = await c.query<RowDataPacket[]>(
      "SELECT id FROM users LIMIT 1",
    );
    if (!rows.length) {
      await c.beginTransaction();
      await save(seed(false), c);
      await c.commit();
    }
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}
export async function readDatabase() {
  await queue;
  const c = pool ? await pool.getConnection() : undefined;
  try {
    if (c) await c.beginTransaction();
    const db = await load(c);
    if (c) await c.commit();
    return db;
  } catch (e) {
    if (c) await c.rollback();
    throw e;
  } finally {
    c?.release();
  }
}
export function mutate<T>(fn: (db: Database) => T): Promise<T> {
  const task = queue.then(async () => {
    const c = pool ? await pool.getConnection() : undefined;
    let locked = false;
    try {
      if (c) {
        const [rows] = await c.query<RowDataPacket[]>(
          "SELECT GET_LOCK('componentcare_write', 10) AS acquired",
        );
        if (rows[0].acquired !== 1) throw Error("Database busy. Please retry.");
        locked = true;
        await c.beginTransaction();
      }
      const db = await load(c);
      const result = fn(db);
      await save(db, c);
      if (c) await c.commit();
      return result;
    } catch (e) {
      if (c) await c.rollback();
      throw e;
    } finally {
      if (c && locked)
        await c.query("SELECT RELEASE_LOCK('componentcare_write')");
      c?.release();
    }
  });
  queue = task.catch(() => {});
  return task;
}
