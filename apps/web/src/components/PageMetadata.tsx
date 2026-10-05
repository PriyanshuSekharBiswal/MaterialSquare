import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { parsePolicy, type SiteContentKey } from "@material-square/types";
import { useSiteContent } from "../site-content";

type PublicArticleMetadata = {
  title: string;
  summary: string;
  featuredImageUrl: string | null;
};

const titleKeys: Record<string, SiteContentKey> = {
  "/": "seo.homeTitle",
  "/marketplace": "seo.marketplaceTitle",
  "/why-us": "seo.whyUsTitle",
  "/guides": "seo.guidesTitle",
  "/get-quote": "seo.quoteTitle",
  "/contact": "seo.contactTitle",
  "/blogs": "seo.blogsTitle",
  "/experts": "seo.expertsTitle",
};

function setMeta(
  selector: string,
  attribute: "name" | "property",
  name: string,
  value: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = value;
}

function setCanonical(pathname: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${window.location.origin}${pathname}`;
  setMeta('meta[property="og:url"]', "property", "og:url", canonical.href);
}

function setPageMetadata({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) {
  document.title = title;
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:type"]', "property", "og:type", "website");
  setMeta('meta[property="og:site_name"]', "property", "og:site_name", "Material Square");
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[property="og:image"]', "property", "og:image", image);
  setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
}

function brief(value: string, maximum = 160) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > maximum ? `${text.slice(0, maximum - 1).trimEnd()}…` : text;
}

export default function PageMetadata() {
  const content = useSiteContent();
  const { pathname } = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const defaultImage = new URL("/social-card.svg", window.location.origin).href;
    const defaultDescription = content["seo.description"];
    const isPrivacy = pathname === "/privacy";
    const isTerms = pathname === "/terms";
    const title = isPrivacy
      ? parsePolicy(content["policy.privacy"], "privacy").title
      : isTerms
        ? parsePolicy(content["policy.terms"], "terms").title
        : content[
            titleKeys[pathname] ||
              (pathname.startsWith("/blogs/") ? "seo.blogsTitle" : "seo.siteTitle")
          ];

    setCanonical(pathname);
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      pathname === "/account" || pathname.startsWith("/account/")
        ? "noindex, nofollow"
        : "index, follow",
    );
    setPageMetadata({
      title,
      description: defaultDescription,
      image: defaultImage,
    });

    const blogMatch = pathname.match(/^\/blogs\/([^/]+)$/);
    if (blogMatch) {
      const slug = encodeURIComponent(blogMatch[1]);
      fetch(`${import.meta.env.VITE_API_URL || "/api"}/blogs/${slug}`, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        signal: controller.signal,
      })
        .then((response) =>
          response.ok ? (response.json() as Promise<PublicArticleMetadata>) : null,
        )
        .then((article) => {
          if (!article || controller.signal.aborted) return;
          const articleTitle = `${article.title} | ${content["seo.siteTitle"]}`;
          const image = article.featuredImageUrl
            ? new URL(article.featuredImageUrl, window.location.origin).href
            : defaultImage;
          setPageMetadata({
            title: articleTitle,
            description: brief(article.summary) || defaultDescription,
            image,
          });
        })
        .catch(() => {
          // Keep the useful section-level metadata if a blog is unavailable.
        });
    }

    return () => controller.abort();
  }, [content, pathname]);

  return null;
}
