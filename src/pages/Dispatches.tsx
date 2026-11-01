import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Form } from "react-bootstrap";
import { ArrowUpRight, Truck, PackageCheck, Wrench } from "lucide-react";
import { useJobs, useMasters, label, formatDate } from "../api";
import {
  PageHeader,
  SearchBox,
  Loading,
  ErrorNotice,
  Empty,
} from "../components/UI";
export default function Dispatches() {
  const jobs = useJobs();
  const masters = useMasters();
  const [params, setParams] = useSearchParams();
  const filter = params.get("filter") || "";
  const [search, setSearch] = useState("");
  if (jobs.isPending || masters.isPending) return <Loading />;
  if (jobs.error || masters.error)
    return <ErrorNotice error={jobs.error || masters.error} />;
  const all = (jobs.data || []).flatMap((j) =>
    j.dispatches.map((d) => ({ job: j, dispatch: d })),
  );
  const rows = all.filter(
    ({ job: j, dispatch: d }) =>
      (filter === "delivery"
        ? !d.receivedDate
        : filter === "installation"
          ? d.installationRequired && !d.installationDate
          : true) &&
      [j.number, d.reference, label(masters.data, j.customerId)]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="THE LAST MILE"
        title="Delivery & installation"
        description="Know what reached the customer — and what still needs installation."
      />
      <div className="summary-strip">
        <div>
          <Truck />
          <strong>
            {all.filter((x) => !x.dispatch.receivedDate).length}
          </strong>{" "}
          Deliveries pending
        </div>
        <div>
          <Wrench />
          <strong>
            {
              all.filter(
                (x) =>
                  x.dispatch.installationRequired &&
                  !x.dispatch.installationDate,
              ).length
            }
          </strong>{" "}
          Installations pending
        </div>
        <div>
          <PackageCheck />
          <strong>
            {
              all.filter(
                (x) =>
                  x.dispatch.receivedDate &&
                  (!x.dispatch.installationRequired ||
                    x.dispatch.installationDate),
              ).length
            }
          </strong>{" "}
          Fulfilled dispatches
        </div>
      </div>
      <section className="panel">
        <div className="list-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search customer, job or tracking reference…"
          />
          <Form.Select
            aria-label="Delivery filter"
            value={filter}
            onChange={(e) =>
              setParams(e.target.value ? { filter: e.target.value } : {})
            }
          >
            <option value="">All dispatches</option>
            <option value="delivery">Delivery pending</option>
            <option value="installation">Installation pending</option>
          </Form.Select>
        </div>
        {!rows.length ? (
          <Empty title="No matching dispatches">
            Dispatch a received component from its service job.
          </Empty>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Job / customer</th>
                  <th>Courier / tracking</th>
                  <th>Dispatched</th>
                  <th>Customer received</th>
                  <th>Installation</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ job: j, dispatch: d }) => (
                  <tr key={d.id}>
                    <td>
                      <Link
                        className="job-link"
                        to={"/jobs/" + j.id + "?step=4"}
                      >
                        {j.number}
                      </Link>
                      <small>{label(masters.data, j.customerId)}</small>
                    </td>
                    <td>
                      <strong>{label(masters.data, d.courierId)}</strong>
                      <small>{d.reference}</small>
                    </td>
                    <td>
                      {formatDate(d.sentDate)}
                      <small>{d.quantity} component(s)</small>
                    </td>
                    <td>
                      {d.receivedDate ? (
                        formatDate(d.receivedDate)
                      ) : (
                        <span className="priority high">Pending</span>
                      )}
                      <small>{d.receivedBy}</small>
                    </td>
                    <td>
                      {!d.installationRequired ? (
                        "Not required"
                      ) : d.installationDate ? (
                        formatDate(d.installationDate)
                      ) : (
                        <span className="priority high">Pending</span>
                      )}
                    </td>
                    <td>
                      <Link
                        className="icon-link"
                        aria-label={"Update delivery " + d.reference}
                        to={"/jobs/" + j.id + "?step=4"}
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
      </section>
    </>
  );
}
