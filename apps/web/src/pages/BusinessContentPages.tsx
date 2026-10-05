import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  featuredImageUrl?: string | null;
  publishedAt: string;
  authorName?: string | null;
};
type Expert = {
  id: string;
  name: string;
  serviceType: string;
  expertise: string;
  city?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  servicePincodes: string[];
};

function usePublicData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    fetch(`${import.meta.env.VITE_API_URL || "/api"}${url}`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? "This content is not available." : "We could not load this content. Please try again.");
        return response.json() as Promise<T>;
      })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "We could not load this content."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, revision]);
  return { data, loading, error, retry };
}

function ContentStatus({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  return <>{loading && <p role="status">Loading…</p>}{error && <div><p role="alert">{error}</p><button className="btn btn-secondary" onClick={retry}>Try again</button></div>}</>;
}

export function BlogIndexPage() {
  const { data: posts, ...state } = usePublicData<BlogPost[]>("/blogs");
  return (
    <section className="business-content-page container">
      <p className="eyebrow">MATERIAL SQUARE JOURNAL</p>
      <h1>Ideas for a better-built project</h1>
      <p className="business-content-lead">Practical guidance on choosing construction materials, planning procurement, and managing a site.</p>
      <div className="business-content-grid">
        {posts?.map((post) => (
          <article className="business-content-card" key={post.id}>
            {post.featuredImageUrl && <img src={post.featuredImageUrl} alt="" loading="lazy" />}
            <div className="business-content-card-copy">
              <small>{new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}{post.authorName ? ` · ${post.authorName}` : ""}</small>
              <h2><Link to={`/blogs/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.summary}</p>
              <Link className="business-content-link" to={`/blogs/${post.slug}`}>Read article <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        ))}
      </div>
      {posts?.length === 0 && <p className="business-content-empty">New articles are on the way.</p>}
      <ContentStatus {...state} />
    </section>
  );
}

export function BlogDetailPage() {
  const { slug = "" } = useParams();
  const { data: post, ...state } = usePublicData<BlogPost>(`/blogs/${encodeURIComponent(slug)}`);
  return (
    <article className="business-article container">
      <Link className="business-content-link" to="/blogs">← All articles</Link>
      {post?.featuredImageUrl && <img className="business-article-image" src={post.featuredImageUrl} alt="" />}
      {post ? <>
        <p className="eyebrow">MATERIAL SQUARE JOURNAL</p>
        <h1>{post.title}</h1>
        <p className="business-content-lead">{post.summary}</p>
        <small>{new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}{post.authorName ? ` · ${post.authorName}` : ""}</small>
        <div className="business-article-body">{post.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </> : <ContentStatus {...state} />}
    </article>
  );
}

export function ExpertsPage() {
  const { data: experts, ...state } = usePublicData<Expert[]>("/experts");
  const [search, setSearch] = useState("");
  const [service, setService] = useState("");
  const [pincode, setPincode] = useState("");
  const services = [...new Set(experts?.map(expert => expert.serviceType) || [])].sort();
  const filtered = experts?.filter(expert => (!service || expert.serviceType === service) &&
    (!pincode || expert.servicePincodes?.includes(pincode)) &&
    (!search.trim() || [expert.name, expert.expertise, expert.city, expert.description].join(" ").toLowerCase().includes(search.trim().toLowerCase())));
  return (
    <section className="business-content-page container">
      <p className="eyebrow">PROJECT SUPPORT</p>
      <h1>Experts and service providers</h1>
      <p className="business-content-lead">Find professionals listed by Material Square for your project needs.</p>
      <div className="directory-filters">
        <label>Search professionals<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, expertise or city"/></label>
        <label>Service<select value={service} onChange={event => setService(event.target.value)}><option value="">All services</option>{services.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Service PIN code<input inputMode="numeric" maxLength={6} value={pincode} onChange={event => setPincode(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 201301"/></label>
      </div>
      <div className="business-content-grid">
        {filtered?.map((expert) => (
          <article className="business-content-card expert-card" key={expert.id}>
            {expert.imageUrl && <img src={expert.imageUrl} alt="" loading="lazy" />}
            <div className="business-content-card-copy">
              <small>{expert.serviceType}{expert.city ? ` · ${expert.city}` : ""}</small>
              <h2>{expert.name}</h2>
              <strong>{expert.expertise}</strong>
              {expert.description && <p>{expert.description}</p>}
              {expert.email && <a className="business-content-link" href={`mailto:${expert.email}`}>Email provider</a>}
              {expert.phone && <a className="business-content-link" href={`tel:+91${expert.phone}`}>Contact provider <span aria-hidden="true">→</span></a>}
            </div>
          </article>
        ))}
      </div>
      {experts?.length === 0 && <p className="business-content-empty">Service providers will appear here as they are added.</p>}
      {experts && experts.length > 0 && filtered?.length === 0 && <p className="business-content-empty">No providers match these filters.</p>}
      <ContentStatus {...state} />
    </section>
  );
}
