import { createRequire } from "node:module";

type RuntimeTypes = typeof import("@material-square/types");

const require = createRequire(import.meta.url);
const runtimeTypes = require("@material-square/types") as RuntimeTypes;

export const {
  SEO_INDEXABLE_SERVICE_AREA_SLUGS,
  SEO_ROUTE_DESCRIPTIONS,
  SEO_SERVICE_AREA_PAGES,
  guideTabContent,
  parsePolicy,
  parseSocialLinks,
  publicFaqEntries,
  serviceAreaSlugs,
  visibleGuideTabs,
  websitePageDescription,
} = runtimeTypes;
