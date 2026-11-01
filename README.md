# ComponentCare

A component warranty and service workspace for an independent centre handling Lenovo devices. This is not an official Lenovo application and does not connect to manufacturer systems.

## Start locally

Requires Node.js 22.12+ (developed with Node 24) and npm.

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The REST API listens on **http://127.0.0.1:4000**. By default both servers bind to loopback.

Default demo login:

- Email: `admin@componentcare.local`
- Password: `Demo@12345`

Demo mode is explicitly labelled and saves data to `data/demo.json`. The six seeded jobs and sample model specifications are fictional. Five product categories and common component types are supplied. Do not treat sample part numbers or compatibility as manufacturer data. Default credentials apply only to a newly initialized demo file; changing the password in Settings persists the new password.

## Connect MySQL

Use MySQL 8 or newer. Create an empty database and a dedicated user with privileges on that database only. The application does not create the database itself.

1. Copy `.env.example` to `.env`.
2. Set `STORAGE_MODE=mysql`.
3. Enter `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER` and `MYSQL_PASSWORD` locally.
4. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` of at least 10 characters.
5. Run `npm run db:init` to create the tables and initial administrator.
6. Restart `npm run dev` and sign in with the configured administrator account.

MySQL initialization seeds real category/type names, but no sample customer, job or part specifications. Re-running initialization does not replace an existing administrator or erase data. The initializer creates missing tables; it is not a general schema migration engine. Demo data is not automatically migrated. A MySQL connection failure never silently switches to demo storage.

`server/store.ts` contains the initializer, parameterized SQL repository and write transactions. See `Database_Table_Details.txt` for actual persistence structure. Business records use indexed relational columns plus JSON details; line items are separate rows with job foreign keys. Compatibility and cross-line relationships are validated in the API.

## Daily workflow

1. **Master data:** enter customer/site, product model and specifications, component types, catalogue parts, compatible models, providers, couriers and technicians.
2. **New service job:** select the customer and model; enter the parent device serial number, actual specifications and faulty components. A request does not imply physical receipt of the device or component.
3. **Inspection & claim:** record diagnosis and warranty verification. Add a provider reference for warranty claims. For non-warranty requests, record customer authorization and skip claims.
4. **Replacement & repair:** record each replacement receipt, serial number and quantity. Track defective returns and quality-check results.
5. **Component dispatch:** select a received replacement, courier, reference, dates, quantity and delivery address.
6. **Delivery & installation:** record customer receipt separately from installation. Mark installation as not required where appropriate.
7. Set the job stage and save. The API blocks completion until all requested quantities are dispatched, received and installed where required, and defective returns are recorded.

Only components are dispatched, except a monitor which is represented as the `Whole monitor` component. A job can have multiple components, claims, receipts and dispatch lines. Multiple dispatch lines can share a tracking reference. Each dispatch line has its own receipt and installation outcome.

Documents and photos can be attached to saved jobs: PDF, PNG or JPEG, up to 5 MB each, maximum 50 per job. Downloads require authentication. Files live in `data/attachments` even in MySQL mode; back up this folder together with the database. There is no malware scanner or cloud storage integration in this local release.

## Pages and source structure

```text
src/pages/             Overview, jobs, job editor, masters, deliveries, reports, settings, login
src/forms/             Separate customer/device, claim, replacement, dispatch, installation and master forms
src/components/        Shared accessible controls, attachments and layout helpers
shared/types.ts        TypeScript domain types
shared/validation.ts   Zod schemas and service workflow validation
server/index.ts        Authenticated REST endpoints and file delivery
server/store.ts        MySQL / local demo repositories
server/seed.ts         Default master records, sample data and password hashing
tests/                 Workflow and isolated REST integration tests
e2e/                   Desktop/mobile Chrome end-to-end test
```

## Main REST endpoints

| Method     | Path                                      | Purpose                                         |
| ---------- | ----------------------------------------- | ----------------------------------------------- |
| GET        | `/api/health`                             | Availability and storage mode                   |
| POST       | `/api/auth/login`                         | Sign in and receive an HTTP-only session cookie |
| GET        | `/api/auth/me`                            | Current session and CSRF token                  |
| POST       | `/api/auth/logout`                        | Sign out                                        |
| POST       | `/api/auth/password`                      | Change password                                 |
| GET / POST | `/api/masters`                            | List or create master data                      |
| PUT        | `/api/masters/:id`                        | Edit or deactivate a master                     |
| GET / POST | `/api/jobs`                               | List or create service jobs                     |
| GET / PUT  | `/api/jobs/:id`                           | Read or update a job                            |
| POST       | `/api/jobs/:id/attachments`               | Upload a document as an octet stream            |
| GET        | `/api/jobs/:id/attachments/:attachmentId` | Download an authorized document                 |

Mutations require the CSRF token from login in `X-CSRF-Token`. Job updates require the current `version`; stale updates receive HTTP 409. Passwords use salted scrypt hashes. API validation is authoritative; the frontend is not trusted for business rules.

## Verification and production build

```powershell
npm test
npm run build
npx playwright test
```

The browser test expects the local dev app to be running and Chrome to be installed. It creates a clearly identifiable `UI-TEST-*` job in the current **demo** workspace. Do not point browser tests at operational data.

```powershell
npm run build
$env:NODE_ENV = 'production'
npm start
```

The production API also serves the built frontend on port 4000. For a network deployment, configure HTTPS, `COOKIE_SECURE=true`, a reverse proxy and a deliberate `HOST` value. Session state is in memory and expires after eight hours or a restart; this release is intended for a single app process. For multiple app instances, use a shared session store before deployment. Authentication currently exposes one administrator account; technician master records are assignments, not separate staff logins.

The initial repository loads centre data into memory and serializes writes. It is suitable for validating a small centre's workflow; large deployments need paginated queries and targeted row-level persistence. No direct Lenovo lookup, automatic courier tracking, email/SMS sending, billing or stock purchasing is included.

## Technology

React + TypeScript, React Bootstrap and Bootstrap, Vite, React Router, TanStack Query, Lucide icons, Node.js/Express REST API, MySQL/mysql2, shared Zod validation, Helmet, login rate limiting, Playwright and Node's test runner. Typography uses Manrope and DM Sans with local system fallbacks.

Official references used for setup: [Vite guide](https://vite.dev/guide/) and [React Bootstrap introduction](https://react-bootstrap.github.io/docs/getting-started/introduction/).
