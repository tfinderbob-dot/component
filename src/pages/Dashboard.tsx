import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  PackageOpen,
  Clock3,
  Truck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useJobs, useMasters, label } from "../api";
import {
  PageHeader,
  StatusBadge,
  Loading,
  ErrorNotice,
  Empty,
} from "../components/UI";
import { nextAction, statuses } from "../../shared/types";
export default function Dashboard() {
  const jobs = useJobs();
  const masters = useMasters();
  if (jobs.isPending || masters.isPending) return <Loading />;
  if (jobs.error || masters.error)
    return <ErrorNotice error={jobs.error || masters.error} />;
  const all = jobs.data || [];
  const active = all.filter((j) => j.status !== "Completed");
  const waiting = all.filter((j) => j.status === "Waiting for replacement");
  const installation = all.filter((j) =>
    j.dispatches.some((d) => d.installationRequired && !d.installationDate),
  );
  const cards = [
    {
      title: "Open service jobs",
      value: active.length,
      icon: PackageOpen,
      color: "teal",
      description: "Across your service centre",
      link: "/jobs?status=open",
    },
    {
      title: "Awaiting replacement",
      value: waiting.length,
      icon: Clock3,
      color: "amber",
      description: "Follow up with your provider",
      link: "/jobs?status=Waiting%20for%20replacement",
    },
    {
      title: "Ready to dispatch",
      value: all.filter((j) => j.status === "Ready to dispatch").length,
      icon: Truck,
      color: "blue",
      description: "Components ready to move",
      link: "/jobs?status=Ready%20to%20dispatch",
    },
    {
      title: "Installation pending",
      value: installation.length,
      icon: CheckCircle2,
      color: "purple",
      description: "Finish the customer journey",
      link: "/dispatches?filter=installation",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="YOUR DAILY CONTROL CENTRE"
        title="Service overview"
        description="A clear view of every component, claim and next step."
        action={
          <Link className="btn btn-primary" to="/jobs/new">
            <Plus size={20} /> New service job
          </Link>
        }
      />
      <section className="metrics">
        {cards.map((c) => (
          <Link to={c.link} key={c.title} className="metric-card">
            <div className="metric-top">
              <span className={"metric-icon " + c.color}>
                <c.icon size={22} />
              </span>
              <ArrowUpRight size={19} />
            </div>
            <div className="metric-value">
              {String(c.value).padStart(2, "0")}
            </div>
            <strong>{c.title}</strong>
            <p>{c.description}</p>
          </Link>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PRIORITY WORKSPACE</span>
              <h2>Jobs needing attention</h2>
            </div>
            <Link to="/jobs" className="text-link">
              View all <ArrowRight size={17} />
            </Link>
          </div>
          {!active.length ? (
            <Empty title="All caught up">
              Create a request to start tracking a component.
            </Empty>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Job / customer</th>
                    <th>Component request</th>
                    <th>Stage</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...active]
                    .sort(
                      (a, b) =>
                        ({ Urgent: 0, High: 1, Normal: 2 })[a.priority] -
                        { Urgent: 0, High: 1, Normal: 2 }[b.priority],
                    )
                    .slice(0, 5)
                    .map((j) => (
                      <tr key={j.id}>
                        <td>
                          <Link className="job-link" to={"/jobs/" + j.id}>
                            {j.number}
                          </Link>
                          <small>{label(masters.data, j.customerId)}</small>
                        </td>
                        <td>
                          <strong>
                            {j.items
                              .map((i) =>
                                label(masters.data, i.componentTypeId),
                              )
                              .join(", ")}
                          </strong>
                          <small>{nextAction(j)}</small>
                        </td>
                        <td>
                          <StatusBadge status={j.status} />
                        </td>
                        <td>
                          <Link
                            className="icon-link"
                            aria-label={"Open " + j.number}
                            to={"/jobs/" + j.id}
                          >
                            <ArrowUpRight size={19} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel pipeline-panel">
          <span className="eyebrow">WORKFLOW HEALTH</span>
          <h2>Your service pipeline</h2>
          <p className="text-muted">Current jobs at every stage</p>
          {statuses.map((s, i) => {
            const count = all.filter((j) => j.status === s).length;
            return (
              <Link
                key={s}
                to={"/jobs?status=" + encodeURIComponent(s)}
                className="pipeline-row"
              >
                <span className="pipeline-number">0{i + 1}</span>
                <div>
                  <div className="pipeline-label">
                    <span>{s}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="pipeline-track">
                    <span
                      style={{
                        width: all.length
                          ? `${(count / all.length) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
          <div className="pipeline-foot">
            <CheckCircle2 size={19} />
            {all.filter((j) => j.status === "Completed").length} jobs completed
          </div>
        </section>
      </div>
      <section className="quick-start">
        <div>
          <span className="metric-icon teal">
            <PackageOpen size={23} />
          </span>
          <div>
            <h3>Less typing. More doing.</h3>
            <p>
              Save customers, models and compatible parts once. Reuse them in
              every job.
            </p>
          </div>
        </div>
        <Link to="/masters" className="btn btn-outline-primary">
          Manage master data <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
