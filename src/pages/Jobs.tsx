import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Form } from "react-bootstrap";
import { Plus, ArrowUpRight, ClipboardList } from "lucide-react";
import { useJobs, useMasters, label, formatDate } from "../api";
import {
  PageHeader,
  SearchBox,
  StatusBadge,
  Loading,
  ErrorNotice,
  Empty,
} from "../components/UI";
import { statuses, nextAction } from "../../shared/types";
export default function Jobs() {
  const jobs = useJobs();
  const masters = useMasters();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const [search, setSearch] = useState("");
  if (jobs.isPending || masters.isPending) return <Loading />;
  if (jobs.error || masters.error)
    return <ErrorNotice error={jobs.error || masters.error} />;
  const rows = (jobs.data || []).filter(
    (j) =>
      (!status ||
        (status === "open" ? j.status !== "Completed" : j.status === status)) &&
      [
        j.number,
        j.deviceSerial,
        label(masters.data, j.customerId),
        masters.data?.find((m) => m.id === j.customerId)?.phone,
        ...j.claims.map((c) => c.reference),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="COMPONENT SERVICE"
        title="Service jobs"
        description="One request. Every component. A complete service history."
        action={
          <Link to="/jobs/new" className="btn btn-primary">
            <Plus size={20} /> New service job
          </Link>
        }
      />
      <div className="panel">
        <div className="list-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search job, serial number, customer or claim…"
          />
          <Form.Select
            aria-label="Filter stage"
            value={status}
            onChange={(e) =>
              setParams(e.target.value ? { status: e.target.value } : {})
            }
          >
            <option value="">All stages</option>
            <option value="open">Open jobs</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Form.Select>
          <span className="result-count">{rows.length} jobs</span>
        </div>
        {!rows.length ? (
          <Empty title="No jobs found">
            Try a different search or create a new service job.
          </Empty>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Job / request date</th>
                  <th>Customer / device</th>
                  <th>Components</th>
                  <th>Priority</th>
                  <th>Stage / next action</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link className="job-link" to={"/jobs/" + j.id}>
                        {j.number}
                      </Link>
                      <small>{formatDate(j.receivedDate)}</small>
                    </td>
                    <td>
                      <strong>{label(masters.data, j.customerId)}</strong>
                      <small>
                        {label(masters.data, j.modelId)} · {j.deviceSerial}
                      </small>
                    </td>
                    <td>
                      {j.items.map((i) => (
                        <div key={i.id}>
                          {i.quantity} ×{" "}
                          {label(masters.data, i.componentTypeId)}
                        </div>
                      ))}
                    </td>
                    <td>
                      <span className={"priority " + j.priority.toLowerCase()}>
                        {j.priority}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={j.status} />
                      <small>{nextAction(j)}</small>
                    </td>
                    <td>
                      <Link
                        className="icon-link"
                        to={"/jobs/" + j.id}
                        aria-label={"Open " + j.number}
                      >
                        <ArrowUpRight size={20} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="info-note">
        <ClipboardList size={20} /> The device identifies the claim. Only
        components are dispatched, except whole monitors.
      </div>
    </>
  );
}
