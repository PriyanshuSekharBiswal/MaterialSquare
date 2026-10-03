import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SITE_CONTENT_DEFAULTS, type SiteContent } from "@material-square/types";

const SiteContentContext = createContext<SiteContent>(SITE_CONTENT_DEFAULTS);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(SITE_CONTENT_DEFAULTS);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/site-content`, {
      headers: { Accept: "application/json" }, signal: controller.signal,
    }).then((response) => response.ok ? response.json() as Promise<SiteContent> : null)
      .then((value) => { if (value && !controller.signal.aborted) setContent({ ...SITE_CONTENT_DEFAULTS, ...value }); })
      .catch(() => { /* Saved copy is optional for browsing; compiled defaults stay visible. */ });
    return () => controller.abort();
  }, []);
  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
