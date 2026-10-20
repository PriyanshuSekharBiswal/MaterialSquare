function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ]!,
  );
}

function setMeta(html: string, kind: "name" | "property", key: string, value: string) {
  const matcher = new RegExp(`<meta\\s+${kind}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`;
  return matcher.test(html)
    ? html.replace(matcher, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
}

/** Ensure crawler and share previews always receive absolute image URLs. */
export function setSocialCardMetadata(html: string, origin: string) {
  const image = `${origin}/social-card-v2.png`;
  const alt = "Material Square social card showing construction materials organized for every project.";
  const tags: Array<["name" | "property", string, string]> = [
    ["property", "og:image", image],
    ["property", "og:image:type", "image/png"],
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "628"],
    ["property", "og:image:alt", alt],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:image", image],
    ["name", "twitter:image:alt", alt],
  ];
  return tags.reduce(
    (result, [kind, key, value]) => setMeta(result, kind, key, value),
    html,
  );
}
