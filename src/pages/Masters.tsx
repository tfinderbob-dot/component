import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Database } from "lucide-react";
import { api, useMasters, label } from "../api";
import {
  PageHeader,
  SearchBox,
  Loading,
  ErrorNotice,
  Empty,
} from "../components/UI";
import {
  masterTypes,
  masterLabels,
  type Master,
  type MasterType,
} from "../../shared/types";
import MasterForm from "../forms/MasterForm";
export default function Masters() {
  const query = useMasters();
  const cache = useQueryClient();
  const [type, setType] = useState<MasterType>("models");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Master | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const all = query.data || [];
  const rows = all.filter(
    (m) =>
      m.type === type &&
      [m.name, m.modelNumber, m.partNumber, m.phone]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="ENTER ONCE. REUSE EVERYWHERE."
        title="Master data"
        description="Your customers, product models and component catalogue — connected."
        action={
          <Button
            onClick={() => {
              setError("");
              setEditing({ id: "", type, name: "", active: true });
            }}
          >
            <Plus size={19} /> Add{" "}
            {type === "models" ? "model" : type === "parts" ? "part" : "record"}
          </Button>
        }
      />
      <div className="master-layout">
        <nav className="master-nav">
          {masterTypes.map((t) => (
            <button
              key={t}
              className={t === type ? "active" : ""}
              onClick={() => {
                setType(t);
                setSearch("");
              }}
            >
              {masterLabels[t]}
              <span>{all.filter((m) => m.type === t).length}</span>
            </button>
          ))}
        </nav>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">REUSABLE RECORDS</span>
              <h2>{masterLabels[type]}</h2>
            </div>
          </div>
          <div className="list-toolbar">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={"Search " + masterLabels[type].toLowerCase() + "…"}
            />
          </div>
          {!rows.length ? (
            <Empty title="Your master data starts here">
              Add a record to make future requests faster.
            </Empty>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.name}</strong>
                        {m.modelNumber && <small>{m.modelNumber}</small>}
                        {m.partNumber && (
                          <small>
                            {m.partNumber}{" "}
                            {m.fruNumber && "· FRU " + m.fruNumber}
                          </small>
                        )}
                      </td>
                      <td>
                        <span>
                          {m.categoryId
                            ? label(all, m.categoryId)
                            : m.componentTypeId
                              ? label(all, m.componentTypeId)
                              : m.contact || m.phone || "—"}
                        </span>
                        <small className="truncate">
                          {m.specs || m.address || m.email}
                        </small>
                      </td>
                      <td>
                        <span
                          className={
                            "record-status " + (m.active ? "active" : "")
                          }
                        >
                          {m.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <Button
                          variant="link"
                          aria-label={"Edit " + m.name}
                          onClick={() => {
                            setError("");
                            setEditing(structuredClone(m));
                          }}
                        >
                          <Pencil size={17} /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <div className="info-note">
        <Database size={20} /> Device and replacement serial numbers belong to
        service jobs, not common master data.
      </div>
      <Modal
        show={Boolean(editing)}
        onHide={() => !busy && setEditing(null)}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editing?.id ? "Edit" : "Add"} {masterLabels[type].toLowerCase()}
          </Modal.Title>
        </Modal.Header>
        {editing && (
          <Form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(editing.id ? "/masters/" + editing.id : "/masters", {
                  method: editing.id ? "PUT" : "POST",
                  body: JSON.stringify(editing),
                });
                await cache.invalidateQueries({ queryKey: ["masters"] });
                setEditing(null);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Modal.Body>
              <ErrorNotice error={error} />
              <MasterForm value={editing} onChange={setEditing} masters={all} />
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="outline-secondary"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save record"}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </>
  );
}
