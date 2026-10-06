import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { websitePages, sanitizePublicSiteContent, SITE_CONTENT_DEFAULTS, type SiteContent } from "@material-square/types";

const SiteContentContext = createContext(SITE_CONTENT_DEFAULTS as SiteContent);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(SITE_CONTENT_DEFAULTS);
  const [draftPreview, setDraftPreview] = useState(false);

  useEffect(() => {
    const isPreview = new URLSearchParams(window.location.search).get("draftPreview") === "1";
    if (isPreview) {
      setDraftPreview(true);
      let targetOrigin = "";
      try {
        const adminUrl = new URL(import.meta.env.VITE_ADMIN_APP_ORIGIN || window.location.origin);
        if (["http:", "https:"].includes(adminUrl.protocol) && !adminUrl.username && !adminUrl.password) {
          targetOrigin = adminUrl.origin;
        }
      } catch {
        // Without an explicitly configured admin origin, draft preview stays disabled.
      }

      if (targetOrigin && window.parent !== window) {
        const onMessage = (event: MessageEvent) => {
          if (event.source !== window.parent || event.origin !== targetOrigin) return;
          if (event.data?.type !== "material-square:site-content-preview") return;
          const value = event.data.content as Partial<SiteContent> | undefined;
          if (!value || typeof value !== "object") return;
          const draft = sanitizePublicSiteContent(value as Record<string, unknown>);
          draft["website.pages"] = JSON.stringify(websitePages(draft["website.pages"]).map(page => ({ ...page, published: true })));
          setContent(draft);
        };
        window.addEventListener("message", onMessage);
        const announceReady = () => window.parent.postMessage(
          { type: "material-square:site-content-preview:ready" },
          targetOrigin,
        );
        announceReady();
        const retry = window.setInterval(announceReady, 300);
        return () => {
          window.clearInterval(retry);
          window.removeEventListener("message", onMessage);
        };
      }
    }

    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/site-content`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<SiteContent> : null)
      .then((value) => {
        if (value && !controller.signal.aborted)
          setContent(sanitizePublicSiteContent(value as Record<string, unknown>));
      })
      .catch(() => {
        /* Saved copy is optional; compiled defaults stay visible. */
      });
    return () => controller.abort();
  }, []);

  return (
    <SiteContentContext.Provider value={content}>
      {draftPreview && <div className="draft-preview-banner">Unpublished draft preview <span>Only visible to staff</span></div>}
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
