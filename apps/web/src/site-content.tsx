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
    let retryTimer: number | undefined;
    let retryDelay = 500;
    let requestInFlight = false;

    const loadPublishedContent = async () => {
      if (controller.signal.aborted || requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/site-content`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Public site content request failed (${response.status})`);
        const value = await response.json() as SiteContent;
        if (controller.signal.aborted) return;
        setContent(sanitizePublicSiteContent(value as Record<string, unknown>));
        retryDelay = 500;
      } catch {
        if (controller.signal.aborted) return;
        // The API may still be starting, or a brief network error may interrupt
        // the request. Keep retrying so saved coverage and other published copy
        // appear without requiring the visitor to reload the page.
        retryTimer = window.setTimeout(() => {
          retryTimer = undefined;
          void loadPublishedContent();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15_000);
      } finally {
        requestInFlight = false;
      }
    };

    const retryWhenOnline = () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      retryTimer = undefined;
      retryDelay = 500;
      void loadPublishedContent();
    };

    void loadPublishedContent();
    window.addEventListener("online", retryWhenOnline);
    return () => {
      controller.abort();
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener("online", retryWhenOnline);
    };
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
