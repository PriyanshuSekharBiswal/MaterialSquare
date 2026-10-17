import { useState } from "react";
import { formatEnumLabel } from "../../utils/formatEnumLabel";
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
  sortOrder?: number;
  createdAt: string;
  createdBy?: string | null;
};

type Props = {
  records: BlogPost[];
  token: string;
  customerUrl?: string;
  busy: boolean;
  mediaBusy: boolean;
  setMediaBusy: (busy: boolean) => void;
  onSignOut: () => void;
  submitForm: FormSubmit;
  mutate: Mutate;
  activeView: "write" | "articles";
  onViewChange: (view: "write" | "articles") => void;
  onOpenEdit: (blogId: string) => void;
  focusedBlog?: BlogPost;
  onExitFocusedEdit?: () => void;
};

const field = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();

export default function BlogManagementPanel({
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
  focusedBlog,
  onExitFocusedEdit,
}: Props) {
  const editingBlog = focusedBlog || null;
  const isFocusedEdit = Boolean(focusedBlog);
  const [blogPreview, setBlogPreview] = useState<{
    title: string;
    summary: string;
    body: string;
  } | null>(null);
  const [formRevision, setFormRevision] = useState(0);

  return (
    <>
      {!isFocusedEdit && (
        <div
          className="transportation-workflow-tabs blog-management-tabs"
          role="group"
          aria-label="Blog management tasks"
        >
          <button
            type="button"
            className={`transportation-workflow-tab${activeView === "write" ? " active" : ""}`}
            aria-pressed={activeView === "write"}
            onClick={() => onViewChange("write")}
          >
            Write article
          </button>
          <button
            type="button"
            className={`transportation-workflow-tab${activeView === "articles" ? " active" : ""}`}
            aria-pressed={activeView === "articles"}
            onClick={() => onViewChange("articles")}
          >
            Articles <span>{records.length}</span>
          </button>
        </div>
      )}
      {(isFocusedEdit || activeView === "write") && (
        <form
          key={editingBlog?.id || `new-blog-${formRevision}`}
          className="bc-form blog-editor-form"
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
                sortOrder: Number(field(f, "sortOrder")),
              }),
              editing ? `/admin/blogs/${editing.id}` : "/admin/blogs",
              editing ? "PATCH" : "POST",
            ).then((saved) => {
              if (saved) {
                setBlogPreview(null);
                setFormRevision((value) => value + 1);
                if (isFocusedEdit) onExitFocusedEdit?.();
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
              <input
                name="author"
                defaultValue={editingBlog?.authorName || ""}
              />
            </label>
            <ContentImageField
              token={token}
              initialUrl={editingBlog?.featuredImageUrl || ""}
              label="Featured image"
              recommendedSize="1200 × 675 px (16:9)"
              customerUrl={customerUrl}
              onBusyChange={setMediaBusy}
              onSignOut={onSignOut}
            />
            <label>
              Publish status
              <select
                name="status"
                defaultValue={editingBlog?.status || "DRAFT"}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Publish on website</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label>
              Display order
              <input
                name="sortOrder"
                type="number"
                min={0}
                max={100000}
                step={1}
                required
                defaultValue={editingBlog?.sortOrder ?? 0}
              />
              <small>Lower numbers appear first on the website.</small>
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
          <div className="blog-editor-actions">
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
          </div>
        </form>
      )}
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
      {!isFocusedEdit && activeView === "articles" && (
        <section className="blog-article-list">
          <h2>Articles</h2>
          {!records.length && <p className="bc-helper">No articles yet.</p>}
          {records.map((r) => (
            <article className="business-record blog-article-card" key={r.id}>
              <div className="blog-article-info">
                <div className="blog-article-title-row">
                  <strong>{r.title}</strong>
                  <span className={`blog-article-status is-${r.status.toLowerCase()}`}>
                    {formatEnumLabel(r.status)}
                  </span>
                </div>
                <p>{r.slug}</p>
                <form
                  className="blog-sort-order-form"
                  key={`${r.id}-${r.sortOrder ?? 0}`}
                  onSubmit={(event) => {
                    void submitForm(
                      event,
                      (values) => ({
                        sortOrder: Number(field(values, "sortOrder")),
                      }),
                      `/admin/blogs/${r.id}`,
                      "PATCH",
                    );
                  }}
                >
                  <label>
                    Display order
                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      required
                      defaultValue={r.sortOrder ?? 0}
                    />
                  </label>
                  <button className="bc-button" disabled={busy}>
                    Save order
                  </button>
                </form>
              </div>
              <div className="blog-article-side">
                <div className="blog-article-actions">
                  <button
                    className="bc-button"
                    disabled={busy}
                    onClick={() => onOpenEdit(r.id)}
                  >
                    Edit
                  </button>
                  {r.status === "PUBLISHED" ? (
                    <button
                      className="bc-button"
                      disabled={busy}
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
                      disabled={busy}
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
                      disabled={busy}
                      onClick={() =>
                        void mutate(`/admin/blogs/${r.id}`, "DELETE", {})
                      }
                    >
                      Archive
                    </button>
                  )}
                </div>
                <div className="blog-article-meta">
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
