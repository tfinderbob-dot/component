import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Alert } from "react-bootstrap";
import { ArrowLeft, Save, RefreshCw, Clock3, Printer } from "lucide-react";
import { api, label, today, useMasters, formatDate } from "../api";
import {
  PageHeader,
  Loading,
  ErrorNotice,
  StatusBadge,
} from "../components/UI";
import { statuses, type Job } from "../../shared/types";
import ReceiveForm from "../forms/ReceiveForm";
import ClaimForm from "../forms/ClaimForm";
import ReplacementForm from "../forms/ReplacementForm";
import DispatchForm from "../forms/DispatchForm";
import InstallationForm from "../forms/InstallationForm";
import Attachments from "../components/Attachments";
function blank(): Job {
  return {
    id: "",
    number: "New request",
    version: 0,
    customerId: "",
    modelId: "",
    deviceSerial: "",
    actualSpecs: "",
    warranty: "Unconfirmed",
    warrantyEnd: "",
    warrantyVerified: false,
    priority: "Normal",
    receivedDate: today(),
    customerAddress: "",
    complaint: "",
    diagnosis: "",
    serviceNotes: "",
    authorized: false,
    qualityPassed: false,
    status: "Received",
    items: [
      {
        id: crypto.randomUUID(),
        componentTypeId: "",
        partId: "",
        quantity: 1,
        fault: "",
        faultySerial: "",
        faultyReceivedDate: "",
      },
    ],
    claims: [],
    receipts: [],
    dispatches: [],
    history: [],
    createdAt: "",
    updatedAt: "",
  };
}
const steps = [
  "Customer & device",
  "Inspection & claim",
  "Replacement & repair",
  "Component dispatch",
  "Delivery & installation",
];
export default function JobEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const masters = useMasters();
  const query = useQuery({
    queryKey: ["job", id],
    queryFn: () => api<Job>("/jobs/" + id),
    enabled: Boolean(id),
  });
  const [job, setJob] = useState<Job>(blank);
  const [step, setStep] = useState(
    Math.min(4, Math.max(0, Number(params.get("step")) || 0)),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (query.data) {
      setJob(query.data);
      setDirty(false);
    } else if (!id) {
      setJob(blank());
      setDirty(false);
    }
  }, [query.data, id]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    const navigateAway = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.("a");
      if (
        !dirty ||
        !a ||
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        a.getAttribute("href")?.startsWith("/api/") ||
        a.href === window.location.href
      )
        return;
      if (!window.confirm("Leave this page and discard unsaved changes?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", navigateAway, true);
    return () => {
      window.removeEventListener("beforeunload", handler);
      document.removeEventListener("click", navigateAway, true);
    };
  }, [dirty]);
  if (masters.isPending || (id && query.isPending)) return <Loading />;
  if (masters.error || query.error)
    return <ErrorNotice error={masters.error || query.error} />;
  const update = (j: Job) => {
    setJob(j);
    setDirty(true);
    setSuccess("");
  };
  const forms = [
    ReceiveForm,
    ClaimForm,
    ReplacementForm,
    DispatchForm,
    InstallationForm,
  ];
  const Current = forms[Math.min(4, Math.max(0, step))];
  async function save() {
    setError("");
    setBusy(true);
    try {
      const saved = await api<Job>(id ? "/jobs/" + id : "/jobs", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(job),
      });
      setJob(saved);
      setDirty(false);
      cache.setQueryData(["job", saved.id], saved);
      await cache.invalidateQueries({ queryKey: ["jobs"] });
      setSuccess("Job saved successfully.");
      if (!id) navigate("/jobs/" + saved.id, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link to="/jobs" className="back-link">
        <ArrowLeft size={17} /> All service jobs
      </Link>
      <PageHeader
        eyebrow={id ? "SERVICE JOB WORKSPACE" : "NEW COMPONENT REQUEST"}
        title={job.number}
        description={
          id
            ? `${label(masters.data, job.customerId)} · ${job.deviceSerial}`
            : "Start with the customer and device. Complete the other steps as work progresses."
        }
        action={
          <div className="header-actions">
            <Button variant="outline-secondary" onClick={() => window.print()}>
              <Printer size={18} /> Print
            </Button>
            <Button disabled={busy} onClick={save}>
              <Save size={18} />
              {busy ? "Saving…" : "Save job"}
            </Button>
          </div>
        }
      />
      <ErrorNotice error={error} />
      {success && <Alert variant="success">{success}</Alert>}
      <div className="job-stage-bar">
        <div>
          <StatusBadge status={job.status} />
          <span className="text-muted">
            {dirty
              ? "Unsaved changes"
              : id
                ? "All changes saved"
                : "Not saved yet"}
          </span>
        </div>
        <label>
          Job stage{" "}
          <Form.Select
            aria-label="Job stage"
            value={job.status}
            onChange={(e) =>
              update({ ...job, status: e.target.value as Job["status"] })
            }
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Form.Select>
        </label>
      </div>
      <div className="job-editor-grid">
        <nav className="job-steps" aria-label="Job sections">
          {steps.map((s, i) => (
            <button
              className={step === i ? "active" : ""}
              key={s}
              onClick={() => setStep(i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                {s}
                <small>
                  {
                    [
                      "Customer and faulty items",
                      "Diagnosis and provider reference",
                      "Received parts and quality check",
                      "Courier and tracking details",
                      "Receipt and installation dates",
                    ][i]
                  }
                </small>
              </div>
            </button>
          ))}
          <div className="job-step-note">
            <Clock3 size={19} />
            <p>
              Save at any stage.
              <br />
              Return when the next update arrives.
            </p>
          </div>
        </nav>
        <section className="panel form-panel">
          <div className="form-tools">
            <span>STEP {step + 1} OF 5</span>
            <Button size="sm" variant="link" onClick={() => masters.refetch()}>
              <RefreshCw size={15} /> Refresh masters
            </Button>
          </div>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Current job={job} setJob={update} masters={masters.data || []} />
            <div className="form-footer">
              <Button
                variant="outline-secondary"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                Previous
              </Button>
              <div>
                {step < 4 && (
                  <Button
                    variant="outline-primary"
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next section
                  </Button>
                )}
                <Button type="submit" disabled={busy}>
                  <Save size={18} />
                  {busy ? "Saving…" : "Save job"}
                </Button>
              </div>
            </div>
          </Form>
        </section>
      </div>
      {job.id && <Attachments job={job} dirty={dirty} />}
      {job.history.length > 0 && (
        <section className="panel history-panel">
          <h2>Activity history</h2>
          {[...job.history].reverse().map((h, i) => (
            <div className="history-row" key={i}>
              <span className="history-dot" />
              <div>
                <strong>{h.message}</strong>
                <small>
                  {h.by} · {formatDate(h.at)} ·{" "}
                  {new Date(h.at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
