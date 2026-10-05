import { useState } from "react";
import ContentImageField from "../../components/ContentImageField";
import type { FormSubmit, Mutate } from "../business/form-contracts";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  authorName?: string | null;
  featuredImageUrl?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  summary: string;
  body: string;
};

type Props = {
  records: BlogPost[];
  token: string;
  busy: boolean;
  mediaBusy: boolean;
  setMediaBusy: (busy: boolean) => void;
  onSignOut: () => void;
  submitForm: FormSubmit;
  mutate: Mutate;
};

const field = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();

export default function BlogManagementPanel({
  records,
  token,
  busy,
  mediaBusy,
  setMediaBusy,
  onSignOut,
  submitForm,
  mutate,
}: Props) {
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [blogPreview, setBlogPreview] = useState<{
    title: string;
    summary: string;
    body: string;
  } | null>(null);
  const [formRevision, setFormRevision] = useState(0);

  return (
    <>
      <form
        key={editingBlog?.id || `new-blog-${formRevision}`}
        className="bc-form"
        onSubmit={(e) => {
          const editing = editingBlog;
          void submitForm(
            e,
            (f) => ({
              title: field(f, "title"),
              slug: field(f, "slug")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, ""),
              summary: field(f, "summary"),
              body: field(f, "body"),
              featuredImageUrl: field(f, "image") || null,
              authorName: field(f, "author") || undefined,
              status: field(f, "status"),
            }),
            editing ? `/admin/blogs/${editing.id}` : "/admin/blogs",
            editing ? "PATCH" : "POST",
          ).then((saved) => {
            if (saved) {
              setEditingBlog(null);
              setBlogPreview(null);
              setFormRevision((value) => value + 1);
            }
          });
        }}
      >
        <h2>{editingBlog ? "Edit article" : "Write a blog post"}</h2>
        <div className="bc-fields">
          <label>
            Title
            <input
              name="title"
              required
              minLength={3}
              defaultValue={editingBlog?.title}
            />
          </label>
          <label>
            URL slug
            <input
              name="slug"
              required
              placeholder="choosing-cement"
              defaultValue={editingBlog?.slug}
            />
          </label>
          <label>
            Author
            <input name="author" defaultValue={editingBlog?.authorName || ""} />
          </label>
          <ContentImageField
            token={token}
            initialUrl={editingBlog?.featuredImageUrl || ""}
            label="Featured image URL"
            onBusyChange={setMediaBusy}
            onSignOut={onSignOut}
          />
          <label>
            Publish status
            <select name="status" defaultValue={editingBlog?.status || "DRAFT"}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Publish on website</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="bc-wide">
            Short summary
            <textarea
              name="summary"
              required
              minLength={10}
              defaultValue={editingBlog?.summary}
            />
          </label>
          <label className="bc-wide">
            Article content
            <textarea
              name="body"
              rows={8}
              required
              minLength={20}
              defaultValue={editingBlog?.body}
            />
          </label>
        </div>
        <button className="bc-primary" disabled={busy || mediaBusy}>
          {editingBlog ? "Save changes" : "Save article"}
        </button>
        <button
          type="button"
          className="bc-button"
          disabled={busy || mediaBusy}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) {
              const values = new FormData(form);
              setBlogPreview({
                title: field(values, "title"),
                summary: field(values, "summary"),
                body: field(values, "body"),
              });
            }
          }}
        >
          Preview article
        </button>
        {editingBlog && (
          <button
            className="bc-button"
            type="button"
            onClick={() => setEditingBlog(null)}
          >
            Cancel edit
          </button>
        )}
      </form>
      {blogPreview && (
        <article className="bc-form">
          <p>Draft preview — visible only to staff</p>
          <h2>{blogPreview.title}</h2>
          <p>{blogPreview.summary}</p>
          {blogPreview.body.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <button
            type="button"
            className="bc-button"
            onClick={() => setBlogPreview(null)}
          >
            Close article preview
          </button>
        </article>
      )}
      <h2>Articles</h2>
      {records.map((r) => (
        <article className="business-record" key={r.id}>
          <div>
            <strong>{r.title}</strong>
            <p>{r.slug}</p>
            <small>{r.status}</small>
          </div>
          <button className="bc-button" onClick={() => setEditingBlog(r)}>
            Edit
          </button>
          {r.status === "PUBLISHED" ? (
            <button
              className="bc-button"
              onClick={() =>
                void mutate(`/admin/blogs/${r.id}`, "PATCH", {
                  status: "DRAFT",
                })
              }
            >
              Unpublish
            </button>
          ) : (
            <button
              className="bc-button"
              onClick={() =>
                void mutate(`/admin/blogs/${r.id}`, "PATCH", {
                  status: "PUBLISHED",
                })
              }
            >
              Publish
            </button>
          )}
          {r.status !== "ARCHIVED" && (
            <button
              className="bc-button"
              onClick={() => void mutate(`/admin/blogs/${r.id}`, "DELETE", {})}
            >
              Archive
            </button>
          )}
        </article>
      ))}
    </>
  );
}
