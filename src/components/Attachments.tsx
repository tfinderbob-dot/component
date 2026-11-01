import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "react-bootstrap";
import { FileText, Paperclip, Download } from "lucide-react";
import { api, formatDate } from "../api";
import { ErrorNotice } from "./UI";
import type { Job, Attachment } from "../../shared/types";
export default function Attachments({
  job,
  dirty,
}: {
  job: Job;
  dirty: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const imageUrl = (a: Attachment) =>
    `/api/jobs/${job.id}/attachments/${a.id}?preview=1`;
  const cache = useQueryClient();
  return (
    <section className="panel attachment-panel">
      <div className="panel-heading">
        <div>
          <h2>Documents & photos</h2>
          <p className="attachment-hint">
            Invoices, fault photos, claim documents and delivery proof. PDF, PNG
            or JPEG · Up to 5 MB.
          </p>
        </div>
        <Button
          variant="outline-primary"
          disabled={dirty || busy}
          onClick={() => input.current?.click()}
        >
          <Paperclip size={17} />
          {busy ? "Uploading…" : "Attach file"}
        </Button>
      </div>
      <div className="attachment-body">
        <ErrorNotice error={error} />
        {dirty && (
          <p className="text-muted mb-3">
            Save your changes before attaching documents.
          </p>
        )}
        <input
          ref={input}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          hidden
          aria-label="Upload job attachment"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setError("");
            if (f.size > 5 * 1024 * 1024) {
              setError("Choose a file smaller than 5 MB.");
              return;
            }
            setBusy(true);
            try {
              await api("/jobs/" + job.id + "/attachments", {
                method: "POST",
                headers: {
                  "Content-Type": "application/octet-stream",
                  "X-File-Name": encodeURIComponent(f.name),
                },
                body: f,
              });
              await cache.invalidateQueries({ queryKey: ["job", job.id] });
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
              if (input.current) input.current.value = "";
            }
          }}
        />
        {!job.attachments?.length ? (
          <p className="text-muted">No documents attached yet.</p>
        ) : (
          <div className="attachment-gallery">
            {job.attachments.map((a) => (
              <div className="attachment-card" key={a.id}>
                {["image/png", "image/jpeg"].includes(a.mime) &&
                  (failedImages.includes(a.id) ? (
                    <p className="preview-unavailable">
                      Image preview unavailable. Use Download to open the file.
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="attachment-thumbnail"
                      onClick={() => setPreview(a)}
                      aria-label={"Preview " + a.name}
                    >
                      <img
                        src={imageUrl(a)}
                        alt={a.name}
                        loading="lazy"
                        onError={() => setFailedImages((ids) => [...ids, a.id])}
                      />
                      <span>Click to enlarge</span>
                    </button>
                  ))}
                <a
                  className="attachment-row"
                  key={a.id}
                  href={`/api/jobs/${job.id}/attachments/${a.id}`}
                >
                  <FileText size={22} />
                  <div>
                    <strong>{a.name}</strong>
                    <small>
                      {Math.ceil(a.size / 1024)} KB · {formatDate(a.uploadedAt)}
                    </small>
                  </div>
                  <Download size={18} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal
        show={Boolean(preview)}
        onHide={() => setPreview(null)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{preview?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="image-preview-body">
          {preview && <img src={imageUrl(preview)} alt={preview.name} />}
        </Modal.Body>
        <Modal.Footer>
          {preview && (
            <a
              className="btn btn-outline-primary"
              href={`/api/jobs/${job.id}/attachments/${preview.id}`}
            >
              <Download size={18} /> Download image
            </a>
          )}
          <Button variant="secondary" onClick={() => setPreview(null)}>
            Close preview
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}
