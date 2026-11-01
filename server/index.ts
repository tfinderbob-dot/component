import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { z } from "zod";
import { initialize, mode, mutate, readDatabase } from "./store.js";
import { checkPassword, hashPassword } from "./seed.js";
import {
  masterSchema,
  jobSchema,
  validateMaster,
  validateJob,
} from "../shared/validation.js";
import type { Attachment, Job, Master, SessionUser } from "../shared/types.js";
await initialize();
const app = express();
// Enable only for a local web-server proxy; never trust arbitrary client IP headers.
if (process.env.TRUST_PROXY === 'loopback') app.set('trust proxy', 'loopback');
app.disable("x-powered-by");
// Apply to pages, API responses, attachments and errors before any routes.
app.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  next();
});
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
const sessions = new Map<
  string,
  { user: SessionUser; expires: number; csrf: string }
>();
setInterval(() => {
  for (const [k, s] of sessions) if (s.expires < Date.now()) sessions.delete(k);
}, 60000).unref();
app.get("/api/health", (_req, res) => res.json({ ok: true, mode }));
app.post(
  "/api/auth/login",
  rateLimit({ windowMs: 15 * 60000, limit: 30 }),
  async (req, res) => {
    const parsed = z
      .object({ email: z.string().max(254), password: z.string().max(200) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter email and password." });
      return;
    }
    const db = await readDatabase();
    const u = db.users.find(
      (x) => x.email.toLowerCase() === parsed.data.email.toLowerCase(),
    );
    if (!u || !checkPassword(parsed.data.password, u.passwordHash)) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    const { passwordHash, ...user } = u;
    const token = randomBytes(32).toString("hex");
    const csrf = randomBytes(24).toString("hex");
    sessions.set(token, { user, expires: Date.now() + 8 * 3600000, csrf });
    res
      .cookie("cc_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.COOKIE_SECURE === "true",
        maxAge: 8 * 3600000,
        path: "/",
      })
      .json({ user, csrf, mode });
  },
);
app.use("/api", (req, res, next) => {
  const s = sessions.get(req.cookies.cc_session);
  if (!s || s.expires < Date.now()) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers["x-csrf-token"] !== s.csrf
  ) {
    res
      .status(403)
      .json({ error: "Session verification failed. Sign in again." });
    return;
  }
  res.locals.session = s;
  next();
});
app.get("/api/auth/me", (_req, res) =>
  res.json({ ...res.locals.session, mode }),
);
app.post("/api/auth/logout", (req, res) => {
  sessions.delete(req.cookies.cc_session);
  res.clearCookie("cc_session").json({ ok: true });
});
app.post("/api/auth/password", async (req, res) => {
  const p = z
    .object({ current: z.string().max(200), next: z.string().min(10).max(200) })
    .parse(req.body);
  await mutate((db) => {
    const u = db.users.find((x) => x.id === res.locals.session.user.id)!;
    if (!checkPassword(p.current, u.passwordHash))
      throw Error("Current password is incorrect.");
    u.passwordHash = hashPassword(p.next);
  });
  for (const [key, s] of sessions)
    if (
      s.user.id === res.locals.session.user.id &&
      key !== req.cookies.cc_session
    )
      sessions.delete(key);
  res.json({ ok: true });
});
app.get("/api/masters", async (_req, res) =>
  res.json((await readDatabase()).masters),
);
app.post("/api/masters", async (req, res) => {
  const data = masterSchema.parse({ ...req.body, id: undefined });
  const result = await mutate((db) => {
    const m = { ...data, id: randomUUID() } as Master;
    validateMaster(m, db);
    db.masters.push(m);
    return m;
  });
  res.status(201).json(result);
});
app.put("/api/masters/:id", async (req, res) => {
  const data = masterSchema.parse(req.body);
  const result = await mutate((db) => {
    const index = db.masters.findIndex((x) => x.id === req.params.id);
    if (index < 0) throw Error("Master record not found.");
    if (data.type !== db.masters[index].type)
      throw Error("Master type cannot change.");
    const m = { ...data, id: req.params.id } as Master;
    validateMaster(m, db);
    db.masters[index] = m;
    return m;
  });
  res.json(result);
});
app.get("/api/jobs", async (_req, res) =>
  res.json(
    (await readDatabase()).jobs.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
  ),
);
app.get("/api/jobs/:id", async (req, res) => {
  const j = (await readDatabase()).jobs.find((x) => x.id === req.params.id);
  res.status(j ? 200 : 404).json(j || { error: "Job not found." });
});
app.post("/api/jobs", async (req, res) => {
  const data = jobSchema.parse({ ...req.body, id: undefined });
  const j = await mutate((db) => {
    const now = new Date().toISOString();
    const year = new Date().getFullYear();
    const count =
      db.jobs
        .filter((j) => j.number.startsWith(`SC-${year}-`))
        .reduce(
          (n, j) => Math.max(n, Number(j.number.split("-").at(-1)) || 0),
          0,
        ) + 1;
    const job = {
      ...data,
      id: randomUUID(),
      number: `SC-${year}-${String(count).padStart(4, "0")}`,
      version: 1,
      deviceSerial: data.deviceSerial.toUpperCase(),
      history: [
        {
          at: now,
          by: res.locals.session.user.name,
          message: "Service request created",
        },
      ],
      createdAt: now,
      updatedAt: now,
    } as Job;
    validateJob(job, db);
    db.jobs.push(job);
    return job;
  });
  res.status(201).json(j);
});
app.put("/api/jobs/:id", async (req, res) => {
  const data = jobSchema.parse(req.body);
  const job = await mutate((db) => {
    const index = db.jobs.findIndex((x) => x.id === req.params.id);
    if (index < 0) throw Error("Job not found.");
    const old = db.jobs[index];
    if (data.version !== old.version)
      throw Object.assign(
        Error("This job was changed in another window. Reload before editing."),
        { status: 409 },
      );
    const now = new Date().toISOString();
    const j = {
      ...data,
      id: old.id,
      number: old.number,
      version: old.version + 1,
      deviceSerial: data.deviceSerial.toUpperCase(),
      createdAt: old.createdAt,
      updatedAt: now,
      attachments: old.attachments || [],
      history: [
        ...old.history,
        {
          at: now,
          by: res.locals.session.user.name,
          message:
            old.status !== data.status
              ? `Stage changed: ${old.status} → ${data.status}`
              : "Job details updated",
        },
      ],
    } as Job;
    validateJob(j, db);
    db.jobs[index] = j;
    return j;
  });
  res.json(job);
});
const uploadDir = path.resolve(
  process.env.ATTACHMENT_DIR || "data/attachments",
);
app.post(
  "/api/jobs/:id/attachments",
  express.raw({ type: "application/octet-stream", limit: "5mb" }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length)
      throw Error("Choose a PDF, PNG or JPEG file, up to 5 MB.");
    const b = req.body as Buffer;
    const mime =
      b.subarray(0, 5).toString() === "%PDF-"
        ? "application/pdf"
        : b
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : b[0] === 255 && b[1] === 216 && b[2] === 255
            ? "image/jpeg"
            : "";
    if (!mime) throw Error("Only PDF, PNG and JPEG files are accepted.");
    const name = decodeURIComponent(
      String(req.headers["x-file-name"] || "document"),
    )
      .replace(/[\\/\r\n]/g, "_")
      .slice(0, 200);
    const item: Attachment = {
      id: randomUUID(),
      name,
      mime,
      size: b.length,
      uploadedAt: new Date().toISOString(),
      uploadedBy: res.locals.session.user.name,
    };
    await mkdir(uploadDir, { recursive: true });
    const target = path.join(uploadDir, item.id);
    await writeFile(target, b);
    try {
      await mutate((db) => {
        const j = db.jobs.find((x) => x.id === req.params.id);
        if (!j) throw Error("Job not found.");
        j.attachments ??= [];
        if (j.attachments.length >= 50)
          throw Error("A job supports up to 50 attachments.");
        j.attachments.push(item);
        j.version++;
        j.updatedAt = item.uploadedAt;
        j.history.push({
          at: item.uploadedAt,
          by: item.uploadedBy,
          message: `Document attached: ${item.name}`,
        });
      });
    } catch (e) {
      await unlink(target);
      throw e;
    }
    res.status(201).json(item);
  },
);
app.get("/api/jobs/:id/attachments/:attachmentId", async (req, res) => {
  const j = (await readDatabase()).jobs.find((x) => x.id === req.params.id);
  const a = j?.attachments?.find((x) => x.id === req.params.attachmentId);
  if (!a) {
    res.status(404).json({ error: "Attachment not found." });
    return;
  }
  res.type(a.mime);
  if (
    req.query.preview === "1" &&
    ["image/png", "image/jpeg"].includes(a.mime)
  ) {
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, no-store");
  } else res.attachment(a.name);
  res.sendFile(path.join(uploadDir, a.id));
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API endpoint not found." }),
);
if (existsSync("dist/index.html")) {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
}
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
      return;
    }
    const e = err as Error & { status?: number; code?: string };
    if (e.code) {
      console.error("Storage error:", e.code);
      res
        .status(500)
        .json({ error: "The database request failed. Check the server log." });
      return;
    }
    res
      .status(e.status || 400)
      .json({ error: e.message || "Unable to complete the request." });
  },
);
const port = Number(process.env.PORT || 4000);
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`ComponentCare API: http://127.0.0.1:${port} (${mode} storage)`),
);
