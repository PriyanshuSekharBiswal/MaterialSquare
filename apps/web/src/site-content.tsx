import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  SITE_CONTENT_DEFAULTS,
  type SiteContent,
} from "@material-square/types";

const SiteContentContext = createContext(SITE_CONTENT_DEFAULTS as SiteContent);
const DraftPreviewContext = createContext(false);
const PREVIEW_MESSAGE = "material-square:site-content-preview";

function isSiteContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Object.keys(SITE_CONTENT_DEFAULTS).every(
    (key) => typeof candidate[key] === "string",
  );
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [publishedContent, setPublishedContent] = useState<SiteContent>(
    SITE_CONTENT_DEFAULTS,
  );
  const [draftContent, setDraftContent] = useState<SiteContent | null>(null);
  const isPreviewRoute =
    new URLSearchParams(window.location.search).get("draftPreview") === "1";
  const allowedAdminOrigin = import.meta.env.VITE_ADMIN_APP_ORIGIN;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/site-content`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) =>
        response.ok ? (response.json() as Promise<SiteContent>) : null,
      )
      .then((value) => {
        if (value && !controller.signal.aborted)
          setPublishedContent({ ...SITE_CONTENT_DEFAULTS, ...value });
      })
      .catch(() => {
        /* Saved copy is optional for browsing; compiled defaults stay visible. */
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isPreviewRoute || window.parent === window || !allowedAdminOrigin)
      return;
    let parentOrigin: string;
    try {
      parentOrigin = new URL(allowedAdminOrigin).origin;
    } catch {
      return;
    }
    if (document.referrer && new URL(document.referrer).origin !== parentOrigin)
      return;

    let readyTimer: number | undefined;
    const sendReady = () =>
      window.parent.postMessage(
        { type: `${PREVIEW_MESSAGE}:ready` },
        parentOrigin,
      );
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parentOrigin)
        return;
      if (
        event.data?.type !== PREVIEW_MESSAGE ||
        !isSiteContent(event.data.content)
      )
        return;
      setDraftContent(event.data.content);
      if (readyTimer !== undefined) window.clearInterval(readyTimer);
    };
    window.addEventListener("message", onMessage);
    sendReady();
    readyTimer = window.setInterval(sendReady, 500);
    return () => {
      if (readyTimer !== undefined) window.clearInterval(readyTimer);
      window.removeEventListener("message", onMessage);
    };
  }, [allowedAdminOrigin, isPreviewRoute]);

  const content = draftContent ?? publishedContent;
  const previewActive = isPreviewRoute && draftContent !== null;
  return (
    <SiteContentContext.Provider value={content}>
      <DraftPreviewContext.Provider value={previewActive}>
        {previewActive && (
          <aside className="draft-preview-banner" role="status">
            Unpublished draft preview <span>Only visible in this preview</span>
          </aside>
        )}
        {children}
      </DraftPreviewContext.Provider>
    </SiteContentContext.Provider>
  );
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}

export function useDraftPreview(): boolean {
  return useContext(DraftPreviewContext);
}
