import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Form } from "react-bootstrap";
import { Download, Printer } from "lucide-react";
import { useJobs, useMasters, label, formatDate } from "../api";
import {
  PageHeader,
  Loading,
  ErrorNotice,
  Empty,
  StatusBadge,
} from "../components/UI";
import { TextField } from "../components/JobFields";
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export default function Reports() {
  const jobs = useJobs();
  const masters = useMasters();
  const [report, setReport] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  if (jobs.isPending || masters.isPending) return <Loading />;
  if (jobs.error || masters.error)
    return <ErrorNotice error={jobs.error || masters.error} />;
  const rows = (jobs.data || []).filter(
    (j) =>
      (!from || j.receivedDate >= from) &&
      (!to || j.receivedDate <= to) &&
      (report === "claims"
        ? j.claims.some((c) => !["Fulfilled", "Rejected"].includes(c.status))
        : report === "dispatch"
          ? j.status === "Ready to dispatch"
          : report === "installation"
            ? j.dispatches.some(
                (d) => d.installationRequired && !d.installationDate,
              )
            : report === "closed"
              ? j.status === "Completed"
              : true),
  );
  function download() {
    const headers = [
      "Job number",
      "Request date",
      "Customer",
      "Model",
      "Device serial",
      "Warranty",
      "Components",
      "Stage",
      "Claim references",
      "Courier references",
      "Customer received dates",
      "Installation dates",
    ];
    const data = rows.map((j) => [
      j.number,
      j.receivedDate,
      label(masters.data, j.customerId),
      label(masters.data, j.modelId),
      j.deviceSerial,
      j.warranty,
      j.items
        .map((i) => `${i.quantity} x ${label(masters.data, i.componentTypeId)}`)
        .join("; "),
      j.status,
      j.claims.map((c) => c.reference).join("; "),
      j.dispatches.map((d) => d.reference).join("; "),
      j.dispatches.map((d) => d.receivedDate).join("; "),
      j.dispatches.map((d) => d.installationDate).join("; "),
    ]);
    const blob = new Blob(
      [
        "\uFEFF" +
          [headers, ...data].map((r) => r.map(csvCell).join(",")).join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `componentcare-${report}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeader
        eyebrow="SERVICE INTELLIGENCE"
        title="Reports"
        description="Clear operational records, ready to review or export."
        action={
          <div className="header-actions">
            <Button variant="outline-secondary" onClick={() => window.print()}>
              <Printer size={18} /> Print
            </Button>
            <Button onClick={download}>
              <Download size={18} /> Export CSV
            </Button>
          </div>
        }
      />
      <section className="panel">
        <div className="report-filters">
          <label>
            Report
            <Form.Select
              value={report}
              onChange={(e) => setReport(e.target.value)}
            >
              <option value="all">All service jobs</option>
              <option value="claims">Pending claims</option>
              <option value="dispatch">Ready for dispatch</option>
              <option value="installation">Pending installations</option>
              <option value="closed">Completed jobs</option>
            </Form.Select>
          </label>
          <TextField
            label="Requests from"
            type="date"
            value={from}
            onChange={setFrom}
          />
          <TextField
            label="Requests through"
            type="date"
            value={to}
            onChange={setTo}
          />
        </div>
        <div className="report-caption">
          {rows.length} matching jobs · Date filters use the request date
        </div>
        {!rows.length ? (
          <Empty title="No records in this selection">
            Adjust the report or date range.
          </Empty>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Requested</th>
                  <th>Customer</th>
                  <th>Device serial</th>
                  <th>Warranty</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link className="job-link" to={"/jobs/" + j.id}>
                        {j.number}
                      </Link>
                    </td>
                    <td>{formatDate(j.receivedDate)}</td>
                    <td>{label(masters.data, j.customerId)}</td>
                    <td>{j.deviceSerial}</td>
                    <td>{j.warranty}</td>
                    <td>
                      <StatusBadge status={j.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
