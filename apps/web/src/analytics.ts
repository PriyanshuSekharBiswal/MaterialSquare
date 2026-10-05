export type WebsiteAnalyticsEvent =
  | { type: "page_view"; target: "home" | "marketplace" | "why-us" | "guides" | "get-quote" | "contact" | "blogs" | "experts" | "account" }
  | { type: "product_view" | "add_to_list"; target: string }
  | { type: "request_handoff"; target: "whatsapp" | "email" };

/** Send aggregate, low-detail events only. Never include search text or customer fields. */
export function trackWebsiteEvent(event: WebsiteAnalyticsEvent) {
  if (new URLSearchParams(window.location.search).get("draftPreview") === "1") return;
  try {
    void fetch(`${import.meta.env.VITE_API_URL || "/api"}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch {
    // Analytics must never prevent browsing, adding to a list, or opening a request app.
  }
}
