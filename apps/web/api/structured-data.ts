type SchemaEntry = Record<string, unknown>;

function isSharedSiteEntity(entry: SchemaEntry) {
  const types = Array.isArray(entry["@type"])
    ? entry["@type"] as unknown[]
    : [entry["@type"]];
  return types.includes("Organization") || types.includes("WebSite");
}

function uniqueEntries(entries: SchemaEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = typeof entry["@id"] === "string"
      ? entry["@id"] as string
      : `${String(entry["@type"])}:${String(entry.name || "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readGraph(html: string) {
  const match = html.match(
    /<script\s+id=["']ms-page-structured-data["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) return { match: null, shared: [] as SchemaEntry[] };
  try {
    const value = JSON.parse(match[1]) as { "@graph"?: SchemaEntry[] };
    const graph = Array.isArray(value["@graph"])
      ? value["@graph"]
      : [value as SchemaEntry];
    return { match, shared: graph.filter(isSharedSiteEntity) };
  } catch {
    return { match, shared: [] as SchemaEntry[] };
  }
}

/** Keep site-wide identity schema and replace any route-specific graph entries. */
export function setPageStructuredData(html: string, pageEntries: SchemaEntry[]) {
  const { match, shared } = readGraph(html);
  const languageAwareTypes = new Set([
    "WebSite",
    "WebPage",
    "CollectionPage",
    "FAQPage",
    "BlogPosting",
  ]);
  const withDocumentLanguage = (entry: SchemaEntry) => {
    const types = Array.isArray(entry["@type"])
      ? entry["@type"] as unknown[]
      : [entry["@type"]];
    return types.some((type) => typeof type === "string" && languageAwareTypes.has(type))
      ? { inLanguage: "en-IN", ...entry }
      : entry;
  };
  const graph = uniqueEntries(
    [...shared, ...pageEntries].map(withDocumentLanguage),
  );
  const script = `<script id="ms-page-structured-data" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;
  return match
    ? html.replace(match[0], script)
    : html.replace("</head>", `  ${script}\n</head>`);
}

/** Drop stale page schema before adding a separate Product or Article node. */
export function retainSharedStructuredData(html: string) {
  const { match, shared } = readGraph(html);
  if (!match) return html;
  if (!shared.length) return html.replace(match[0], "");
  const script = `<script id="ms-page-structured-data" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": uniqueEntries(shared) }).replace(/</g, "\\u003c")}</script>`;
  return html.replace(match[0], script);
}
