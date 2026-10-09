import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Copy, RefreshCw, Search } from "lucide-react";

type MediaAsset = {
  id: string;
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  usage: {
    type: string;
    label: string;
    location: string;
  }[];
};
type MediaPage = {
  items: MediaAsset[];
  page: number;
  pageSize: number;
  total: number;
};

export default function MediaLibrary({
  token,
  onSignOut,
}: {
  token: string;
  onSignOut: () => void;
}) {
  const [result, setResult] = useState<MediaPage>({
    items: [],
    page: 1,
    pageSize: 24,
    total: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), search: query });
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/storage/media?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30000),
        },
      );
      const body = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok || !Array.isArray(body?.items))
        throw new Error(
          typeof body?.message === "string"
            ? body.message
            : "Could not load the media library.",
        );
      setResult(body as MediaPage);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load media.",
      );
    } finally {
      setLoading(false);
    }
  }, [onSignOut, page, query, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  async function copyUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedId(asset.id);
      window.setTimeout(() => setCopiedId(""), 1800);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the URL.");
    }
  }

  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <section className="panel-card panel-body media-library">
      <div className="media-library-heading">
        <div>
          <h2>Media library</h2>
          <p>
            Review uploads, see where tracked images are used, and copy their
            URLs. Reference checks cover products, blogs, experts, and saved
            website content.
          </p>
        </div>
        <button
          type="button"
          className="btn-sm btn-secondary btn-orange-outline"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      <form className="media-library-search" onSubmit={applySearch}>
        <label>
          Search uploaded images
          <input
            type="search"
            maxLength={120}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="File name or storage key"
          />
        </label>
        <button className="btn-sm btn-secondary" disabled={loading}>
          <Search size={15} /> Search
        </button>
      </form>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading uploaded images…</p>
      ) : !result.items.length ? (
        <p>No uploaded images match this search.</p>
      ) : (
        <>
          <div className="media-library-grid">
            {result.items.map((asset) => (
              <article className="media-library-item" key={asset.id}>
                <img src={asset.url} alt={asset.originalName} loading="lazy" />
                <div className="media-library-item-info">
                  <strong title={asset.originalName}>
                    {asset.originalName}
                  </strong>
                  <span>
                    {asset.mimeType} · {(asset.byteSize / 1024).toFixed(0)} KB ·{" "}
                    {new Date(asset.createdAt).toLocaleDateString("en-IN")}
                  </span>
                  <div className="media-library-usage">
                    <strong>
                      Used in {asset.usage.length} place
                      {asset.usage.length === 1 ? "" : "s"}
                    </strong>
                    {asset.usage.length > 0 ? (
                      <ul>
                        {asset.usage.map((reference, index) => (
                          <li
                            key={`${reference.type}-${reference.label}-${index}`}
                          >
                            {reference.type}: {reference.label} ·{" "}
                            {reference.location}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <small>No references found in tracked content.</small>
                    )}
                  </div>
                  <label>
                    Image URL
                    <input
                      readOnly
                      value={asset.url}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    onClick={() => void copyUrl(asset)}
                  >
                    <Copy size={14} />
                    {copiedId === asset.id ? "Copied" : "Copy URL"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="media-library-pagination">
            <span>
              {result.total} image{result.total === 1 ? "" : "s"} · Page {page}{" "}
              of {pageCount}
            </span>
            <div>
              <button
                type="button"
                className="btn-sm btn-secondary"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-sm btn-secondary"
                disabled={loading || page >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
