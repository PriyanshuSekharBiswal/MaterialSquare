import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Info,
  Image,
  PackagePlus,
  Phone,
  RefreshCw,
  Save,
  Search,
  Tags,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  catalogueCategoryLabel,
  formatContactPhone,
  normalizeCatalogueCategory,
  resolveCatalogueCategoryId,
  parsePolicy,
  publicFaqEntries,
  sanitizePublicSiteContent,
  SITE_CONTENT_DEFAULTS,
  STOREFRONT_CATEGORIES,
  type ManagedCatalogueCategory,
  type SiteContent,
} from "@material-square/types";
import CatalogueVariantsEditor, {
  type EditableVariant,
} from "./CatalogueVariantsEditor";
import MaterialSquareLogo from "../../components/MaterialSquareLogo";
import { confirmAdminAction } from "../../components/confirmAdminAction";
import PartnerBrandsManager from "./PartnerBrandsManager";
import ProductDetailSurface from "../../../../../packages/storefront-ui/ProductDetailSurface";
import MarketplaceProductCard from "../../../../../packages/storefront-ui/MarketplaceProductCard";
import PartnerBrandLogo from "../../../../../packages/storefront-ui/PartnerBrandLogo";
import { buildProductDetailChoiceGroups } from "../../../../../packages/storefront-ui/product-detail-choices";
import { formatQuantityUnit, formatQuantityUnitText } from "../../quantity-format";
import "./catalogue-manager.css";

type Listing = {
  id: string;
  slug: string;
  code: string | null;
  name: string;
  brand: string;
  brandTagline: string | null;
  category: string;
  categoryLabel: string;
  unit: string;
  packaging: string | null;
  image: string | null;
  photoBanner: string | null;
  galleryImages: string[];
  variants: Variant[];
  grade: string | null;
  description: string | null;
  minOrderQty: string | null;
  dispatchTime: string | null;
  price: string | null;
  compareAtPrice: string | null;
  priceNote: string | null;
  offerLabel: string | null;
  offerStartsAt: string | null;
  offerEndsAt: string | null;
  isInStock: boolean;
  availabilityStatus: "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY";
  isPublished: boolean;
  features: string[];
  applications: string[];
  specifications: Record<string, string>;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  draftExpiresAt?: string | null;
};
type Variant = EditableVariant;
type CataloguePage = { items: Listing[]; page: number; pageSize: number; hasMore: boolean; maxSortOrder: number };
type ProductDraft = {
  savedAt: number;
  values: Record<string, string | boolean>;
  image: string;
  galleryImages: string[];
  variants: Variant[];
};
const PRODUCT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const productDraftKey = (id: string) =>
  `material-square:catalogue-draft:${id || "new"}`;

function StorefrontPreviewImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className="store-preview-placeholder">
        <PackagePlus size={36} />
        <span>
          {src ? "Image could not be loaded" : "Product image preview"}
        </span>
      </div>
    );
  }
  return (
    <img
      className="store-preview-product-image"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

function CatalogueHighlightsEditor({
  value,
  automaticRows,
  onChange,
}: {
  value: string[];
  automaticRows: Array<{ title: string; description: string }>;
  onChange: (value: string[]) => void;
}) {
  const rows = value.map((entry) => {
    const splitAt = entry.indexOf(" — ");
    return splitAt < 0
      ? { title: "", description: entry }
      : { title: entry.slice(0, splitAt), description: entry.slice(splitAt + 3) };
  });
  const encodeRows = (items: Array<{ title: string; description: string }>) =>
    items.map((row) => {
      const title = row.title.trim();
      const description = row.description.trim();
      return title || description ? `${title} — ${description}` : "";
    }).filter(Boolean);
  const updateRow = (index: number, key: "title" | "description", text: string) => {
    onChange(encodeRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: text } : row)));
  };
  return (
    <div className="catalogue-highlights-editor">
      {automaticRows.map((row) => (
        <div className="catalogue-highlight-row catalogue-highlight-row-auto" key={row.title}>
          <label>Title<input value={row.title} readOnly /></label>
          <label>Description<input value={row.description} readOnly /></label>
          <span className="catalogue-highlight-source">Automatic</span>
        </div>
      ))}
      {rows.map((row, index) => (
        <div className="catalogue-highlight-row" key={index}>
          <label>Title<input value={row.title} maxLength={120} placeholder="Highlight title" onChange={(event) => updateRow(index, "title", event.target.value)} /></label>
          <label>Description<input value={row.description} maxLength={500} placeholder="Short description" onChange={(event) => updateRow(index, "description", event.target.value)} /></label>
          <button type="button" className="catalogue-remove-attribute" aria-label={`Remove highlight ${index + 1}`} onClick={() => onChange(encodeRows(rows.filter((_, rowIndex) => rowIndex !== index)))}><X size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn-sm btn-secondary" onClick={() => onChange([...value, " "])}>Add highlight</button>
    </div>
  );
}

const blank: Listing = {
  id: "",
  slug: "",
  code: "",
  name: "",
  brand: "",
  brandTagline: "",
  category: "",
  categoryLabel: "",
  unit: "",
  packaging: "",
  image: "",
  photoBanner: "",
  grade: "",
  description: "",
  minOrderQty: "",
  dispatchTime: "",
  galleryImages: [],
  variants: [],
  price: null,
  compareAtPrice: null,
  priceNote: "",
  offerLabel: "",
  isInStock: false,
  availabilityStatus: "CHECK_AVAILABILITY",
  offerStartsAt: null,
  offerEndsAt: null,
  isPublished: false,
  features: [],
  applications: [],
  specifications: {},
  sortOrder: 0,
};
const MAX_GALLERY_IMAGES = 3;
const MAX_PRODUCT_PHOTOS = 4;
const MAX_PRODUCT_IMAGE_BYTES = 20 * 1024 * 1024;
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const fromLines = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const privateSpecKey =
  /(?:^|\s)(?:image source|price source|reference(?: note| price source| source updated| mrp)?|price observed)$/i;
const visibleSpecs = (
  specifications: Record<string, string> | null | undefined,
) =>
  Object.fromEntries(
    Object.entries(specifications || {}).filter(
      ([key, value]) =>
        !privateSpecKey.test(key.trim()) &&
        String(value || "").trim() &&
        !/^https?:\/\//i.test(String(value).trim()),
    ),
  );
const automaticHighlightTitles = new Set([
  "product name",
  "brand",
  "category",
  "options & variations",
]);
const splitHighlight = (entry: string) => {
  const splitAt = entry.indexOf(" — ");
  return splitAt < 0
    ? { title: "", description: entry }
    : { title: entry.slice(0, splitAt), description: entry.slice(splitAt + 3) };
};
const manualHighlights = (features: string[]) =>
  features.filter((entry) => !automaticHighlightTitles.has(splitHighlight(entry).title.trim().toLocaleLowerCase()));
const nonEmptyVariants = (variants: Variant[]) =>
  variants.filter((variant) =>
    Boolean(
      variant.label.trim() ||
        variant.code?.trim() ||
        variant.image?.trim() ||
        variant.galleryImages?.some((image) => image.trim()) ||
        variant.price != null ||
        Object.entries(variant.attributes || {}).some(([key, value]) => key.trim() || value.trim()),
    ),
  );
const summarizeVariantChoices = (variants: Variant[]) => {
  const choices = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const [rawName, rawValue] of Object.entries(variant.attributes || {})) {
      const name = rawName.trim();
      const value = rawValue.trim();
      if (!name || !value) continue;
      const values = choices.get(name) || new Set<string>();
      values.add(value);
      choices.set(name, values);
    }
  }
  const summary = [...choices.entries()]
    .map(([name, values]) => `${name}: ${[...values].join(", ")}`)
    .join(" · ");
  if (summary) return summary;
  return [...new Set(variants.map((variant) => variant.label.trim()).filter(Boolean))].join(", ");
};
const boundedFeature = (title: string, description: string) => {
  const prefix = `${title} — `;
  const limit = Math.max(0, 300 - prefix.length);
  const value = description.trim();
  return `${prefix}${value.length > limit ? `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…` : value}`;
};
const customerPriceNote = (note: string | null | undefined) => {
  const value = String(note || "").trim();
  return !value ||
    /(?:online )?reference|observed|source listing|rate can change|confirm.{0,80}(?:price|availability|ordering)|(?:price|availability).{0,80}confirm|local availability|availability before ordering|seller listing|local price and taxes may differ/i.test(
      value,
    )
    ? ""
    : value;
};
const customerProductDescription = (description: string | null | undefined) => {
  const value = String(description || "").trim();
  return !value ||
    /(?:online )?reference|source listing|rate can change|confirm.{0,80}(?:price|availability|ordering)|(?:price|availability).{0,80}confirm|local availability|availability before ordering|reference price/i.test(
      value,
    )
    ? ""
    : value;
};
const customerCardFeatures = (features: string[] | null | undefined) =>
  (features || []).filter((feature) => Boolean(customerProductDescription(feature)));
const specsFromLines = (value: FormDataEntryValue | null) =>
  visibleSpecs(
    Object.fromEntries(
      String(value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf(":");
          return separator < 1
            ? [line, ""]
            : [
                line.slice(0, separator).trim(),
                line.slice(separator + 1).trim(),
              ];
        })
        .filter(([key]) => key),
    ),
  );
const lines = (values: string[]) => values.join("\n");
const dateField = (value: string | null) => (value ? value.slice(0, 10) : "");
const normalizeListing = (row: Listing): Listing => ({
  ...row,
  availabilityStatus:
    row.availabilityStatus ||
    (row.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY"),
  galleryImages: Array.isArray(row.galleryImages) ? row.galleryImages : [],
  variants: Array.isArray(row.variants)
    ? row.variants.map((variant) => ({
        ...variant,
        galleryImages: Array.isArray(variant.galleryImages)
          ? variant.galleryImages
          : [],
        availabilityStatus:
          variant.availabilityStatus ||
          (variant.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY"),
        inStock: variant.availabilityStatus
          ? variant.availabilityStatus === "IN_STOCK"
          : Boolean(variant.isInStock),
      }))
    : [],
  category: normalizeCatalogueCategory(row.categoryLabel || row.category),
  categoryLabel: catalogueCategoryLabel(row.categoryLabel || row.category),
  features: Array.isArray(row.features) ? row.features : [],
  applications: Array.isArray(row.applications) ? row.applications : [],
  specifications:
    row.specifications && typeof row.specifications === "object"
      ? row.specifications
      : {},
});
const marketplacePreviewCardData = (listing: Listing, variant?: Variant) => {
  const price = variant?.price ?? listing.price;
  const compareAtPrice = variant?.compareAtPrice ?? listing.compareAtPrice;
  const explicitSpecification = listing.grade?.trim() || listing.specifications.standard?.trim();
  const specification = explicitSpecification || [...new Set([
    ...Object.entries(listing.specifications || {}),
    ...Object.entries(variant?.attributes || {}),
  ].filter(([key, value]) => /grade|standard|spec|volt|size|section|material|type|class|pressure|thickness|rating|insulation|fire|flame|core/i.test(key) && value?.trim())
    .map(([, value]) => value.trim()))].slice(0, 3).join(" · ");
  const optionAttributes = variant
    ? Object.entries(variant.attributes || {}).filter(([, value]) => !variant.label.toLocaleLowerCase().includes(String(value).toLocaleLowerCase())).map(([key, value]) => `${key}: ${value}`)
    : [];
  const optionLabel = variant ? [variant.label, ...optionAttributes].filter(Boolean).join(" · ") : "";
  const discount = price != null && compareAtPrice != null && Number(compareAtPrice) > Number(price)
    ? Math.round(((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100)
    : 0;
  const offerLabel = variant?.offerLabel || listing.offerLabel || (discount ? `${discount}% OFF` : "");
  const availability = variant
    ? variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")
    : listing.availabilityStatus || (listing.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
  const cardAvailability = availability || (listing.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
  const variantCode = variant?.code || listing.code;
  const version = variant?.code?.match(/-V(\d+)(?:-|$)/i)?.[1];
  const minimumOrder = variant?.minOrderQuantity != null
    ? formatQuantityUnit(variant.minOrderQuantity, "")
    : formatQuantityUnitText(listing.minOrderQty, listing.unit).replace(/\s*×\s*.*$/, "");
  return {
    code: version ? `${listing.code} · V${version}` : variantCode,
    image: variant?.image || variant?.galleryImages?.[0] || listing.image || listing.galleryImages[0] || "",
    specification: specification || undefined,
    optionLabel,
    sizeGuide: !variant && !listing.grade ? listing.specifications.sizes || undefined : undefined,
    price,
    compareAtPrice: price != null && compareAtPrice != null && Number(compareAtPrice) > Number(price) ? `₹${Number(compareAtPrice).toLocaleString("en-IN")}` : undefined,
    priceCaption: price != null ? "Price per unit" : listing.variants.some((option) => option.price != null) ? "Starting from" : "Pricing",
    priceLabel: price != null ? `₹${Number(price).toLocaleString("en-IN")}` : "Request a quote",
    availability: cardAvailability,
    availabilityLabel: cardAvailability === "IN_STOCK" ? "In stock" : cardAvailability === "OUT_OF_STOCK" ? "Out of stock" : "Check availability",
    minimumOrderLabel: `MOQ: ${minimumOrder || "Confirm"}`,
    bannerLabel: offerLabel || listing.photoBanner || "",
    bannerKind: offerLabel || (!discount && listing.photoBanner) ? "explicit" as const : "calculated" as const,
  };
};
const marketplacePreviewWhatsAppHref = (phone: string, product: string, option?: string) => {
  const number = phone.replace(/\D/g, "");
  if (!number) return undefined;
  const message = `Hi, I’d like to ask about ${product}${option ? ` (${option})` : ""}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

export default function CatalogueManager({
  token,
  role,
  onSignOut,
  initialSearch = "",
  customerUrl,
}: {
  token: string;
  role: string;
  onSignOut: () => void;
  initialSearch?: string;
  customerUrl?: string;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [catalogueMaxSortOrder, setCatalogueMaxSortOrder] = useState(-1);
  const catalogueMaxSortOrderRef = useRef(catalogueMaxSortOrder);
  catalogueMaxSortOrderRef.current = catalogueMaxSortOrder;
  const [catalogueServerPage, setCatalogueServerPage] = useState(1);
  const catalogueServerPageRef = useRef(1);
  const [catalogueHasMore, setCatalogueHasMore] = useState(false);
  const [loadingMoreCatalogue, setLoadingMoreCatalogue] = useState(false);
  const [catalogueSearchHasMore, setCatalogueSearchHasMore] = useState(false);
  const [searchingCatalogue, setSearchingCatalogue] = useState(false);
  const listingsRef = useRef<Listing[]>([]);
  listingsRef.current = listings;
  const restoringCatalogueEditorId = useRef<string | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishProgress, setPublishProgress] = useState<{
    productName: string;
    percent: number;
    message: string;
    state: "working" | "complete" | "error";
  } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [catalogueQuery, setCatalogueQuery] = useState(() => new URLSearchParams(window.location.search).get("catalogueSearch") || initialSearch);
  const [catalogueRevision, setCatalogueRevision] = useState(0);
  const [brandFilter, setBrandFilter] = useState(() => new URLSearchParams(window.location.search).get("catalogueBrand") || "all");
  const [categoryFilter, setCategoryFilter] = useState(() => {
    const value = new URLSearchParams(window.location.search).get("catalogueCategory") || "all";
    return value === "all" ? value : normalizeCatalogueCategory(value);
  });
  const [publicationFilter, setPublicationFilter] = useState(() => new URLSearchParams(window.location.search).get("cataloguePublication") || "all");
  const [availabilityFilter, setAvailabilityFilter] = useState(() => new URLSearchParams(window.location.search).get("catalogueAvailability") || "all");
  const [catalogueSort, setCatalogueSort] = useState(() => new URLSearchParams(window.location.search).get("catalogueSort") || "recent");
  const [cataloguePage, setCataloguePage] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get("cataloguePage")) || 1));
  const [productInterest, setProductInterest] = useState<
    Record<string, number>
  >({});
  const [managingBrands, setManagingBrands] = useState(() => new URLSearchParams(window.location.search).get("catalogueView") === "brands");
  const selectCatalogueView = (showBrands: boolean) => {
    const url = new URL(window.location.href);
    if (showBrands) url.searchParams.set("catalogueView", "brands");
    else url.searchParams.delete("catalogueView");
    window.history.pushState({ ...(window.history.state ?? {}), catalogueView: showBrands ? "brands" : "products" }, "", `${url.pathname}${url.search}${url.hash}`);
    setManagingBrands(showBrands);
  };
  const [addProductChooserOpen, setAddProductChooserOpen] = useState(false);
  const [partnerBrandOptions, setPartnerBrandOptions] = useState<string[]>([]);
  const [previewPartnerBrands, setPreviewPartnerBrands] = useState<Array<{ id?: string; name: string; logoUrl?: string | null }>>([]);
  const [catalogueCategoryOptions, setCatalogueCategoryOptions] = useState<ManagedCatalogueCategory[]>(() => STOREFRONT_CATEGORIES.map(({ id, label }) => ({ id, label, active: true, aliases: [] })));
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<ProductDraft | null>(
    null,
  );
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const [previewVariantId, setPreviewVariantId] = useState("");
  const [previewQuantity, setPreviewQuantity] = useState("1");
  const [previewSpecification, setPreviewSpecification] = useState("");
  const [previewSelectedImage, setPreviewSelectedImage] = useState("");
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent>(() => ({
    ...SITE_CONTENT_DEFAULTS,
  }));
  const productForm = useRef<HTMLFormElement>(null);
  const productEditorOpener = useRef<HTMLElement | null>(null);
  const wasProductEditorOpen = useRef(false);
  const filtersInitialized = useRef(false);
  const saveAsDraftOnSubmit = useRef(false);
  const previewStage = useRef<HTMLDivElement>(null);
  const canManage = ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"].includes(role);
  const productEditorOpen = editing !== null;
  const previewBrand = (name: string) => previewPartnerBrands.find((brand) => brand.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()) || { name };

  useEffect(() => {
    if (productEditorOpen) {
      wasProductEditorOpen.current = true;
      return;
    }
    if (!wasProductEditorOpen.current) return;
    wasProductEditorOpen.current = false;
    const opener = productEditorOpener.current;
    productEditorOpener.current = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }, [productEditorOpen]);

  const openAddProductChooser = (opener: HTMLElement) => {
    productEditorOpener.current = opener;
    setAddProductChooserOpen(true);
  };

  useEffect(() => {
    if (publishProgress?.state !== "working") return;
    const timer = window.setInterval(() => {
      setPublishProgress((current) =>
        current?.state === "working"
          ? {
              ...current,
              percent:
                current.percent >= 84
                  ? current.percent
                  : Math.min(82, current.percent + 3),
            }
          : current,
      );
    }, 180);
    return () => window.clearInterval(timer);
  }, [publishProgress?.state]);

  useEffect(() => {
    if (!uploadSuccess) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUploadSuccess(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [uploadSuccess]);

  useEffect(() => {
    if (!productEditorOpen) return;
    const frame = window.requestAnimationFrame(() => {
      productForm.current?.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [productEditorOpen]);

  useEffect(() => {
    if (!productEditorOpen || busy) return;
    const closeProductEditorOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || previewOpen) return;
      if (exitPromptOpen) setExitPromptOpen(false);
      else requestProductEditorClose();
    };
    window.addEventListener("keydown", closeProductEditorOnEscape);
    return () => window.removeEventListener("keydown", closeProductEditorOnEscape);
  }, [busy, draftSavedAt, exitPromptOpen, previewOpen, productEditorOpen]);

  useEffect(() => {
    if (initialSearch) setCatalogueQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }
    setCataloguePage(1);
  }, [
    catalogueQuery,
    brandFilter,
    categoryFilter,
    publicationFilter,
    availabilityFilter,
    catalogueSort,
  ]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (managingBrands) url.searchParams.set("catalogueView", "brands");
    else url.searchParams.delete("catalogueView");
    const values: Array<[string, string, string]> = [
      ["catalogueSearch", catalogueQuery, ""],
      ["catalogueBrand", brandFilter, "all"],
      ["catalogueCategory", categoryFilter, "all"],
      ["cataloguePublication", publicationFilter, "all"],
      ["catalogueAvailability", availabilityFilter, "all"],
      ["catalogueSort", catalogueSort, "recent"],
      ["cataloguePage", String(cataloguePage), "1"],
    ];
    for (const [key, value, defaultValue] of values) {
      if (value && value !== defaultValue) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [availabilityFilter, brandFilter, cataloguePage, catalogueQuery, catalogueSort, categoryFilter, managingBrands, publicationFilter]);

  useEffect(() => {
    if (!addProductChooserOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAddProductChooserOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [addProductChooserOpen]);

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  useEffect(() => {
    if (!previewOpen || !previewListing) return;
    const initialVariant = previewListing.variants.find((variant) =>
      (variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")) === "IN_STOCK",
    ) || previewListing.variants[0];
    const initialMinimum = Number(initialVariant?.minOrderQuantity || previewListing.minOrderQty?.match(/[\d.]+/)?.[0] || 0);
    setPreviewVariantId(initialVariant?.id || initialVariant?.draftKey || "");
    setPreviewQuantity(String(Math.max(1, initialMinimum)));
    setPreviewSpecification("");
    setPreviewSelectedImage("");
  }, [previewOpen, previewListing?.id]);

  useEffect(() => {
    if (!previewOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const stage = previewStage.current;
      if (!stage) return;
      if (previewMode !== "card") {
        stage.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      const product = stage.querySelector<HTMLElement>(
        ".store-preview-current-product",
      );
      if (!product) return;
      const stickyHeaders = stage.querySelectorAll<HTMLElement>(
        ".store-preview-topline, .catalogue-preview-sitebar",
      );
      const headerHeight = Array.from(stickyHeaders).reduce(
        (height, header) => height + header.getBoundingClientRect().height,
        0,
      );
      const stageTop = stage.getBoundingClientRect().top;
      const productTop = product.getBoundingClientRect().top;
      stage.scrollTo({
        top: Math.max(
          0,
          stage.scrollTop + productTop - stageTop - headerHeight - 12,
        ),
        behavior: "auto",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [previewOpen, previewMode, previewListing?.id]);

  const brands = [
    ...new Set(listings.map((product) => product.brand).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const categories = [
    ...new Map(
      listings
        .filter((product) => product.category?.trim())
        .map((product) => {
          const value = product.categoryLabel || product.category;
          return [normalizeCatalogueCategory(value), catalogueCategoryLabel(value)] as const;
        }),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const normalizedQuery = catalogueQuery.trim().toLocaleLowerCase();
  const normalizedTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const filteredListings = listings.filter((product) => {
    const searchable = [
      product.name,
      product.brand,
      product.code,
      product.slug,
      product.categoryLabel,
      product.unit,
      product.grade,
      product.description,
      ...product.variants.flatMap((variant) => [
        variant.label,
        variant.code,
        variant.unit,
        ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [
          key,
          value,
        ]),
      ]),
      ...product.features,
      ...Object.values(visibleSpecs(product.specifications)),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    const matchesQuery = normalizedTerms.every((term) => searchable.includes(term));
    const matchesBrand = brandFilter === "all" || product.brand === brandFilter;
    const matchesCategory =
      categoryFilter === "all" || normalizeCatalogueCategory(product.categoryLabel || product.category) === categoryFilter;
    const matchesPublication =
      publicationFilter === "all" ||
      (publicationFilter === "published"
        ? product.isPublished
        : !product.isPublished);
    const availabilityStatuses = product.variants.length
      ? product.variants.map((variant) => variant.availabilityStatus)
      : [product.availabilityStatus];
    const matchesAvailability =
      availabilityFilter === "all" ||
      availabilityStatuses.includes(
        availabilityFilter as Listing["availabilityStatus"],
      );
    return (
      matchesQuery &&
      matchesBrand &&
      matchesCategory &&
      matchesPublication &&
      matchesAvailability
    );
  });
  const visibleListings = [...filteredListings].sort((left, right) => {
    if (catalogueSort === "interest")
      return (
        (productInterest[right.id] || 0) - (productInterest[left.id] || 0) ||
        left.name.localeCompare(right.name)
      );
    if (catalogueSort === "name") return left.name.localeCompare(right.name);
    if (catalogueSort === "price-asc" || catalogueSort === "price-desc") {
      const getPrice = (product: Listing) =>
        Number(
          product.variants.find(
            (variant) => variant.price != null && variant.price !== "",
          )?.price ??
            product.price ??
            Number.MAX_SAFE_INTEGER,
        );
      return (
        (catalogueSort === "price-asc" ? 1 : -1) *
        (getPrice(left) - getPrice(right))
      );
    }
    const leftAdded = left.updatedAt || left.createdAt
      ? Date.parse(left.updatedAt || left.createdAt || "")
      : left.sortOrder;
    const rightAdded = right.updatedAt || right.createdAt
      ? Date.parse(right.updatedAt || right.createdAt || "")
      : right.sortOrder;
    return rightAdded - leftAdded || left.name.localeCompare(right.name);
  });
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(visibleListings.length / pageSize));
  const currentPage = Math.min(cataloguePage, pageCount);
  const pageListings = visibleListings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const detailPreviewVariant = previewListing?.variants.find(
    (variant) => (variant.id || variant.draftKey || "") === previewVariantId,
  ) || previewListing?.variants[0];
  function selectPreviewVariant(variant?: Variant) {
    if (!variant) return;
    setPreviewVariantId(variant.id || variant.draftKey || "");
    setPreviewSelectedImage(variant.image || "");
    const minimum = Number(variant.minOrderQuantity || previewListing?.minOrderQty?.match(/[\d.]+/)?.[0] || 0);
    setPreviewQuantity((current) => Number(current) < minimum ? String(minimum) : current);
  }
  const previewGridNeighbors = previewListing
    ? listings
        .filter(
          (listing) => listing.isPublished && listing.id !== previewListing.id,
        )
        .sort(
          (left, right) =>
            Number(right.category === previewListing.category) -
            Number(left.category === previewListing.category),
        )
        .slice(0, 3)
    : [];
  const previewMainCard = previewListing
    ? marketplacePreviewCardData(previewListing, detailPreviewVariant)
    : null;
  const previewQuantityBreaks = (detailPreviewVariant?.quantityBreaks || [])
    .slice()
    .sort((left, right) => left.minimumQuantity - right.minimumQuantity);
  const activePreviewQuantityBreak = previewQuantityBreaks
    .filter((item) => Number(previewQuantity) >= item.minimumQuantity)
    .at(-1);
  const previewDetailPrice =
    activePreviewQuantityBreak?.unitPrice ?? detailPreviewVariant?.price ?? previewListing?.price ?? null;
  const previewDetailSelectionLabel = [
    detailPreviewVariant?.label,
    ...Object.entries(detailPreviewVariant?.attributes || {}).map(([key, value]) => `${key}: ${value}`),
    previewSpecification.trim(),
  ].filter(Boolean).join(" · ");
  const previewDetailPriceNote = customerPriceNote(
    detailPreviewVariant?.priceNote || previewListing?.priceNote,
  );
  const previewReturnPolicy = parsePolicy(siteContent["policy.returns"], "returns");
  const previewFaqEntries = publicFaqEntries(siteContent);
  const previewDescription = customerProductDescription(
    previewListing?.description,
  );
  const previewDetailHighlights = previewListing
    ? Object.entries(visibleSpecs({
        ...previewListing.specifications,
        ...(detailPreviewVariant?.attributes || {}),
      }))
    : [];
  const previewDetailAvailability =
    detailPreviewVariant?.availabilityStatus ||
    previewListing?.availabilityStatus ||
    (detailPreviewVariant?.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
  const previewDetailCompareAtPrice = activePreviewQuantityBreak
    ? null
    : detailPreviewVariant?.compareAtPrice ?? previewListing?.compareAtPrice;
  const previewDetailDiscount = previewDetailPrice != null && previewDetailCompareAtPrice != null && Number(previewDetailCompareAtPrice) > Number(previewDetailPrice)
    ? Math.round(((Number(previewDetailCompareAtPrice) - Number(previewDetailPrice)) / Number(previewDetailCompareAtPrice)) * 100)
    : 0;
  const previewDetailChoiceGroups = buildProductDetailChoiceGroups(
    previewListing?.variants || [],
    detailPreviewVariant,
    selectPreviewVariant,
    previewListing?.price,
  );

  const request = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${path}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(65000),
        },
      );
      const result = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok) {
        const fieldErrors = result?.issues?.fieldErrors;
        const detailMessages =
          fieldErrors && typeof fieldErrors === "object"
            ? Object.entries(fieldErrors).flatMap(([field, messages]) =>
                Array.isArray(messages)
                  ? messages
                      .filter(
                        (message): message is string =>
                          typeof message === "string",
                      )
                      .map((message) => `${field}: ${message}`)
                  : [],
              )
            : [];
        const formErrors = Array.isArray(result?.issues?.formErrors)
          ? result.issues.formErrors.filter(
              (message: unknown): message is string =>
                typeof message === "string",
            )
          : [];
        const details = [...detailMessages, ...formErrors];
        throw new Error(
          details.length
            ? `${typeof result?.message === "string" ? result.message : "Could not save catalogue changes."}: ${details.join("; ")}`
            : typeof result?.message === "string"
              ? result.message
              : "Could not save catalogue changes.",
        );
      }
      return result as T;
    },
    [token, onSignOut],
  );

  useEffect(() => {
    const material = catalogueQuery.trim().slice(0, 160);
    setSearchingCatalogue(false);
    setCatalogueSearchHasMore(false);
    if (material.length < 2) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setSearchingCatalogue(true);
      const params = new URLSearchParams({ material, page: "1", pageSize: "100" });
      void request<{ items: Listing[]; hasMore: boolean }>(
        `/products/catalogue/matches?${params}`,
      )
        .then((result) => {
          if (!active) return;
          setCatalogueSearchHasMore(result.hasMore);
          const matches = result.items
            .filter((row) => row.isPublished || !row.draftExpiresAt || Date.parse(row.draftExpiresAt) > Date.now())
            .map(normalizeListing);
          setListings((current) => {
            const merged = new Map(current.map((row) => [row.id, row]));
            matches.forEach((row) => merged.set(row.id, row));
            return [...merged.values()];
          });
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : "Could not search the full catalogue.");
        })
        .finally(() => {
          if (active) setSearchingCatalogue(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [catalogueQuery, catalogueRevision, request]);

  useEffect(() => {
    let active = true;
    void request<SiteContent>("/site-content")
      .then((content) => {
        if (active) setSiteContent(sanitizePublicSiteContent(content));
      })
      .catch(() => {
        if (active) setSiteContent({ ...SITE_CONTENT_DEFAULTS });
      });
    return () => {
      active = false;
    };
  }, [request]);

  useEffect(() => {
    let active = true;
    void request<{ topProductsByIntent?: { id: string; addToList: number }[] }>(
      "/analytics/overview?days=30",
    )
      .then((analytics) => {
        if (active)
          setProductInterest(
            Object.fromEntries(
              (analytics.topProductsByIntent || []).map((product) => [
                product.id,
                product.addToList || 0,
              ]),
            ),
          );
      })
      .catch(() => {
        if (active) setProductInterest({});
      });
    return () => {
      active = false;
    };
  }, [request]);

  async function uploadImage(file: File, input: HTMLInputElement) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP product image.");
      input.value = "";
      return;
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setError("Product images must be 20 MB or smaller.");
      input.value = "";
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    setUploadSuccess(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
          signal: AbortSignal.timeout(120000),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;
      if (response.status === 401) onSignOut();
      if (!response.ok || !result?.url)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not upload this product image.",
        );
      setEditing((current) =>
        current ? { ...current, image: result.url! } : current,
      );
      setPreviewListing((current) =>
        current ? { ...current, image: result.url! } : current,
      );
      setNotice("Image uploaded. Save the product to publish it.");
      setUploadSuccess("Main product photo uploaded");
      input.value = "";
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload this product image.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadGalleryPhoto(
    file: File,
    input: HTMLInputElement,
    index: number,
  ) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP product image.");
      input.value = "";
      return;
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setError("Product images must be 20 MB or smaller.");
      input.value = "";
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    setUploadSuccess(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
          signal: AbortSignal.timeout(120000),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;
      if (response.status === 401) onSignOut();
      if (!response.ok || !result?.url)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not upload this product image.",
        );
      setEditing((current) => {
        if (!current) return current;
        const galleryImages = [...(current.galleryImages || [])];
        galleryImages[index] = result.url!;
        return { ...current, galleryImages };
      });
      setPreviewListing((current) => {
        if (!current) return current;
        const galleryImages = [...(current.galleryImages || [])];
        galleryImages[index] = result.url!;
        return { ...current, galleryImages };
      });
      setNotice("Product photo uploaded. Save the product to keep it.");
      setUploadSuccess("Product photo uploaded");
      input.value = "";
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload this product image.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadVariantImage(
    file: File,
    input: HTMLInputElement,
    index: number,
    photoIndex: number,
  ) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP product image.");
      input.value = "";
      return;
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setError("Product images must be 20 MB or smaller.");
      input.value = "";
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    setUploadSuccess(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
          signal: AbortSignal.timeout(120000),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;
      if (response.status === 401) onSignOut();
      const updatePhoto = (variant: Listing["variants"][number]) => {
        if (photoIndex === 0) return { ...variant, image: result.url! };
        const galleryImages = [...(variant.galleryImages || [])];
        galleryImages[photoIndex - 1] = result.url!;
        return { ...variant, galleryImages: galleryImages.slice(0, 3) };
      };
      if (!response.ok || !result?.url)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not upload this option image.",
        );
      setEditing((current) =>
        current
          ? {
              ...current,
              variants: current.variants.map((variant, rowIndex) =>
                rowIndex === index
                  ? updatePhoto(variant)
                  : variant,
              ),
            }
          : current,
      );
      setPreviewListing((current) =>
        current
          ? {
              ...current,
              variants: current.variants.map((variant, rowIndex) =>
                rowIndex === index
                  ? updatePhoto(variant)
                  : variant,
              ),
            }
          : current,
      );
      setNotice("Option photo uploaded. Save the product to keep it.");
      setUploadSuccess("Option photo uploaded");
      input.value = "";
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload this option image.",
      );
    } finally {
      setBusy(false);
    }
  }

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const results: CataloguePage[] = [];
      for (let page = 1; page <= Math.max(1, catalogueServerPageRef.current); page += 1) {
        results.push(await request<CataloguePage>(`/products/catalogue?page=${page}&pageSize=50`));
      }
      const result = results[results.length - 1];
      const loadedListings = results.flatMap((page) => page.items);
      const uniqueListings = [...new Map(loadedListings.map((listing) => [listing.id, listing])).values()];
      catalogueServerPageRef.current = result.page;
      setCatalogueServerPage(result.page);
      setCatalogueHasMore(result.hasMore);
      setCatalogueMaxSortOrder(result.maxSortOrder);
      setListings(
        uniqueListings
          .filter((row) => {
            if (row.isPublished) return true;
            if (!row.draftExpiresAt) return true;
            return Date.parse(row.draftExpiresAt) > Date.now();
          })
          .map(normalizeListing),
      );
      setCatalogueRevision((revision) => revision + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the catalogue.",
      );
    } finally {
      setBusy(false);
    }
  }, [request]);
  const loadMoreCatalogue = useCallback(async () => {
    if (!catalogueHasMore || loadingMoreCatalogue) return;
    const nextPage = catalogueServerPage + 1;
    setLoadingMoreCatalogue(true);
    setError("");
    try {
      const result = await request<CataloguePage>(
        `/products/catalogue?page=${nextPage}&pageSize=50`,
      );
      const nextRows = result.items
        .filter((row) => row.isPublished || !row.draftExpiresAt || Date.parse(row.draftExpiresAt) > Date.now())
        .map(normalizeListing);
      setListings((current) => {
        const merged = new Map(current.map((row) => [row.id, row]));
        nextRows.forEach((row) => merged.set(row.id, row));
        return [...merged.values()];
      });
      setCatalogueServerPage(result.page);
      catalogueServerPageRef.current = result.page;
      setCatalogueHasMore(result.hasMore);
      setCatalogueMaxSortOrder(result.maxSortOrder);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load more products.");
    } finally {
      setLoadingMoreCatalogue(false);
    }
  }, [catalogueHasMore, catalogueServerPage, loadingMoreCatalogue, request]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    let active = true;
    void Promise.all([
      request<Array<{ id?: string; name: string; logoUrl?: string | null; isActive: boolean }>>("/products/catalogue/partner-brands"),
      request<ManagedCatalogueCategory[]>("/products/catalogue/categories"),
    ])
      .then(([brands, categories]) => {
        if (active) {
          setPartnerBrandOptions(brands.filter((brand) => brand.isActive).map((brand) => brand.name));
          setPreviewPartnerBrands(brands.filter((brand) => brand.isActive));
          setCatalogueCategoryOptions(categories);
        }
      }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [request]);

  useEffect(() => {
    if (!editing || !recoveredDraft || !productForm.current) return;
    for (const [name, value] of Object.entries(recoveredDraft.values)) {
      const control = productForm.current.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "checkbox")
        control.checked = Boolean(value);
      else if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement
      ) {
        if (name === "specifications")
          control.value = Object.entries(specsFromLines(String(value)))
            .map(([key, item]) => `${key}: ${item}`)
            .join("\n");
        else if (name === "priceNote")
          control.value = customerPriceNote(String(value));
        else control.value = String(value);
      }
    }
    setEditing((current) => current ? {
      ...current,
      brand: String(recoveredDraft.values.brand || current.brand),
      category: String(recoveredDraft.values.category || current.category),
    } : current);
    setDraftSavedAt(recoveredDraft.savedAt);
    setNotice(
      "Recovered this product’s unsaved changes. They remain private until you save the product.",
    );
    setRecoveredDraft(null);
  }, [editing?.id, recoveredDraft]);

  useEffect(() => {
    if (!editing) return;
    const key = productDraftKey(editing.id);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const previous = JSON.parse(raw) as ProductDraft;
      const draft: ProductDraft = {
        ...previous,
        savedAt: Date.now(),
        image: editing.image || "",
        galleryImages: editing.galleryImages || [],
        variants: editing.variants || [],
      };
      localStorage.setItem(key, JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
    } catch {
      // Keep editing available if browser recovery storage is unavailable.
    }
  }, [editing?.id, editing?.image, editing?.galleryImages, editing?.variants]);

  useEffect(() => {
    if (!editing || draftSavedAt === null) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [editing?.id, draftSavedAt]);

  function captureProductDraft(event: FormEvent<HTMLFormElement>) {
    if (!editing) return;
    const values: ProductDraft["values"] = {};
    for (const [name, value] of new FormData(event.currentTarget).entries()) {
      const control = event.currentTarget.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "checkbox")
        values[name] = control.checked;
      else values[name] = String(value);
    }
    const formValues = new FormData(event.currentTarget);
    setPreviewListing({
      ...editing,
      name: String(formValues.get("name") || "").trim(),
      brand: String(formValues.get("brand") || "").trim(),
      slug: String(formValues.get("slug") || "").trim(),
      code: editing.code || null,
      category: String(formValues.get("category") || "").trim(),
      categoryLabel: String(formValues.get("categoryLabel") || "").trim(),
      unit: String(formValues.get("unit") || "").trim(),
      grade: String(formValues.get("grade") || "").trim() || null,
      packaging: String(formValues.get("packaging") || "").trim() || null,
      brandTagline: String(formValues.get("brandTagline") || "").trim() || null,
      image: String(formValues.get("image") || "").trim() || null,
      photoBanner:
        String(formValues.get("photoBanner") || "").trim() || null,
      price: String(formValues.get("price") || "").trim() || null,
      compareAtPrice:
        String(formValues.get("compareAtPrice") || "").trim() || null,
      priceNote:
        customerPriceNote(String(formValues.get("priceNote") || "")) || null,
      offerLabel: String(formValues.get("offerLabel") || "").trim() || null,
      minOrderQty: String(formValues.get("minOrderQty") || "").trim() || null,
      dispatchTime: String(formValues.get("dispatchTime") || "").trim() || null,
      description: String(formValues.get("description") || "").trim() || null,
      features: fromLines(formValues.get("features")),
      applications: fromLines(formValues.get("applications")),
      specifications: specsFromLines(formValues.get("specifications")),
      galleryImages: fromLines(formValues.get("galleryImages")),
      isPublished: formValues.get("isPublished") === "on",
      availabilityStatus: String(
        formValues.get("availabilityStatus") || "CHECK_AVAILABILITY",
      ) as Listing["availabilityStatus"],
      isInStock: formValues.get("availabilityStatus") === "IN_STOCK",
    });
    const draft: ProductDraft = {
      savedAt: Date.now(),
      values,
      image: editing.image || "",
      galleryImages: editing.galleryImages || [],
      variants: editing.variants || [],
    };
    try {
      localStorage.setItem(productDraftKey(editing.id), JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
    } catch {
      setNotice(
        "This browser could not save a recovery copy. Save the product before leaving this page.",
      );
    }
  }

  function requestProductEditorClose() {
    if (draftSavedAt !== null) {
      setExitPromptOpen(true);
      return;
    }
    clearCatalogueEditorLocation();
    setEditing(null);
    setPreviewListing(null);
  }

  function exitWithoutSaving() {
    try {
      localStorage.removeItem(productDraftKey(editing?.id || ""));
    } catch {
      // Browser recovery storage is optional.
    }
    setExitPromptOpen(false);
    clearCatalogueEditorLocation();
    setEditing(null);
    setDraftSavedAt(null);
    setRecoveredDraft(null);
    setPreviewListing(null);
  }

  function saveDraftAndClose() {
    if (!productForm.current) return;
    saveAsDraftOnSubmit.current = true;
    productForm.current.requestSubmit();
  }

  function recoverableDraftFor(product: Listing): ProductDraft | null {
    try {
      const raw = localStorage.getItem(productDraftKey(product.id));
      if (!raw) return null;
      const value = JSON.parse(raw) as ProductDraft;
      if (
        !value ||
        !Number.isFinite(value.savedAt) ||
        Date.now() - value.savedAt > PRODUCT_DRAFT_TTL_MS
      ) {
        localStorage.removeItem(productDraftKey(product.id));
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  function clearCatalogueEditorLocation() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("catalogueEditor")) return;
    url.searchParams.delete("catalogueEditor");
    const state = { ...(window.history.state ?? {}) } as Record<string, unknown>;
    delete state.catalogueEditor;
    window.history.replaceState(state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function restoreCatalogueEditorFromLocation() {
    const editorId = new URLSearchParams(window.location.search).get("catalogueEditor");
    if (!editorId) {
      setEditing(null);
      setPreviewListing(null);
      setPreviewOpen(false);
      setExitPromptOpen(false);
      return;
    }
    const currentListings = listingsRef.current;
    const base = editorId === "new"
      ? { ...blank, sortOrder: catalogueMaxSortOrderRef.current + 1 }
      : currentListings.find((product) => product.id === editorId);
    if (!base && editorId !== "new") {
      if (restoringCatalogueEditorId.current === editorId) return;
      restoringCatalogueEditorId.current = editorId;
      void request<Listing[]>(
        `/products/catalogue/lookup?ids=${encodeURIComponent(editorId)}`,
      )
        .then((matches) => {
          if (new URLSearchParams(window.location.search).get("catalogueEditor") !== editorId) return;
          const listing = matches[0];
          if (!listing) {
            clearCatalogueEditorLocation();
            setError("This product is no longer available in the catalogue.");
            return;
          }
          const restoredListing = normalizeListing(listing);
          setListings((current) => current.some((row) => row.id === restoredListing.id)
            ? current
            : [...current, restoredListing]);
          openCatalogueEditor(restoredListing);
        })
        .catch((cause) => {
          setError(cause instanceof Error ? cause.message : "Could not restore this product editor.");
        })
        .finally(() => {
          if (restoringCatalogueEditorId.current === editorId) restoringCatalogueEditorId.current = null;
        });
      return;
    }
    if (!base) return;
    openCatalogueEditor(base);
  }

  function openCatalogueEditor(base: Listing) {
    const recovery = recoverableDraftFor(base);
    const restored = {
      ...base,
      ...(recovery ? { image: recovery.image, galleryImages: recovery.galleryImages, variants: nonEmptyVariants(recovery.variants) } : {}),
    };
    setEditing(restored);
    setPreviewListing(restored);
    setPreviewMode("card");
    setRecoveredDraft(recovery);
    setDraftSavedAt(recovery?.savedAt ?? null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saveAsDraft = saveAsDraftOnSubmit.current;
    saveAsDraftOnSubmit.current = false;
    const form = event.currentTarget;
    if (!saveAsDraft && !form.reportValidity()) return;
    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const rawPrice = String(values.get("price") || "").trim();
    const rawCompare = String(values.get("compareAtPrice") || "").trim();
    const enteredSlug = slugify(String(values.get("slug") || name)) || `draft-${Date.now()}`;
    const draftingPublishedProduct = saveAsDraft && Boolean(editing?.isPublished);
    const payload = {
      slug: draftingPublishedProduct
        ? `draft-${enteredSlug.slice(0, 100)}-${Date.now()}`
        : enteredSlug,
      code: draftingPublishedProduct ? null : formProduct.code || null,
      name: name || (saveAsDraft ? "Untitled product" : name),
      brand: String(values.get("brand") || "").trim(),
      brandTagline: String(values.get("brandTagline") || "").trim() || null,
      category: String(values.get("category") || "").trim() || (saveAsDraft ? "draft" : ""),
      categoryLabel: String(values.get("categoryLabel") || "").trim() || (saveAsDraft ? "Draft product" : ""),
      unit: String(values.get("unit") || "").trim() || (saveAsDraft ? "unit" : ""),
      packaging: String(values.get("packaging") || "").trim() || null,
      image: String(values.get("image") || "").trim() || null,
      photoBanner: String(values.get("photoBanner") || "").trim() || null,
      galleryImages: fromLines(values.get("galleryImages")),
      grade: String(values.get("grade") || "").trim() || null,
      description: String(values.get("description") || "").trim() || null,
      minOrderQty: String(values.get("minOrderQty") || "").trim() || null,
      dispatchTime: String(values.get("dispatchTime") || "").trim() || null,
      price: rawPrice ? Number(rawPrice) : null,
      compareAtPrice:
        rawCompare && (!saveAsDraft || !rawPrice || Number(rawCompare) >= Number(rawPrice))
          ? Number(rawCompare)
          : null,
      priceNote:
        customerPriceNote(String(values.get("priceNote") || "")) || null,
      offerLabel: String(values.get("offerLabel") || "").trim() || null,
      offerStartsAt:
        saveAsDraft &&
        String(values.get("offerStartsAt") || "") >
          String(values.get("offerEndsAt") || "")
          ? null
          : String(values.get("offerStartsAt") || "") || null,
      offerEndsAt:
        saveAsDraft &&
        String(values.get("offerStartsAt") || "") >
          String(values.get("offerEndsAt") || "")
          ? null
          : String(values.get("offerEndsAt") || "") || null,
      availabilityStatus: String(
        values.get("availabilityStatus") || "CHECK_AVAILABILITY",
      ) as Listing["availabilityStatus"],
      isInStock: values.get("availabilityStatus") === "IN_STOCK",
      isPublished: saveAsDraft ? false : values.get("isPublished") === "on",
      features: fromLines(values.get("features")),
      applications: fromLines(values.get("applications")),
      specifications: specsFromLines(values.get("specifications")),
      variants: (formProduct.variants || [])
        .filter((variant) => !saveAsDraft || Boolean(variant.label.trim() && variant.unit.trim()))
        .map((variant, sortOrder) => {
        const { draftKey: _draftKey, ...variantData } = variant;
        return {
        ...variantData,
        unit: String(variant.unit || values.get("unit") || "").trim(),
        isInStock: variant.availabilityStatus === "IN_STOCK",
        code: String(variant.code || "").trim() || null,
        price:
          variant.price == null || variant.price === ""
            ? null
            : Number(variant.price),
        compareAtPrice:
          variant.compareAtPrice == null ||
          variant.compareAtPrice === "" ||
          (saveAsDraft &&
            variant.price != null &&
            variant.price !== "" &&
            variant.compareAtPrice !== "" &&
            Number(variant.compareAtPrice) < Number(variant.price))
            ? null
            : Number(variant.compareAtPrice),
        priceNote: customerPriceNote(variant.priceNote) || null,
        stockQuantity:
          variant.stockQuantity == null || variant.stockQuantity === ""
            ? null
            : Number(variant.stockQuantity),
        minOrderQuantity:
          variant.minOrderQuantity == null || variant.minOrderQuantity === ""
            ? null
            : Number(variant.minOrderQuantity),
        quantityBreaks:
          saveAsDraft &&
          !(variant.quantityBreaks || []).every(
            (row, index, rows) =>
              (index === 0 || row.minimumQuantity > rows[index - 1].minimumQuantity) &&
              (index === 0 || row.unitPrice <= rows[index - 1].unitPrice),
          )
            ? []
            : variant.quantityBreaks || [],
        sortOrder,
        };
        }),
      sortOrder: Number(values.get("sortOrder") || 0),
    };
    if (!saveAsDraft && (
      payload.galleryImages.length > MAX_GALLERY_IMAGES &&
      payload.galleryImages.length > (editing?.galleryImages.length || 0)
    )) {
      setError(
        "Add up to three optional product images. Existing listings with older galleries can still be saved as-is.",
      );
      return;
    }
    if (!saveAsDraft && rawCompare && rawPrice && Number(rawCompare) < Number(rawPrice)) {
      setError(
        "Original price must be equal to or greater than the selling price.",
      );
      return;
    }
    if (
      !saveAsDraft && payload.offerStartsAt &&
      payload.offerEndsAt &&
      payload.offerEndsAt < payload.offerStartsAt
    ) {
      setError("Offer end date must be on or after its start date.");
      return;
    }
    const isPublishing = !saveAsDraft && payload.isPublished;
    const publishStartedAt = isPublishing ? Date.now() : 0;
    if (isPublishing) {
      setPublishProgress({
        productName: name || "Product",
        percent: 8,
        message: "Saving product details…",
        state: "working",
      });
    } else {
      setPublishProgress(null);
    }
    setBusy(true);
    setError("");
    setNotice("");
    setUploadSuccess(null);
    try {
      const saveExistingProduct = Boolean(editing?.id) && !draftingPublishedProduct;
      const savedProduct = await request<{ id: string; name: string; isPublished: boolean }>(
        `/products/catalogue${saveExistingProduct ? `/${editing?.id}` : ""}`,
        saveExistingProduct ? "PATCH" : "POST",
        payload,
      );
      if (saveAsDraft) {
        setNotice(`${savedProduct.name || name || "Product"} saved as a draft and added to the top of the catalogue.`);
        try {
          const oldKey = productDraftKey(editing?.id || "");
          const newKey = productDraftKey(savedProduct.id);
          const recovery = localStorage.getItem(oldKey);
          if (recovery && oldKey !== newKey) {
            localStorage.setItem(newKey, recovery);
            localStorage.removeItem(oldKey);
          }
        } catch {
          // The saved catalogue draft remains available if recovery storage fails.
        }
      } else if (savedProduct.isPublished) {
        setNotice("");
        setPublishProgress({
          productName: savedProduct.name || name || "Product",
          percent: 84,
          message: "Saved. Checking that it is visible on the storefront…",
          state: "working",
        });
        clearCatalogueEditorLocation();
        setEditing(null);
        setExitPromptOpen(false);
        setDraftSavedAt(null);
        setPreviewListing(null);
        let visibleOnStorefront = false;
        try {
          const publicProducts = await request<Listing[]>(`/products?verify=${Date.now()}`);
          visibleOnStorefront = publicProducts.some(
            (product) => product.id === savedProduct.id,
          );
        } catch {
          // Keep the saved state visible, but do not report storefront confirmation.
        }
        const minimumProgressMs = 650;
        const remainingAnimationMs =
          minimumProgressMs - (Date.now() - publishStartedAt);
        if (remainingAnimationMs > 0) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, remainingAnimationMs),
          );
        }
        setPublishProgress({
          productName: savedProduct.name || name || "Product",
          percent: 100,
          message: visibleOnStorefront
            ? "Publish completed · this product is live on the storefront."
            : "Saved as published, but storefront visibility could not be confirmed. Refresh and check again.",
          state: visibleOnStorefront ? "complete" : "error",
        });
      } else {
        if (isPublishing) {
          setPublishProgress({
            productName: savedProduct.name || name || "Product",
            percent: 100,
            message: "The product was saved, but the server kept it private as a draft.",
            state: "error",
          });
        } else {
          setNotice("Product saved as a draft.");
        }
      }
      if (!saveAsDraft) {
        try {
          localStorage.removeItem(productDraftKey(editing?.id || ""));
        } catch {
          /* browser storage is optional */
        }
      }
      if (!savedProduct.isPublished) {
        clearCatalogueEditorLocation();
        setEditing(null);
        setExitPromptOpen(false);
        setDraftSavedAt(null);
        setPreviewListing(null);
      }
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save this product.";
      setError(message);
      if (!saveAsDraft && payload.isPublished) {
        setPublishProgress({
          productName: name || "Product",
          percent: 100,
          message: `Publish failed · ${message}`,
          state: "error",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function unpublish(product: Listing) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/products/catalogue/${product.id}/unpublish`, "PATCH");
      setNotice(`${product.name} is unpublished.`);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not unpublish this product.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product: Listing) {
    const confirmed = await confirmAdminAction({
      title: "Move this product to Recently deleted?",
      message: `“${product.name}” can be restored for 30 days.`,
      confirmLabel: "Move to recently deleted",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/products/catalogue/${product.id}`, "DELETE");
      setNotice(`${product.name} moved to Recently deleted for 30 days.`);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete this product.",
      );
    } finally {
      setBusy(false);
    }
  }

  const startEdit = (product: Listing, opener?: HTMLElement) => {
    if (opener) productEditorOpener.current = opener;
    const recovery = recoverableDraftFor(product);
    const next = {
      ...product,
      ...(recovery
        ? {
            image: recovery.image,
            galleryImages: recovery.galleryImages,
            variants: nonEmptyVariants(recovery.variants),
          }
        : {}),
    };
    setPreviewListing(next);
    setPreviewMode("card");
    setEditing(next);
    setRecoveredDraft(recovery);
    setDraftSavedAt(recovery?.savedAt ?? null);
    const url = new URL(window.location.href);
    url.searchParams.set("catalogueEditor", product.id);
    window.history.pushState({ ...(window.history.state ?? {}), catalogueEditor: product.id }, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const startNew = () => {
    setAddProductChooserOpen(false);
    const product = {
      ...blank,
      sortOrder: catalogueMaxSortOrder + 1,
    };
    const recovery = recoverableDraftFor(product);
    const next = {
      ...product,
      ...(recovery
        ? {
            image: recovery.image,
            galleryImages: recovery.galleryImages,
            variants: nonEmptyVariants(recovery.variants),
          }
        : {}),
    };
    setPreviewListing(next);
    setPreviewMode("card");
    setEditing(next);
    setRecoveredDraft(recovery);
    setDraftSavedAt(recovery?.savedAt ?? null);
    const url = new URL(window.location.href);
    url.searchParams.set("catalogueEditor", "new");
    window.history.pushState({ ...(window.history.state ?? {}), catalogueEditor: "new" }, "", `${url.pathname}${url.search}${url.hash}`);
  };
  useEffect(() => {
    const restoreEditor = () => restoreCatalogueEditorFromLocation();
    window.addEventListener("popstate", restoreEditor);
    if (new URLSearchParams(window.location.search).has("catalogueEditor")) restoreEditor();
    return () => window.removeEventListener("popstate", restoreEditor);
  }, []);
  useEffect(() => {
    if (!editing && new URLSearchParams(window.location.search).has("catalogueEditor")) restoreCatalogueEditorFromLocation();
  }, [editing, listings]);
  useEffect(() => {
    const restoreCatalogueView = () => setManagingBrands(new URLSearchParams(window.location.search).get("catalogueView") === "brands");
    window.addEventListener("popstate", restoreCatalogueView);
    return () => window.removeEventListener("popstate", restoreCatalogueView);
  }, []);
  const showDraftListings = () => {
    setAddProductChooserOpen(false);
    setPublicationFilter("draft");
    setCatalogueSort("recent");
    setCataloguePage(1);
    setCatalogueQuery("");
    requestAnimationFrame(() =>
      document.querySelector(".catalogue-filter-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
  };
  const formProduct = editing;
  const automaticHighlights = formProduct
    ? [
        { title: "Product name", description: formProduct.name.trim() },
        { title: "Brand", description: formProduct.brand.trim() },
        { title: "Category", description: (formProduct.categoryLabel || formProduct.category).trim() },
        {
          title: "Options & variations",
          description: summarizeVariantChoices(formProduct.variants || []),
        },
      ].filter((row) => row.description)
    : [];
  const storedHighlights = formProduct
    ? [
        ...automaticHighlights.map((row) => boundedFeature(row.title, row.description)),
        ...manualHighlights(formProduct.features).map((entry) => {
          const row = splitHighlight(entry);
          return boundedFeature(row.title, row.description);
        }),
      ]
    : [];
  const productBrandChoices = formProduct
    ? [...new Set([...partnerBrandOptions, ...brands, formProduct.brand].filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
    : [];
  const productCategoryChoices = formProduct
    ? (() => {
        const choices = new Map<string, { value: string; label: string }>();
        const selectedId = resolveCatalogueCategoryId(formProduct.categoryLabel || formProduct.category, catalogueCategoryOptions);
        for (const category of catalogueCategoryOptions.filter((item) => item.active || item.id === selectedId)) {
          choices.set(category.id, { value: category.id, label: category.label });
        }
        return [...choices.values()];
      })()
    : [];
  const selectedCategoryValue = formProduct
    ? productCategoryChoices.find((category) => category.value === resolveCatalogueCategoryId(formProduct.categoryLabel || formProduct.category, catalogueCategoryOptions))?.value || ""
    : "";
  const selectedCategory = productCategoryChoices.find((category) => category.value === selectedCategoryValue);

  const openProductPreview = () => {
    if (productForm.current) {
      captureProductDraft({
        currentTarget: productForm.current,
      } as FormEvent<HTMLFormElement>);
    }
    setPreviewOpen(true);
  };
  const renderPublishStatus = () => publishProgress && (
    <section
      className={`catalogue-publish-status is-${publishProgress.state}`}
      role={publishProgress.state === "error" ? "alert" : "status"}
      aria-live={publishProgress.state === "working" ? "polite" : "assertive"}
      aria-label="Product publishing status"
    >
      <div className="catalogue-publish-status-heading">
        <span className="catalogue-publish-status-icon" aria-hidden="true">
          {publishProgress.state === "complete" ? (
            <Check size={17} strokeWidth={3} />
          ) : publishProgress.state === "error" ? (
            <Info size={17} />
          ) : (
            <RefreshCw size={17} className="catalogue-publish-status-spin" />
          )}
        </span>
        <div className="catalogue-publish-status-copy">
          <strong>
            {publishProgress.state === "complete"
              ? "Publish completed"
              : publishProgress.state === "error"
                ? "Publication needs attention"
                : "Publishing product"}
          </strong>
          <span>{publishProgress.productName} · {publishProgress.message}</span>
        </div>
        <span className="catalogue-publish-status-percent">
          {publishProgress.percent}%
        </span>
        {publishProgress.state !== "working" && (
          <button
            type="button"
            className="catalogue-publish-status-dismiss"
            aria-label="Dismiss publication status"
            onClick={() => setPublishProgress(null)}
          >
            <X size={17} />
          </button>
        )}
      </div>
      <div
        className="catalogue-publish-status-track"
        role="progressbar"
        aria-label="Publishing progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={publishProgress.percent}
      >
        <span style={{ width: `${publishProgress.percent}%` }} />
      </div>
    </section>
  );

  if (managingBrands)
    return (
      <PartnerBrandsManager
        token={token}
        role={role}
        onSignOut={onSignOut}
        onBack={() => {
          if (window.history.state?.catalogueView === "brands") window.history.back();
          else setManagingBrands(false);
        }}
        customerUrl={customerUrl}
      />
    );

  return (
    <div className="catalogue-manager">
      <header className="catalogue-manager-head">
        <div>
          <span className="eyebrow">CUSTOMER WEBSITE CATALOGUE</span>
          <h2>Products, pricing & offers</h2>
          <p>
            {canManage
              ? "Changes appear on the public marketplace after saving and publishing."
              : "Read-only catalogue access. You can review products and pack prices; catalogue staff manage changes."}
          </p>
        </div>
        <div className="catalogue-manager-actions">
          <button
            className="btn-sm btn-secondary btn-orange-outline"
            onClick={() => selectCatalogueView(true)}
          >
            <Tags size={15} /> Partner brands
          </button>
          <button
            className="btn-sm btn-secondary btn-orange-outline"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {canManage && (
            <button
              className="btn-sm btn-primary"
              disabled={busy}
            onClick={(event) => openAddProductChooser(event.currentTarget)}
            >
              <PackagePlus size={16} /> Add product
            </button>
          )}
        </div>
      </header>
      {renderPublishStatus()}
      {addProductChooserOpen && (
        <div
          className="catalogue-add-choice-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setAddProductChooserOpen(false);
          }}
        >
          <section
            className="catalogue-add-choice-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogue-add-choice-title"
          >
            <h2 id="catalogue-add-choice-title">What would you like to do?</h2>
            <p>
              Start a product or continue working on a saved draft. Drafts stay
              here for 7 days after their last save.
            </p>
            <div className="catalogue-add-choice-actions">
              <button
                type="button"
                className="catalogue-add-choice-card"
                onClick={startNew}
              >
                <PackagePlus size={20} />
                <span>
                  <strong>Add new product</strong>
                  <small>Start with a blank product form.</small>
                </span>
              </button>
              <button
                type="button"
                className="catalogue-add-choice-card"
                onClick={showDraftListings}
              >
                <FileText size={20} />
                <span>
                  <strong>Edit drafts</strong>
                  <small>
                    {listings.filter((product) => !product.isPublished).length}{" "}
                    saved drafts · newest first · kept for 7 days
                  </small>
                </span>
              </button>
            </div>
            <button
              type="button"
              className="catalogue-add-choice-cancel"
              onClick={() => setAddProductChooserOpen(false)}
            >
              Cancel
            </button>
          </section>
        </div>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="saved-notice" role="status">
          {notice}
        </p>
      )}
      {canManage && formProduct && (
        <div className="catalogue-editor-overlay">
          <form
            ref={productForm}
            className="panel-card catalogue-product-form"
            data-admin-unsaved-form
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogue-editor-title"
            autoComplete="off"
            noValidate
            onSubmit={(event) => void save(event)}
            onChange={captureProductDraft}
          >
            <div className="catalogue-form-title">
              <div className="catalogue-form-title-copy">
                <span className="eyebrow">WEBSITE CATALOGUE</span>
                <h3 id="catalogue-editor-title">
                  {formProduct.id ? "Edit product" : "Add a product"}
                </h3>
                <p>
                  Prepare the product details customers will see on Material
                  Square.
                </p>
              </div>
              <span
                className={`catalogue-form-state ${(previewListing?.isPublished ?? formProduct.isPublished) ? "is-published" : "is-draft"}`}
              >
                <span aria-hidden="true" />
                {(previewListing?.isPublished ?? formProduct.isPublished)
                  ? "Published"
                  : "Private draft"}
              </span>
              <button
                type="button"
                className="catalogue-header-preview"
                disabled={busy}
                onClick={openProductPreview}
              >
                <Image size={15} /> Preview storefront
              </button>
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={requestProductEditorClose}
                aria-label="Close product form"
              >
                <X size={16} />
              </button>
            </div>
            {publishProgress?.state === "working" && renderPublishStatus()}
            <div className="catalogue-fields">
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">01</span>
                <div>
                  <strong>Product identity</strong>
                    <small>Name, brand, category and default unit.</small>
                </div>
              </div>
              <label>
                Product name
                <input
                  name="name"
                  required
                  maxLength={180}
                  autoFocus
                  defaultValue={formProduct.name}
                />
              </label>
              <label>
                Brand
                <select
                  name="brand"
                  required
                  value={formProduct.brand}
                  onChange={(event) => setEditing((current) => current ? { ...current, brand: event.target.value } : current)}
                >
                  <option value="">Choose a brand</option>
                  {productBrandChoices.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </label>
              <label>
                Category
                <select
                  name="categoryChoice"
                  required
                  value={selectedCategoryValue}
                  onChange={(event) => {
                    const choice = productCategoryChoices.find((category) => category.value === event.target.value);
                    if (!choice) return;
                    setEditing((current) => current ? { ...current, category: choice.value, categoryLabel: choice.label } : current);
                  }}
                >
                  <option value="">Choose a category</option>
                  {productCategoryChoices.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
                <input type="hidden" name="category" value={selectedCategoryValue} />
                <input type="hidden" name="categoryLabel" value={selectedCategory?.label || ""} />
              </label>
              <label>
                Default unit
                <input name="unit" required maxLength={100} placeholder="L, kg, piece, pack" value={formProduct.unit} onChange={(event) => setEditing((current) => current ? { ...current, unit: event.target.value } : current)} />
                <small>Each option can use its own unit.</small>
              </label>
              <details className="catalogue-optional-settings catalogue-wide">
                <summary>More product details <span>Website URL, grade and ordering information</span></summary>
                <div className="catalogue-optional-grid">
              <label>
                URL slug
                <input
                  name="slug"
                  maxLength={120}
                  placeholder="Generated from product name"
                  defaultValue={formProduct.slug}
                />
              </label>
              <label>
                Grade / type
                <input
                  name="grade"
                  maxLength={500}
                  defaultValue={formProduct.grade || ""}
                />
              </label>
              <label>
                Minimum order
                <input
                  name="minOrderQty"
                  maxLength={500}
                  defaultValue={formProduct.minOrderQty || ""}
                />
              </label>
              <label>
                Dispatch wording
                <input
                  name="dispatchTime"
                  maxLength={500}
                  defaultValue={formProduct.dispatchTime || ""}
                />
              </label>
                </div>
              </details>
              <details className="catalogue-optional-settings catalogue-wide">
                <summary>Single price and offer <span>Optional fallback when all options share one price</span></summary>
                <div className="catalogue-optional-grid">
              <label>
                Price (₹ per unit)
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={formProduct.price || ""}
                />
              </label>
              <label>
                Compare-at price / MRP (₹, optional)
                <input
                  name="compareAtPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={formProduct.compareAtPrice || ""}
                />
              </label>
              <label>
                Price / tax note (optional)
                <input
                  name="priceNote"
                  maxLength={120}
                  placeholder="e.g. Tax included"
                  defaultValue={customerPriceNote(formProduct.priceNote)}
                />
              </label>
              <label>
                Offer label (optional)
                <input
                  name="offerLabel"
                  maxLength={120}
                  placeholder="Enter offer name"
                  defaultValue={formProduct.offerLabel || ""}
                />
              </label>
              <label>
                Offer starts (optional)
                <input
                  name="offerStartsAt"
                  type="date"
                  defaultValue={dateField(formProduct.offerStartsAt)}
                />
              </label>
              <label>
                Offer ends (optional)
                <input
                  name="offerEndsAt"
                  type="date"
                  defaultValue={dateField(formProduct.offerEndsAt)}
                />
              </label>
              <p className="catalogue-field-note catalogue-wide">
                Offers are optional. Leave compare-at price, offer label and
                dates blank for a regular-price product.
              </p>
                </div>
              </details>
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">02</span>
                <div>
                  <strong>Product photos</strong>
                  <small>
                    Upload one photo to get started. Add up to three optional images; options can use any shared photo.
                  </small>
                </div>
              </div>
              <input
                type="hidden"
                name="image"
                value={formProduct.image || ""}
                readOnly
              />
              <input
                type="hidden"
                name="galleryImages"
                value={lines(formProduct.galleryImages || [])}
                readOnly
              />
              <div className="catalogue-photo-layout catalogue-wide">
                <div className="catalogue-photo-slot catalogue-photo-hero">
                  {formProduct.image ? (
                    <img src={formProduct.image} alt="Main product" />
                  ) : (
                    <div className="catalogue-photo-empty"><Upload size={30} /><strong>Main product photo</strong><span>Upload a photo or use a URL below</span></div>
                  )}
                  <label className="catalogue-photo-picker">
                    <Upload size={16} /> {formProduct.image ? "Replace main photo" : "Upload main photo"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void uploadImage(file, input); }} />
                  </label>
                  <label className="catalogue-photo-url">
                    Or paste image URL
                    <input type="url" maxLength={1000} placeholder="https://example.com/product-photo.jpg" value={formProduct.image || ""} onChange={(event) => setEditing({ ...formProduct, image: event.target.value })} />
                  </label>
                </div>
                <div className="catalogue-photo-side">
                  {Array.from({ length: MAX_GALLERY_IMAGES }, (_, index) => {
                    const photo = formProduct.galleryImages[index] || "";
                    return (
                      <div className="catalogue-photo-slot catalogue-photo-small" key={`product-photo-${index}`}>
                        {photo ? <img src={photo} alt={`Product view ${index + 2}`} /> : <div className="catalogue-photo-empty"><Upload size={20} /><strong>Photo {index + 2}</strong><span>Optional</span></div>}
                        <label className="catalogue-photo-picker">
                          <Upload size={14} /> {photo ? "Replace photo" : "Upload photo"}
                          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void uploadGalleryPhoto(file, input, index); }} />
                        </label>
                        <label className="catalogue-photo-url">
                          Or paste image URL
                          <input type="url" maxLength={1000} placeholder="https://example.com/photo.jpg" value={photo} onChange={(event) => { const galleryImages = [...(formProduct.galleryImages || [])]; galleryImages[index] = event.target.value; setEditing({ ...formProduct, galleryImages }); }} />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="catalogue-photo-note">
                  {Number(Boolean(formProduct.image)) + formProduct.galleryImages.filter(Boolean).length} of {MAX_PRODUCT_PHOTOS} photos · Recommended size: 1200 × 1200 px (1:1) · PNG, JPEG or WebP · Up to 20 MB each. One photo is enough; the other three are optional.
                </p>
              </div>
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">03</span>
                <div>
                  <strong>Options &amp; variants</strong>
                  <small>Add the choices customers can select. Each option can have its own code, photo, price and availability.</small>
                </div>
              </div>
              <CatalogueVariantsEditor
                variants={formProduct.variants || []}
                imageOptions={[formProduct.image, ...(formProduct.galleryImages || [])].filter((image): image is string => Boolean(image))}
                onChange={(variants) => {
                  const next = { ...formProduct, variants };
                  setEditing(next);
                  setPreviewListing((current) =>
                    current ? { ...current, variants } : current,
                  );
                }}
                onUploadImage={(file, input, index, photoIndex) =>
                  void uploadVariantImage(file, input, index, photoIndex)
                }
                defaultUnit={formProduct.unit}
                busy={busy}
              />
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">04</span>
                <div>
                  <strong>Product highlights</strong>
                  <small>Product details fill automatically. Add any extra highlights you need.</small>
                </div>
              </div>
              <div className="catalogue-highlight-field catalogue-wide">
                <CatalogueHighlightsEditor
                  value={manualHighlights(formProduct.features)}
                  automaticRows={automaticHighlights}
                  onChange={(features) => setEditing((current) => current ? { ...current, features } : current)}
                />
                <input type="hidden" name="features" value={lines(storedHighlights)} readOnly />
              </div>
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">05</span>
                <div>
                  <strong>Product description</strong>
                  <small>Describe the product for customers.</small>
                </div>
              </div>
              <label className="catalogue-wide">
                Description
                <textarea name="description" rows={5} maxLength={3000} placeholder="Describe the product for customers" defaultValue={formProduct.description || ""} />
              </label>
              <label>
                Marketplace badge
                <input name="photoBanner" maxLength={40} placeholder="Optional badge" defaultValue={formProduct.photoBanner || ""} />
              </label>
              <input type="hidden" name="sortOrder" value={formProduct.sortOrder} readOnly />
              <input type="hidden" name="applications" value={lines(formProduct.applications)} readOnly />
              <input type="hidden" name="specifications" value={Object.entries(visibleSpecs(formProduct.specifications)).map(([key, value]) => `${key}: ${value}`).join("\n")} readOnly />
              <input type="hidden" name="packaging" value={formProduct.packaging || ""} readOnly />
              <input type="hidden" name="brandTagline" value={formProduct.brandTagline || ""} readOnly />
            </div>
            <div className="catalogue-form-checks">
              <label>
                Availability
                <select
                  name="availabilityStatus"
                  defaultValue={
                    formProduct.availabilityStatus ||
                    (formProduct.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY")
                  }
                >
                  <option key="IN_STOCK" value="IN_STOCK">
                    In stock
                  </option>
                  <option key="OUT_OF_STOCK" value="OUT_OF_STOCK">
                    Out of stock
                  </option>
                  <option key="CHECK_AVAILABILITY" value="CHECK_AVAILABILITY">
                    Check availability
                  </option>
                </select>
              </label>
              <label>
                <input
                  name="isPublished"
                  type="checkbox"
                  defaultChecked={formProduct.isPublished}
                />{" "}
                Publish on website
              </label>
            </div>
            <div className="catalogue-form-footer">
              <small>
                <Image size={14} /> Use approved product images; do not upload
                brand logos or alter brand artwork here.
              </small>
              <button className="btn-sm btn-primary" disabled={busy}>
                <Save size={15} />
                {busy ? "Saving…" : "Save product"}
              </button>
              <button
                type="button"
                className="btn-sm btn-secondary catalogue-preview-trigger"
                disabled={busy}
                onClick={openProductPreview}
              >
                <Image size={15} /> Preview storefront
              </button>
            </div>
            {draftSavedAt && (
              <p className="catalogue-draft-status" role="status">
                Recovery copy saved{" "}
                {new Date(draftSavedAt).toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                . Kept in this browser for 7 days.
              </p>
            )}
            {previewListing && previewOpen && (
              <div
                className="catalogue-preview-overlay"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                    setPreviewOpen(false);
                }}
              >
                <section
                  id="catalogue-live-preview"
                  className={`catalogue-storefront-preview preview-${previewViewport}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="catalogue-preview-title"
                >
                  <header className="catalogue-preview-toolbar">
                    <div className="catalogue-preview-heading">
                      <span className="eyebrow">
                        PRIVATE STOREFRONT PREVIEW
                      </span>
                      <h2 id="catalogue-preview-title">
                        {previewMode === "card"
                          ? "Marketplace listing"
                          : "Product detail page"}
                      </h2>
                      <p>
                        A customer view of this product. It updates as you edit,
                        and stays private until you publish.
                      </p>
                    </div>
                    <div className="catalogue-preview-controls">
                      <div
                        className="catalogue-preview-switch"
                        role="group"
                        aria-label="Preview page"
                      >
                        <button
                          type="button"
                          className={`catalogue-preview-option${previewMode === "card" ? " active" : ""}`}
                          aria-pressed={previewMode === "card"}
                          onClick={() => setPreviewMode("card")}
                        >
                          Marketplace card
                        </button>
                        <button
                          type="button"
                          className={`catalogue-preview-option${previewMode === "detail" ? " active" : ""}`}
                          aria-pressed={previewMode === "detail"}
                          onClick={() => setPreviewMode("detail")}
                        >
                          Product page
                        </button>
                      </div>
                      <div
                        className="catalogue-preview-switch catalogue-preview-device"
                        role="group"
                        aria-label="Preview screen size"
                      >
                        <button
                          type="button"
                          className={`catalogue-preview-option${previewViewport === "desktop" ? " active" : ""}`}
                          aria-pressed={previewViewport === "desktop"}
                          onClick={() => setPreviewViewport("desktop")}
                        >
                          Desktop
                        </button>
                        <button
                          type="button"
                          className={`catalogue-preview-option${previewViewport === "mobile" ? " active" : ""}`}
                          aria-pressed={previewViewport === "mobile"}
                          onClick={() => setPreviewViewport("mobile")}
                        >
                          Mobile
                        </button>
                      </div>
                      <button
                        type="button"
                        className="catalogue-preview-close"
                        onClick={() => setPreviewOpen(false)}
                        aria-label="Back to editing"
                      >
                        <X size={17} />
                        <span>Back to editing</span>
                      </button>
                    </div>
                  </header>
                  <div className="catalogue-preview-stage" ref={previewStage}>
                    <div className="catalogue-preview-device-frame">
                      <div className="store-preview-topline">
                        {siteContent["contact.location"].trim() && (
                          <span>{siteContent["contact.location"].trim()}</span>
                        )}
                        {siteContent["contact.phone"].trim() && (
                          <strong>
                            ☎{" "}
                            {formatContactPhone(siteContent["contact.phone"])}
                          </strong>
                        )}
                      </div>
                      <div className="catalogue-preview-sitebar">
                        <MaterialSquareLogo
                          size={52}
                          lightMode={false}
                          tagline="BUILDING BETTER TOGETHER"
                        />
                        <nav aria-label="Preview storefront navigation">
                          <span>Home</span>
                          <span className="is-current">Marketplace</span>
                          <span>Why Us</span>
                          <span>Tools &amp; Guides</span>
                          <span>Blogs</span>
                          <span>Experts</span>
                          <span>Contact</span>
                        </nav>
                        <div className="store-preview-nav-actions">
                          <span title="Material List">
                            <FileText size={15} />
                          </span>
                          <span>
                            <Users size={14} /> Account
                          </span>
                          <strong>
                            Get Quote <ArrowRight size={13} />
                          </strong>
                        </div>
                      </div>
                      {previewMode === "card" && (
                        <div className="store-preview-breadcrumb">
                          <span>Home</span>
                          <span>/</span>
                          <span>Marketplace</span>
                          <span>/</span>
                          <strong>
                            {previewListing.categoryLabel || "Products"}
                          </strong>
                        </div>
                      )}
                      {previewMode === "card" ? (
                        <>
                          <div className="store-preview-marketplace-intro">
                            <div>
                              <span className="store-preview-kicker">
                                MATERIAL SQUARE MARKETPLACE
                              </span>
                              <h2>Construction Materials Catalog</h2>
                              <p>
                                Search products by name, brand, colour, finish
                                or pack size.
                              </p>
                            </div>
                            <span className="store-preview-layout-label">
                              <span aria-hidden="true" />{" "}
                              {previewViewport === "desktop"
                                ? "Desktop catalogue grid"
                                : "Mobile catalogue"}
                            </span>
                          </div>
                          <div
                            className="store-preview-filter-context"
                            aria-label="Marketplace search and filters preview"
                          >
                            <span className="store-preview-search">
                              <Search size={15} /> Search materials, brands or
                              product codes
                            </span>
                            <span>
                              All categories <ArrowRight size={12} />
                            </span>
                            <span>
                              All brands <ArrowRight size={12} />
                            </span>
                          </div>
                          <div
                            className={`store-preview-marketplace-grid ${previewGridNeighbors.length ? "has-context-products" : "is-focused-preview"}`}
                          >
                            <MarketplaceProductCard
                              name={previewListing.name || "Product name"}
                              brand={previewBrand(previewListing.brand || "Brand")}
                              brandAssetBaseUrl={customerUrl || import.meta.env.VITE_CUSTOMER_APP_URL || "https://material-square.vercel.app"}
                              code={previewMainCard?.code}
                              image={previewMainCard?.image || ""}
                              imageContent={<StorefrontPreviewImage src={previewMainCard?.image || ""} alt={previewListing.name || "Product preview"} />}
                              categoryLabel={previewListing.categoryLabel || "Category"}
                              bannerLabel={previewMainCard?.bannerLabel || undefined}
                              bannerKind={previewMainCard?.bannerKind}
                              specification={previewMainCard?.specification}
                              optionLabel={previewMainCard?.optionLabel}
                              sizeGuide={previewMainCard?.sizeGuide}
                              colours={detailPreviewVariant ? [] : Array.from(new Set(previewListing.variants.flatMap((variant) => Object.entries(variant.attributes || {}).filter(([key]) => /colou?r|shade|finish/i.test(key)).map(([, value]) => value.trim()).filter(Boolean))))}
                              features={customerCardFeatures(previewListing.features)}
                              detailHref="#"
                              priceCaption={previewMainCard?.priceCaption || "Pricing"}
                              priceLabel={previewMainCard?.priceLabel || "Request a quote"}
                              compareAtPriceLabel={previewMainCard?.compareAtPrice}
                              availability={previewMainCard?.availability || "CHECK_AVAILABILITY"}
                              availabilityLabel={previewMainCard?.availabilityLabel || "Check availability"}
                              minimumOrderLabel={previewMainCard?.minimumOrderLabel || "MOQ: Confirm"}
                              chooseOptions={Boolean(detailPreviewVariant || previewListing.specifications.sizes)}
                              whatsappHref={marketplacePreviewWhatsAppHref(siteContent["contact.whatsappPhone"], previewListing.name, detailPreviewVariant?.label)}
                              preview
                              previewViewport={previewViewport}
                              className="store-preview-current-product"
                              onViewDetails={() => setPreviewMode("detail")}
                              onChooseOptions={() => setPreviewMode("detail")}
                            />
                            {previewGridNeighbors.map((listing) => {
                              const variant = listing.variants[0];
                              const card = marketplacePreviewCardData(listing, variant);
                              return <MarketplaceProductCard
                                key={listing.id}
                                name={listing.name || "Product name"}
                                brand={previewBrand(listing.brand || "Brand")}
                                brandAssetBaseUrl={customerUrl || import.meta.env.VITE_CUSTOMER_APP_URL || "https://material-square.vercel.app"}
                                code={card.code}
                                image={card.image}
                                imageContent={<StorefrontPreviewImage src={card.image} alt={listing.name || "Published product"} />}
                                categoryLabel={listing.categoryLabel || "Category"}
                                bannerLabel={card.bannerLabel || undefined}
                                bannerKind={card.bannerKind}
                                specification={card.specification}
                                optionLabel={card.optionLabel}
                                sizeGuide={card.sizeGuide}
                                colours={variant ? [] : Array.from(new Set(listing.variants.flatMap((option) => Object.entries(option.attributes || {}).filter(([key]) => /colou?r|shade|finish/i.test(key)).map(([, value]) => value.trim()).filter(Boolean))))}
                                features={customerCardFeatures(listing.features)}
                                detailHref="#"
                                priceCaption={card.priceCaption}
                                priceLabel={card.priceLabel}
                                compareAtPriceLabel={card.compareAtPrice}
                                availability={card.availability}
                                availabilityLabel={card.availabilityLabel}
                                minimumOrderLabel={card.minimumOrderLabel}
                                chooseOptions={Boolean(listing.variants.length || listing.specifications.sizes)}
                                whatsappHref={marketplacePreviewWhatsAppHref(siteContent["contact.whatsappPhone"], listing.name, variant?.label)}
                                preview
                                previewViewport={previewViewport}
                                className="store-preview-context-product"
                              />;
                            })}
                          </div>
                        </>
                      ) : (
                        <ProductDetailSurface
                          title={previewListing.name || "Product name"}
                          brand={previewListing.brand || "Brand"}
                          brandMark={<PartnerBrandLogo brand={previewBrand(previewListing.brand || "Brand")} assetBaseUrl={customerUrl || import.meta.env.VITE_CUSTOMER_APP_URL || "https://material-square.vercel.app"} className="mini shared-product-brand-logo" />}
                          brandTagline={previewListing.brandTagline || undefined}
                          category={previewListing.categoryLabel || "Category"}
                          code={detailPreviewVariant?.code || previewListing.code}
                          grade={previewListing.grade}
                          images={Array.from(new Set([...(detailPreviewVariant?.galleryImages || []), detailPreviewVariant?.image, ...previewListing.galleryImages, previewListing.image].filter((image): image is string => Boolean(image))))}
                          selectedImage={previewSelectedImage}
                          onImageSelect={setPreviewSelectedImage}
                          price={previewDetailPrice}
                          compareAtPrice={previewDetailCompareAtPrice}
                          unit={detailPreviewVariant?.unit || previewListing.unit || "unit"}
                          priceNote={previewDetailPriceNote}
                          offerLabel={detailPreviewVariant?.offerLabel || previewListing.offerLabel || (previewDetailDiscount > 0 ? `${previewDetailDiscount}% OFF` : null)}
                          availability={previewDetailAvailability}
                          stockQuantity={detailPreviewVariant?.stockQuantity}
                          minimumOrder={detailPreviewVariant?.minOrderQuantity || previewListing.minOrderQty?.match(/[\d.]+/)?.[0]}
                          choiceGroups={previewDetailChoiceGroups}
                          selectionLabel={detailPreviewVariant?.label || previewDetailSelectionLabel || undefined}
                          quantity={previewQuantity}
                          onQuantityChange={setPreviewQuantity}
                          specification={previewSpecification}
                          specificationRequired={Boolean(previewListing.specifications.sizes)}
                          onSpecificationChange={setPreviewSpecification}
                          description={previewDescription}
                          faqEntries={previewFaqEntries}
                          returnPolicy={previewReturnPolicy.published ? previewReturnPolicy : null}
                          highlights={previewDetailHighlights}
                          features={customerCardFeatures(previewListing.features)}
                          applications={previewListing.applications}
                          quantityBreaks={previewQuantityBreaks}
                          actionLabel={previewDetailAvailability === "OUT_OF_STOCK" ? "Out of stock" : "Add to cart"}
                          actionDisabled={previewDetailAvailability === "OUT_OF_STOCK"}
                          preview
                          onSubmit={(event) => event.preventDefault()}
                        />
                      )}
                    </div>
                  </div>
                  <footer className="catalogue-preview-footnote">
                    <span
                      className={
                        previewListing.isPublished
                          ? "preview-state-publish"
                          : "preview-state-draft"
                      }
                    >
                      {previewListing.isPublished
                        ? "Published product · changes not saved"
                        : "Draft · hidden from customers"}
                    </span>
                    <span>
                      Preview only · save this product to keep your changes
                    </span>
                  </footer>
                </section>
              </div>
            )}
          </form>
          {exitPromptOpen && (
            <div className="catalogue-exit-confirm-overlay">
              <section
                className="catalogue-exit-confirm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="catalogue-exit-confirm-title"
                aria-describedby="catalogue-exit-confirm-description"
              >
                <h2 id="catalogue-exit-confirm-title">Save your changes?</h2>
                <p id="catalogue-exit-confirm-description">
                  Your changes are not saved yet. Save them as a private draft
                  for 7 days, discard them, or return to editing.
                </p>
                <div className="catalogue-exit-confirm-actions">
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={busy}
                    onClick={() => setExitPromptOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-secondary catalogue-exit-discard"
                    disabled={busy}
                    onClick={exitWithoutSaving}
                  >
                    Exit without saving
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-primary"
                    disabled={busy}
                    onClick={saveDraftAndClose}
                  >
                    <Save size={15} /> Save Draft
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
      {uploadSuccess && (
        <div
          className="catalogue-publish-success-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setUploadSuccess(null);
          }}
        >
          <section
            className="catalogue-publish-success-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogue-upload-success-title"
            aria-describedby="catalogue-upload-success-description"
          >
            <div className="catalogue-publish-success-content">
              <span className="catalogue-publish-success-icon" aria-hidden="true"><Check size={22} strokeWidth={3} /></span>
              <div className="catalogue-publish-success-copy">
                <h2 id="catalogue-upload-success-title">{uploadSuccess}</h2>
                <p id="catalogue-upload-success-description">The image was uploaded and added to this product draft. Save the product to keep the change.</p>
              </div>
              <button type="button" className="catalogue-publish-success-close" aria-label="Close upload confirmation" onClick={() => setUploadSuccess(null)}>×</button>
            </div>
            <footer className="catalogue-publish-success-actions">
              <button type="button" autoFocus onClick={() => setUploadSuccess(null)}>Continue editing</button>
            </footer>
          </section>
        </div>
      )}
      <section
        className="panel-card catalogue-filter-panel"
        aria-label="Filter catalogue"
      >
        <label className="catalogue-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={catalogueQuery}
            onChange={(event) => setCatalogueQuery(event.target.value)}
            placeholder="Search products, brands, codes, colours or sizes"
            aria-label="Search catalogue"
          />
          {catalogueQuery && (
            <button
              type="button"
              className="catalogue-search-clear"
              onClick={() => setCatalogueQuery("")}
              aria-label="Clear catalogue search"
            >
              <X size={16} />
            </button>
          )}
        </label>
        <div className="catalogue-filter-fields">
          <label>
            Brand
            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
            >
              <option key="all" value="all">
                All brands
              </option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option key="all" value="all">
                All categories
              </option>
              {categories.map(([category, label]) => (
                <option key={category} value={category}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Website status
            <select
              value={publicationFilter}
              onChange={(event) => setPublicationFilter(event.target.value)}
            >
              <option key="all" value="all">
                All statuses
              </option>
              <option key="published" value="published">
                Published
              </option>
              <option key="draft" value="draft">
                Drafts
              </option>
            </select>
          </label>
          <label>
            Availability
            <select
              value={availabilityFilter}
              onChange={(event) => setAvailabilityFilter(event.target.value)}
            >
              <option key="all" value="all">
                All availability
              </option>
              <option key="IN_STOCK" value="IN_STOCK">
                In stock
              </option>
              <option key="OUT_OF_STOCK" value="OUT_OF_STOCK">
                Out of stock
              </option>
              <option key="CHECK_AVAILABILITY" value="CHECK_AVAILABILITY">
                Check availability
              </option>
            </select>
          </label>
          <label>
            Sort products
            <select
              value={catalogueSort}
              onChange={(event) => setCatalogueSort(event.target.value)}
            >
              <option value="recent">Recently added</option>
              <option value="interest">Most added to list · 30 days</option>
              <option value="name">Name A–Z</option>
              <option value="price-asc">Price · low to high</option>
              <option value="price-desc">Price · high to low</option>
            </select>
          </label>
        </div>
      </section>
      <div className="catalogue-listing-count" aria-live="polite">
        Showing {pageListings.length} of {visibleListings.length} matching
        loaded products · {listings.filter((p) => p.isPublished).length} published
      </div>
      {searchingCatalogue && <p className="catalogue-page-hint">Searching all catalogue products…</p>}
      {catalogueSearchHasMore && (
        <p className="catalogue-page-hint">More than 100 products match this search. Add another word to narrow the results.</p>
      )}
      {catalogueHasMore && (
        <p className="catalogue-page-hint">
          Filters and sorting apply to loaded products. Load more to include older catalogue entries.
        </p>
      )}
      {listings.length === 0 && !busy && (
        <section className="panel-card catalogue-empty" role="status">
          <h3>No catalogue products yet</h3>
          <p>
            {canManage
              ? "Add the first client-approved product as a draft, then publish it after checking its details and options."
              : "A catalogue manager can add client-approved products here. No sample products are being shown."}
          </p>
          {canManage && (
            <button className="btn-sm btn-primary" onClick={(event) => openAddProductChooser(event.currentTarget)}>
              <PackagePlus size={15} /> Add first product
            </button>
          )}
        </section>
      )}
      {listings.length > 0 && visibleListings.length === 0 && !searchingCatalogue && (
        <section className="panel-card catalogue-empty" role="status">
          <h3>No matching products</h3>
          <p>
            Try a different product name, brand, category or availability
            filter.
          </p>
          <button
            className="btn-sm btn-secondary"
            onClick={() => {
              setCatalogueQuery("");
              setBrandFilter("all");
              setCategoryFilter("all");
              setPublicationFilter("all");
              setAvailabilityFilter("all");
            }}
          >
            Clear all filters
          </button>
        </section>
      )}
      <div className="catalogue-listings">
        {pageListings.map((product) => (
          <article className="panel-card catalogue-listing" key={product.id}>
            <div className="catalogue-listing-image">
              {product.image || product.galleryImages?.[0] ? (
                <img
                  src={product.image || product.galleryImages?.[0] || ""}
                  alt=""
                />
              ) : (
                <span
                  className="catalogue-listing-image-placeholder"
                  aria-label="Product image not provided"
                >
                  <Image size={22} />
                  <small>No image</small>
                </span>
              )}
            </div>
            <div className="catalogue-listing-main">
              <div className="catalogue-listing-title">
                <h3>{product.name}</h3>
                <span
                  className={
                    product.isPublished
                      ? "catalogue-published"
                      : "catalogue-draft"
                  }
                >
                  {product.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <p>
                {product.brand || "Unbranded"} · {product.categoryLabel} ·{" "}
                {product.unit}
              </p>
              <div className="catalogue-price-line">
                {product.variants?.length ? (
                  <strong>{product.variants.length} sellable variants</strong>
                ) : product.price == null ? (
                  <span>Price not set</span>
                ) : (
                  <strong>
                    ₹{Number(product.price).toLocaleString("en-IN")} /{" "}
                    {product.unit}
                  </strong>
                )}
                {product.offerLabel && (
                  <span className="catalogue-offer">{product.offerLabel}</span>
                )}
              </div>
              {product.variants?.length > 0 && (
                <details className="catalogue-listing-variants">
                  <summary>View pack prices and availability</summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Pack / size</th>
                          <th>Price</th>
                          <th>Availability</th>
                          <th>Minimum order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.variants.map((variant, index) => (
                          <tr key={variant.id || index}>
                            <td>{variant.label}</td>
                            <td>
                              {variant.price == null
                                ? "Price not set"
                                : `₹${Number(variant.price).toLocaleString("en-IN")} / ${variant.unit}`}
                              {customerPriceNote(variant.priceNote) && (
                                <small>
                                  {customerPriceNote(variant.priceNote)}
                                </small>
                              )}
                              {variant.quantityBreaks?.map(
                                (tier, tierIndex) => (
                                  <small key={tierIndex}>
                                    {tier.minimumQuantity}+ {variant.unit}: ₹
                                    {Number(tier.unitPrice).toLocaleString(
                                      "en-IN",
                                    )}{" "}
                                    each
                                  </small>
                                ),
                              )}
                            </td>
                            <td>
                              {variant.availabilityStatus === "IN_STOCK" ||
                              variant.isInStock
                                ? "In stock"
                                : variant.availabilityStatus === "OUT_OF_STOCK"
                                  ? "Out of stock"
                                  : "Confirm availability"}
                            </td>
                            <td>
                              {variant.minOrderQuantity == null
                                ? "Confirm minimum"
                                : formatQuantityUnit(variant.minOrderQuantity, variant.unit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
            {canManage && (
              <div className="catalogue-listing-controls">
                <button
                  className="btn-sm btn-secondary"
                  disabled={busy}
                  onClick={(event) => startEdit(product, event.currentTarget)}
                >
                  Edit
                </button>
                {product.isPublished && (
                  <button
                    className="btn-sm btn-secondary"
                    disabled={busy}
                    onClick={() => void unpublish(product)}
                  >
                    Unpublish
                  </button>
                )}
                <button
                  className="btn-sm btn-secondary catalogue-delete-button"
                  disabled={busy}
                  onClick={() => void deleteProduct(product)}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {visibleListings.length > 0 && (
        <nav
          className="catalogue-pagination catalogue-pagination-bottom"
          aria-label="Catalogue pages"
        >
          <button
            className="btn-sm btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCataloguePage((page) => Math.max(1, page - 1))}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <button
            className="btn-sm btn-secondary"
            disabled={currentPage >= pageCount}
            onClick={() =>
              setCataloguePage((page) => Math.min(pageCount, page + 1))
            }
          >
            Next
          </button>
        </nav>
      )}
      {catalogueHasMore && (
        <div className="catalogue-pagination catalogue-pagination-bottom">
          <button
            type="button"
            className="btn-sm btn-secondary"
            onClick={() => void loadMoreCatalogue()}
            disabled={loadingMoreCatalogue || busy}
          >
            {loadingMoreCatalogue ? "Loading products…" : "Load more products"}
          </button>
        </div>
      )}
    </div>
  );
}
