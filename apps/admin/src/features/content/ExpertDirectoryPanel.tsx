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
}: Props) {
  const [editingExpert, setEditingExpert] = useState<ExpertProfile | null>(
    null,
  );
  const [formRevision, setFormRevision] = useState(0);

  return (
    <>
      <form
        key={editingExpert?.id || `new-expert-${formRevision}`}
        className="bc-form"
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
              imageUrl: field(f, "image") || (editingExpert ? null : undefined),
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
              setEditingExpert(null);
              setFormRevision((value) => value + 1);
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
            label="Image URL"
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
          <label className="bc-check">
            <input
              name="published"
              type="checkbox"
              defaultChecked={editingExpert?.isPublished || false}
            />{" "}
            Show on public website
          </label>
        </fieldset>
        <button className="bc-primary" disabled={busy || mediaBusy}>
          {editingExpert ? "Save provider changes" : "Save provider"}
        </button>
        {editingExpert && (
          <button
            type="button"
            className="bc-button"
            disabled={busy}
            onClick={() => setEditingExpert(null)}
          >
            Cancel provider edit
          </button>
        )}
      </form>
      <h2>Directory</h2>
      {records.map((r) => (
        <article className="business-record" key={r.id}>
          <div>
            <strong>{r.name}</strong>
            <p>
              {r.serviceType} · {r.expertise}
            </p>
            <small>{r.isPublished ? "Public" : "Hidden"}</small>
          </div>
          <button
            className="bc-button"
            disabled={busy}
            onClick={() => setEditingExpert(r)}
          >
            Edit provider
          </button>
          <button
            className="bc-button"
            onClick={() =>
              void mutate(`/admin/experts/${r.id}`, "PATCH", {
                isPublished: !r.isPublished,
              })
            }
          >
            {r.isPublished ? "Hide listing" : "Publish listing"}
          </button>
        </article>
      ))}
    </>
  );
}
