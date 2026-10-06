import { Link, useLocation } from "react-router-dom";
import { websitePages } from "@material-square/types";
import { useSiteContent } from "../site-content";
import "./managed-website-page.css";
export default function ManagedWebsitePage() {
  const content = useSiteContent();
  const { pathname } = useLocation();
  const page = websitePages(content["website.pages"]).find(
    (page) => page.path === pathname && page.published,
  );
  if (!page)
    return (
      <section className="managed-page">
        <h1>Page unavailable</h1>
        <p>This page is unavailable or has not been published.</p>
        <Link to="/">Return home</Link>
      </section>
    );
  return (
    <article className="managed-page">
      <header>
        <h1>{page.title}</h1>
        {page.description && <p>{page.description}</p>}
      </header>
      {page.sections
        .filter((section) => section.visible)
        .map((section) => (
          <section
            key={section.id}
            className={`managed-section managed-section-${section.kind}`}
          >
            {section.imageUrl && (
              <img
                src={section.imageUrl}
                alt={section.imageAlt}
                loading={section.kind === "hero" ? "eager" : "lazy"}
              />
            )}
            <div>
              <h2>{section.title}</h2>
              {section.body && (
                <p className="managed-section-body">{section.body}</p>
              )}
              {section.buttonLabel && section.buttonPath && (
                <Link className="managed-page-cta" to={section.buttonPath}>
                  {section.buttonLabel}
                </Link>
              )}
            </div>
          </section>
        ))}
    </article>
  );
}
