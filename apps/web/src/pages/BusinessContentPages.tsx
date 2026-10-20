import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Search } from "lucide-react";
import { loadPublicContent, readPublicContent } from "../public-content-cache";
import ProductImage from "../components/ProductImage";
import { SEO_SERVICE_AREA_PAGES as serviceAreas, serviceAreaSlugs } from "@material-square/types";
import { useSiteContent } from "../site-content";

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
const journalTopics: { match: RegExp; label: string; key: string }[] = [
  { match: /cement|concrete/, label: "Cement & concrete", key: "cement" },
  { match: /waterproof|damp|leak/, label: "Waterproofing", key: "waterproofing" },
  { match: /wire|cable|electri/, label: "Electrical", key: "electrical" },
  { match: /pipe|plumb|cpvc|upvc/, label: "Pipes & plumbing", key: "plumbing" },
  { match: /paint|colour|color|finish/, label: "Paint & finishes", key: "finishes" },
  { match: /delivery|site|transport|storage/, label: "Site delivery", key: "delivery" },
  { match: /tile|adhesive|floor/, label: "Tiles & adhesives", key: "tiles" },
  { match: /list|plan|order|project/, label: "Project planning", key: "planning" },
];

function getJournalTopic(post: Pick<BlogPost, "slug" | "title">) {
  const searchable = `${post.slug} ${post.title}`.toLocaleLowerCase();
  return journalTopics.find(({ match }) => match.test(searchable)) || journalTopics[journalTopics.length - 1];
}

function JournalImage({ url, className = "", loading = "lazy" }: { url?: string | null; className?: string; loading?: "eager" | "lazy" }) {
  return url
    ? <ProductImage className={className} src={url} alt="" loading={loading} />
    : <div className={`journal-image-placeholder ${className}`.trim()} aria-hidden="true" />;
}

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
      setData(null);
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
  return <>
    {loading && <p className="content-status-loading" role="status">Loading content…</p>}
    {error && <div className="content-status-error"><p role="alert">{error}</p><button className="btn btn-secondary" onClick={retry}>Try again</button></div>}
  </>;
}

export function BlogIndexPage() {
  const content = useSiteContent();
  const { data: posts, ...state } = usePublicData<BlogPost[]>("/blogs");
  const [search, setSearch] = useState("");
  const [activeTopic, setActiveTopic] = useState("all");
  const activeAreas = new Set(serviceAreaSlugs(content["contact.location"]));
  const listedAreas = serviceAreas.filter((area) => activeAreas.has(area.slug));
  const filteredPosts = (posts || []).filter((post) =>
    (activeTopic === "all" || getJournalTopic(post).key === activeTopic) &&
      [post.title, post.summary, post.authorName].filter(Boolean).join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const availableTopics = journalTopics.filter((topic) =>
    posts?.some((post) => getJournalTopic(post).key === topic.key),
  );
  const activeTopicLabel = availableTopics.find((topic) => topic.key === activeTopic)?.label;
  const featuredPost = filteredPosts[0];
  const articleCards = featuredPost ? filteredPosts.slice(1) : [];
  return (
    <section className="business-content-page container journal-page">
      <header className="journal-heading">
        <p className="eyebrow">MATERIAL SQUARE JOURNAL</p>
        <h1>Build with a little more confidence.</h1>
        <p className="business-content-lead">Clear guidance on materials, planning, and the decisions that keep a project moving.</p>
        <label className="journal-search">
          <span className="sr-only">Search journal articles</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search articles" />
        </label>
        {availableTopics.length > 1 && <nav className="journal-topic-filter" aria-label="Filter articles by topic">
          <button type="button" className={activeTopic === "all" ? "is-active" : ""} aria-pressed={activeTopic === "all"} onClick={() => setActiveTopic("all")}>
            All topics <span>{posts?.length ?? 0}</span>
          </button>
          {availableTopics.map((topic) => {
            const count = posts?.filter((post) => getJournalTopic(post).key === topic.key).length ?? 0;
            return <button key={topic.key} type="button" className={activeTopic === topic.key ? "is-active" : ""} aria-pressed={activeTopic === topic.key} onClick={() => setActiveTopic(topic.key)}>
              {topic.label} <span>{count}</span>
            </button>;
          })}
        </nav>}
        {posts && <p className="journal-result-count" role="status">{filteredPosts.length} {filteredPosts.length === 1 ? "article" : "articles"}{search.trim() ? ` for “${search.trim()}”` : activeTopicLabel ? ` in ${activeTopicLabel}` : " in the journal"}</p>}
      </header>

      {featuredPost && <article className="journal-featured">
        <Link className="journal-featured-image" to={`/blogs/${featuredPost.slug}`} aria-label={`Read ${featuredPost.title}`}>
          <JournalImage url={featuredPost.featuredImageUrl} loading="eager" />
        </Link>
        <div className="journal-featured-copy">
          <span className="journal-kicker">FEATURED STORY</span>
          <small>{new Date(featuredPost.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}{featuredPost.authorName ? ` · ${featuredPost.authorName}` : ""}</small>
          <h2><Link to={`/blogs/${featuredPost.slug}`}>{featuredPost.title}</Link></h2>
          <p>{featuredPost.summary}</p>
          <Link className="journal-read-link" to={`/blogs/${featuredPost.slug}`}>Read the story <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </article>}

      {articleCards.length > 0 && <>
      <div className="journal-section-heading">
        <div><p className="eyebrow">FROM THE JOURNAL</p><h2>{activeTopicLabel ? `${activeTopicLabel} articles` : search.trim() ? "Search results" : "More ideas for your project"}</h2></div>
      </div>
      <div className="journal-grid">
        {articleCards.map((post) => (
          <article className="journal-card" key={post.id}>
            <Link className="journal-card-image" to={`/blogs/${post.slug}`} aria-label={`Read ${post.title}`}>
              <JournalImage url={post.featuredImageUrl} />
            </Link>
            <div className="journal-card-copy">
              <small>{new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}{post.authorName ? ` · ${post.authorName}` : ""}</small>
              <h3><Link to={`/blogs/${post.slug}`}>{post.title}</Link></h3>
              <p>{post.summary}</p>
              <Link className="journal-read-link" to={`/blogs/${post.slug}`}>Read article <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </article>
        ))}
      </div></>}
      {posts?.length === 0 && <div className="journal-empty" role="status"><BookOpen size={23} aria-hidden="true" /><h2>New articles are on the way</h2><p>Check back soon for practical ideas for your next project.</p></div>}
      {posts && posts.length > 0 && filteredPosts.length === 0 && <div className="journal-empty" role="status"><Search size={22} aria-hidden="true" /><h2>No matching articles</h2><p>Try another topic, material, project, or author.</p><button type="button" onClick={() => { setActiveTopic("all"); setSearch(""); }}>Clear filters</button></div>}
      <ContentStatus {...state} />

      {listedAreas.length > 0 && <div className="journal-local-guides"><div><p className="eyebrow">LOCAL KNOW-HOW</p><h2>Guides for your area</h2><p>Explore material and service information for nearby projects.</p></div><div className="service-area-links">{listedAreas.map((area) => <Link key={area.slug} to={`/locations/${area.slug}`}>{area.name}<ArrowRight size={15} aria-hidden="true" /></Link>)}</div></div>}
      <aside className="journal-cta"><div><p className="eyebrow">READY TO GET STARTED?</p><h2>Turn your plan into a clear material list.</h2><p>Share what you need and get help planning the next step.</p></div><Link className="btn btn-primary" to="/get-quote">Request a quote <ArrowRight size={17} aria-hidden="true" /></Link></aside>
    </section>
  );
}

export function BlogDetailPage() {
  const { slug = "" } = useParams();
  const { data: post, ...state } = usePublicData<BlogPost>(`/blogs/${encodeURIComponent(slug)}`);
  const { data: posts } = usePublicData<BlogPost[]>("/blogs");
  const paragraphs = post?.body.replace(/\\n/g, "\n").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean) || [];
  const relatedPosts = posts?.filter((item) => item.slug !== slug).slice(0, 3) || [];
  return (
    <article className="business-article container journal-article">
      {post && <header className="journal-article-header">
        <Link className="journal-back-link" to="/blogs"><ArrowLeft size={16} aria-hidden="true" /> Journal</Link>
        <p className="eyebrow">MATERIAL SQUARE JOURNAL</p>
        <h1>{post.title}</h1>
        <p className="business-content-lead">{post.summary}</p>
        <div className="journal-byline"><span>{post.authorName || "Material Square"}</span><span aria-hidden="true">·</span><time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time></div>
      </header>}
      {post && <JournalImage className="business-article-image" url={post.featuredImageUrl} loading="eager" />}
      {post ? <>
        <div className="business-article-body">{paragraphs.map((paragraph, index) => {
          const heading = paragraph.match(/^(#{1,3})\s+(.+)$/);
          if (heading?.[1].length === 1) return <h2 key={index}>{heading[2]}</h2>;
          if (heading?.[1].length === 2) return <h3 key={index}>{heading[2]}</h3>;
          if (heading?.[1].length === 3) return <h4 key={index}>{heading[2]}</h4>;
          return <p key={index}>{paragraph}</p>;
        })}</div>
        <aside className="journal-article-cta"><p className="eyebrow">YOUR NEXT STEP</p><h2>Need help planning materials?</h2><p>Share your requirements with our team and get a clear quotation.</p><Link className="btn btn-primary" to="/get-quote">Request a quote <ArrowRight size={17} aria-hidden="true" /></Link></aside>
        {relatedPosts.length > 0 && <section className="journal-related" aria-labelledby="journal-related-heading">
          <div className="journal-section-heading"><div><p className="eyebrow">KEEP READING</p><h2 id="journal-related-heading">More from the journal</h2></div></div>
          <div className="journal-related-grid">{relatedPosts.map((item) => <Link key={item.id} className="journal-related-card" to={`/blogs/${item.slug}`}>
            <JournalImage url={item.featuredImageUrl} />
            <span>{item.title}</span><ArrowRight size={17} aria-hidden="true" />
          </Link>)}</div>
        </section>}
        <Link className="journal-back-bottom" to="/blogs"><ArrowLeft size={16} aria-hidden="true" /> Browse all articles</Link>
      </> : <ContentStatus {...state} />}
    </article>
  );
}

export function ExpertsPage() {
  const content = useSiteContent();
  const { data: experts, ...state } = usePublicData<Expert[]>("/experts");
  const activeAreas = new Set(serviceAreaSlugs(content["contact.location"]));
  const listedAreas = serviceAreas.filter((area) => activeAreas.has(area.slug));
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
      <div className="business-content-grid expert-directory-grid">
        {filtered?.map((expert) => (
          <article className="business-content-card expert-card" key={expert.id}>
            {expert.imageUrl && <img src={expert.imageUrl} alt={`${expert.name}${expert.serviceType ? ` — ${expert.serviceType}` : ""}`} loading="lazy" decoding="async" />}
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
      {experts && experts.length > 0 && filtered?.length === 0 && <div className="business-content-empty" role="status"><p>No providers match these filters.</p><button type="button" className="btn btn-secondary" onClick={() => { setSearch(""); setService(""); setPincode(""); }}>Clear filters</button></div>}
      {listedAreas.length > 0 && <div className="service-area-section"><h2>Project support across your service area</h2><div className="service-area-links">{listedAreas.map((area) => <Link key={area.slug} to={`/locations/${area.slug}`}>{area.name} →</Link>)}</div></div>}
      <ContentStatus {...state} />
    </section>
  );
}

export function ServiceAreaPage() {
  const content = useSiteContent();
  const { slug = "" } = useParams();
  const area = serviceAreas.find((item) => item.slug === slug);
  const activeAreas = serviceAreaSlugs(content["contact.location"]);
  if (!area) return <section className="business-content-page container"><h1>Service area not found</h1><p>Choose a configured service location below, or share your PIN code with the team to check delivery availability.</p><div className="service-area-links">{serviceAreas.filter((item) => activeAreas.includes(item.slug)).map((item) => <Link key={item.slug} to={`/locations/${item.slug}`}>{item.name} →</Link>)}</div></section>;
  if (!activeAreas.includes(slug)) return <article className="business-content-page service-area-page container">
    <p className="eyebrow">DELIVERY INFORMATION</p>
    <h1>Check material delivery for {area.name}</h1>
    <p className="business-content-lead">Service coverage for {area.name} is not currently listed. Share your site PIN code and material requirements with the team to check whether delivery is available.</p>
    <div className="service-area-actions"><Link className="btn btn-orange" to="/contact">Contact Material Square →</Link><Link className="btn btn-secondary" to="/marketplace">Browse materials</Link></div>
  </article>;
  return <article className="business-content-page service-area-page container">
    <p className="eyebrow">DELIVERY INFORMATION</p>
    <h1>Construction materials in {area.name}</h1>
    <p className="business-content-lead">{area.description}</p>
    <div className="service-area-actions"><Link className="btn btn-orange" to="/marketplace">Browse materials →</Link><Link className="btn btn-secondary" to="/get-quote">Request a project quote</Link></div>
    <section className="service-area-section"><h2>Materials for each stage of your project</h2><p>Explore cement and aggregates, steel, pipes and fittings, wires, paints and waterproofing, sanitaryware and tile adhesives. Product options depend on the published catalogue. Online reference examples, where shown, are not confirmed local prices or stock.</p><p>Include the product brand, grade or model, size, colour or finish, pack length or volume, quantity and expected delivery stage in your enquiry. This helps the team check the specification before preparing a quote.</p></section>
    <section className="service-area-section"><h2>Check coverage for your exact address</h2><p>Service availability can vary by PIN code, item, quantity and transport requirements. Share your site address, contact person and unloading notes; the team will confirm coverage, current availability, taxes, delivery charges and a suitable timing before you place an order.</p><Link className="business-content-link" to="/contact">Contact Material Square →</Link></section>
    <section className="service-area-section"><h2>More service locations</h2><div className="service-area-links">{serviceAreas.filter((item) => item.slug !== slug && activeAreas.includes(item.slug)).map((item) => <Link key={item.slug} to={`/locations/${item.slug}`}>{item.name} →</Link>)}</div></section>
  </article>;
}
