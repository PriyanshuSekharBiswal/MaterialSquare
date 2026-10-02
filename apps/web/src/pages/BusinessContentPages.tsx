import { useEffect, useState } from "react";
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
};

function usePublicData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api${url}`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() as Promise<T> : null))
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setData(null); });
    return () => { active = false; };
  }, [url]);
  return data;
}

export function BlogIndexPage() {
  const posts = usePublicData<BlogPost[]>("/blogs");
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
      {posts === null && <p className="business-content-empty">Articles will appear here soon.</p>}
    </section>
  );
}

export function BlogDetailPage() {
  const { slug = "" } = useParams();
  const post = usePublicData<BlogPost>(`/blogs/${encodeURIComponent(slug)}`);
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
      </> : <p className="business-content-empty">This article is not available.</p>}
    </article>
  );
}

export function ExpertsPage() {
  const experts = usePublicData<Expert[]>("/experts");
  return (
    <section className="business-content-page container">
      <p className="eyebrow">PROJECT SUPPORT</p>
      <h1>Experts and service providers</h1>
      <p className="business-content-lead">Find professionals listed by Material Square for your project needs.</p>
      <div className="business-content-grid">
        {experts?.map((expert) => (
          <article className="business-content-card expert-card" key={expert.id}>
            {expert.imageUrl && <img src={expert.imageUrl} alt="" loading="lazy" />}
            <div className="business-content-card-copy">
              <small>{expert.serviceType}{expert.city ? ` · ${expert.city}` : ""}</small>
              <h2>{expert.name}</h2>
              <strong>{expert.expertise}</strong>
              {expert.description && <p>{expert.description}</p>}
              {expert.phone && <a className="business-content-link" href={`tel:+91${expert.phone}`}>Contact provider <span aria-hidden="true">→</span></a>}
            </div>
          </article>
        ))}
      </div>
      {experts?.length === 0 && <p className="business-content-empty">Service providers will appear here as they are added.</p>}
      {experts === null && <p className="business-content-empty">Service providers will appear here soon.</p>}
    </section>
  );
}
