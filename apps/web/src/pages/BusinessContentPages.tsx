import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadPublicContent, readPublicContent } from "../public-content-cache";

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
  const [data, setData] = useState<T | null>(() => readPublicContent<T>(url));
  const [loading, setLoading] = useState(() => readPublicContent<T>(url) === null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const cached = readPublicContent<T>(url);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    loadPublicContent<T>(url, revision > 0)
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
      <img className="journal-cover-image" src="/images/materials-editorial.png" alt="Illustrative construction materials: cement, paint, wire and plumbing supplies" loading="lazy" />
      <div className="business-content-grid">
        {posts?.map((post) => (
          <article className="business-content-card" key={post.id}>
            {post.featuredImageUrl && <img src={post.featuredImageUrl} alt="Illustrative construction materials" loading="lazy" />}
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
      <div className="service-area-section"><h2>Local construction material guides</h2><div className="service-area-links">{serviceAreas.map((area) => <Link key={area.slug} to={`/locations/${area.slug}`}>{area.name} →</Link>)}</div></div>
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
      <p className="expert-directory-note">Our directory currently connects you to Material Square’s product enquiry desks. Share your specification and project PIN code to confirm what support is available. Technical design and on-site services are not assumed.</p>
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
      <div className="service-area-section"><h2>Project support across Delhi NCR</h2><div className="service-area-links">{serviceAreas.map((area) => <Link key={area.slug} to={`/locations/${area.slug}`}>{area.name} →</Link>)}</div></div>
      <ContentStatus {...state} />
    </section>
  );
}

const serviceAreas = [
  { slug: "noida", name: "Noida", description: "Browse construction material options and request a project quote for Noida. Share your sector, exact site PIN code, materials and delivery stage so the team can check current coverage and availability." },
  { slug: "greater-noida", name: "Greater Noida", description: "Planning a build in Greater Noida? Organise cement, steel, electrical, plumbing and finishing requirements into one material enquiry. Delivery coverage and timing are confirmed against your site PIN code." },
  { slug: "delhi", name: "Delhi", description: "For construction and renovation projects in Delhi, prepare a specification-led list with brand, grade, size, pack and quantity. Ask the team to confirm product options, quote details and delivery access for your location." },
  { slug: "gurugram", name: "Gurugram", description: "Material Square accepts project enquiries from Gurugram for listed construction materials. Share the project stage, bill of quantities and PIN code to check product availability, transport and delivery timing." },
  { slug: "ghaziabad", name: "Ghaziabad", description: "Build a clear material list for residential or commercial work in Ghaziabad, including the exact sizes, grades and pack options required. Local pricing, stock and delivery are confirmed for the specific site." },
  { slug: "faridabad", name: "Faridabad", description: "Request construction material options for a Faridabad project by sharing your site PIN code and item specifications. The team confirms the available catalogue, current quote and delivery plan before an order is placed." },
];

export function ServiceAreaPage() {
  const { slug = "" } = useParams();
  const area = serviceAreas.find((item) => item.slug === slug);
  if (!area) return <section className="business-content-page container"><h1>Service area not found</h1><p>Choose a city below to explore local project enquiries.</p><div className="service-area-links">{serviceAreas.map((item) => <Link key={item.slug} to={`/locations/${item.slug}`}>{item.name} →</Link>)}</div></section>;
  return <article className="business-content-page service-area-page container">
    <p className="eyebrow">MATERIAL SQUARE · DELHI NCR</p>
    <h1>Construction materials in {area.name}</h1>
    <p className="business-content-lead">{area.description}</p>
    <div className="service-area-actions"><Link className="btn btn-orange" to="/marketplace">Browse materials →</Link><Link className="btn btn-secondary" to="/get-quote">Request a project quote</Link></div>
    <section className="service-area-section"><h2>Materials for each stage of your project</h2><p>Explore cement and aggregates, steel, pipes and fittings, wires, paints and waterproofing, sanitaryware and tile adhesives. Product options depend on the published catalogue. Online reference examples, where shown, are not confirmed local prices or stock.</p><p>Include the product brand, grade or model, size, colour or finish, pack length or volume, quantity and expected delivery stage in your enquiry. This helps the team check the specification before preparing a quote.</p></section>
    <section className="service-area-section"><h2>Check coverage for your exact address</h2><p>Service availability can vary by PIN code, item, quantity and transport requirements. Share your site address, contact person and unloading notes; the team will confirm coverage, current availability, taxes, delivery charges and a suitable timing before you place an order.</p><Link className="business-content-link" to="/contact">Contact Material Square →</Link></section>
    <section className="service-area-section"><h2>More Delhi NCR locations</h2><div className="service-area-links">{serviceAreas.filter((item) => item.slug !== slug).map((item) => <Link key={item.slug} to={`/locations/${item.slug}`}>{item.name} →</Link>)}</div></section>
  </article>;
}
