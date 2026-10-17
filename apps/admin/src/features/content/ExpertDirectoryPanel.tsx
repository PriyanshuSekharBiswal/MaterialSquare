import { useState } from "react";
import ContentImageField from "../../components/ContentImageField";
import type { FormSubmit, Mutate } from "../business/form-contracts";

export type ExpertProfile = {
  id: string;
  name: string;
  serviceType: string;
  expertise: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  servicePincodes: string[];
  description?: string | null;
  imageUrl?: string | null;
  isPublished: boolean;
  createdAt: string;
  createdBy?: string | null;
};

type Props = {
  records: ExpertProfile[];
  token: string;
  customerUrl?: string;
  busy: boolean;
  mediaBusy: boolean;
  setMediaBusy: (busy: boolean) => void;
  onSignOut: () => void;
  submitForm: FormSubmit;
  mutate: Mutate;
  activeView: "add" | "directory";
  onViewChange: (view: "add" | "directory") => void;
  onOpenEdit: (expertId: string) => void;
  focusedExpert?: ExpertProfile;
  onExitFocusedEdit?: () => void;
};

const field = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();

export default function ExpertDirectoryPanel({
  records,
  token,
  customerUrl,
  busy,
  mediaBusy,
  setMediaBusy,
  onSignOut,
  submitForm,
  mutate,
  activeView,
  onViewChange,
  onOpenEdit,
  focusedExpert,
  onExitFocusedEdit,
}: Props) {
  const [formRevision, setFormRevision] = useState(0);
  const editingExpert = focusedExpert || null;
  const isFocusedEdit = Boolean(focusedExpert);

  return (
    <>
      {!isFocusedEdit && (
        <div
          className="transportation-workflow-tabs expert-directory-tabs"
          role="group"
          aria-label="Expert directory tasks"
        >
          <button
            type="button"
            className={`transportation-workflow-tab${activeView === "add" ? " active" : ""}`}
            aria-pressed={activeView === "add"}
            onClick={() => onViewChange("add")}
          >
            Add provider
          </button>
          <button
            type="button"
            className={`transportation-workflow-tab${activeView === "directory" ? " active" : ""}`}
            aria-pressed={activeView === "directory"}
            onClick={() => onViewChange("directory")}
          >
            Directory <span>{records.length}</span>
          </button>
        </div>
      )}
      {(isFocusedEdit || activeView === "add") && (
        <form
          key={editingExpert?.id || `new-expert-${formRevision}`}
          className="bc-form expert-provider-form"
          onSubmit={(e) => {
            void submitForm(
              e,
              (f) => ({
                name: field(f, "name"),
                serviceType: field(f, "service"),
                expertise: field(f, "expertise"),
                phone: field(f, "phone") || (editingExpert ? null : undefined),
                email: field(f, "email") || (editingExpert ? null : undefined),
                city: field(f, "city") || (editingExpert ? null : undefined),
                description:
                  field(f, "description") || (editingExpert ? null : undefined),
                imageUrl:
                  field(f, "image") || (editingExpert ? null : undefined),
                servicePincodes: field(f, "pincodes")
                  .split(/[ ,]+/)
                  .filter(Boolean),
                isPublished: f.get("published") === "on",
              }),
              editingExpert
                ? `/admin/experts/${editingExpert.id}`
                : "/admin/experts",
              editingExpert ? "PATCH" : "POST",
            ).then((saved) => {
              if (saved) {
                setFormRevision((value) => value + 1);
                if (isFocusedEdit) onExitFocusedEdit?.();
              }
            });
          }}
        >
          <h2>
            {editingExpert
              ? "Edit professional or service provider"
              : "Add a professional or service provider"}
          </h2>
          <fieldset disabled={busy} className="bc-fields">
            <label>
              Name
              <input
                name="name"
                required
                minLength={2}
                maxLength={150}
                defaultValue={editingExpert?.name}
              />
            </label>
            <label>
              Service type
              <input
                name="service"
                required
                minLength={2}
                maxLength={100}
                defaultValue={editingExpert?.serviceType}
              />
            </label>
            <label>
              Expertise
              <input
                name="expertise"
                required
                minLength={2}
                maxLength={500}
                defaultValue={editingExpert?.expertise}
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                defaultValue={editingExpert?.phone || ""}
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={editingExpert?.email || ""}
              />
            </label>
            <label>
              City
              <input
                name="city"
                maxLength={100}
                defaultValue={editingExpert?.city || ""}
              />
            </label>
            <label>
              PIN codes
              <input
                name="pincodes"
                defaultValue={editingExpert?.servicePincodes?.join(", ") || ""}
              />
            </label>
            <ContentImageField
              token={token}
              initialUrl={editingExpert?.imageUrl || ""}
              label="Profile image"
              recommendedSize="800 × 800 px (1:1)"
              customerUrl={customerUrl}
              onBusyChange={setMediaBusy}
              onSignOut={onSignOut}
            />
            <label className="bc-wide">
              Description
              <textarea
                name="description"
                maxLength={5000}
                defaultValue={editingExpert?.description || ""}
              />
            </label>
          </fieldset>
          <div className="expert-provider-form-actions">
            <label className="bc-check">
              <input
                name="published"
                type="checkbox"
                defaultChecked={editingExpert?.isPublished || false}
              />
              Show on public website
            </label>
            <button className="bc-primary" disabled={busy || mediaBusy}>
              {editingExpert ? "Save provider changes" : "Save provider"}
            </button>
          </div>
        </form>
      )}
      {!isFocusedEdit && activeView === "directory" && (
        <section className="expert-directory-list">
          <h2>Directory</h2>
          {records.map((r) => (
            <article
              className="business-record expert-directory-card"
              key={r.id}
            >
              <div className="expert-directory-info">
                <div className="expert-directory-title-row">
                  <strong>{r.name}</strong>
                  <span
                    className={`expert-directory-status ${r.isPublished ? "is-public" : "is-hidden"}`}
                  >
                    {r.isPublished ? "Public" : "Hidden"}
                  </span>
                </div>
                <p>
                  {r.serviceType} · {r.expertise}
                </p>
              </div>
              <div className="expert-directory-side">
                <div className="expert-directory-actions">
                  <button
                    className="bc-button"
                    disabled={busy}
                    onClick={() => onOpenEdit(r.id)}
                  >
                    Edit provider
                  </button>
                  <button
                    className="bc-button"
                    disabled={busy}
                    onClick={() =>
                      void mutate(`/admin/experts/${r.id}`, "PATCH", {
                        isPublished: !r.isPublished,
                      })
                    }
                  >
                    {r.isPublished ? "Hide listing" : "Publish listing"}
                  </button>
                </div>
                <div className="expert-directory-meta">
                  <span>
                    Created by <strong>{r.createdBy || "Unknown"}</strong>
                  </span>
                  <time dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </time>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
