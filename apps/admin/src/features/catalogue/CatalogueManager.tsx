import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
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
  sanitizePublicSiteContent,
  SITE_CONTENT_DEFAULTS,
  type SiteContent,
} from "@material-square/types";
import CatalogueVariantsEditor, {
  type EditableVariant,
} from "./CatalogueVariantsEditor";
import MaterialSquareLogo from "../../components/MaterialSquareLogo";
import { confirmAdminAction } from "../../components/confirmAdminAction";
import PartnerBrandsManager from "./PartnerBrandsManager";
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
};
type Variant = EditableVariant;
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

const blank: Listing = {
  id: "",
  slug: "",
  code: "",
  name: "",
  brand: "",
  brandTagline: "",
  category: "cement",
  categoryLabel: "Cement & Aggregates",
  unit: "",
  packaging: "",
  image: "",
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
const customerPriceNote = (note: string | null | undefined) => {
  const value = String(note || "").trim();
  return !value ||
    /reference|observed|confirm local price|seller listing|local price and taxes may differ/i.test(
      value,
    )
    ? ""
    : value;
};
const customerProductDescription = (description: string | null | undefined) => {
  const value = String(description || "").trim();
  return !value ||
    /online reference|reference listing|confirm the exact grade|current client price|reference price/i.test(
      value,
    )
    ? ""
    : value;
};
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
export default function CatalogueManager({
  token,
  role,
  onSignOut,
  initialSearch = "",
}: {
  token: string;
  role: string;
  onSignOut: () => void;
  initialSearch?: string;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogueQuery, setCatalogueQuery] = useState(initialSearch);
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [catalogueSort, setCatalogueSort] = useState("recent");
  const [cataloguePage, setCataloguePage] = useState(1);
  const [productInterest, setProductInterest] = useState<
    Record<string, number>
  >({});
  const [managingBrands, setManagingBrands] = useState(false);
  const [partnerBrandOptions, setPartnerBrandOptions] = useState<string[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<ProductDraft | null>(
    null,
  );
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent>(() => ({
    ...SITE_CONTENT_DEFAULTS,
  }));
  const productForm = useRef<HTMLFormElement>(null);
  const previewStage = useRef<HTMLDivElement>(null);
  const canManage = ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"].includes(role);

  useEffect(() => {
    if (!editing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      productForm.current?.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [editing]);

  useEffect(() => {
    setCatalogueQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
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
    if (!previewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

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
        .map((product) => [product.category, product.categoryLabel]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const normalizedQuery = catalogueQuery.trim().toLocaleLowerCase();
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
    const matchesQuery =
      !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesBrand = brandFilter === "all" || product.brand === brandFilter;
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
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
    const leftAdded = left.createdAt
      ? Date.parse(left.createdAt)
      : left.sortOrder;
    const rightAdded = right.createdAt
      ? Date.parse(right.createdAt)
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
  const pricedPreviewVariant = previewListing?.variants
    .filter((variant) => variant.price != null && variant.price !== "")
    .reduce<Variant | undefined>(
      (lowest, variant) =>
        !lowest || Number(variant.price) < Number(lowest.price)
          ? variant
          : lowest,
      undefined,
    );
  const detailPreviewVariant = previewListing?.variants[0];
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
  const previewCardPrice =
    previewListing?.price != null && previewListing.price !== ""
      ? previewListing.price
      : (pricedPreviewVariant?.price ?? null);
  const previewCardPriceNote = customerPriceNote(
    previewListing?.priceNote || pricedPreviewVariant?.priceNote,
  );
  const previewDetailPrice =
    detailPreviewVariant?.price ?? previewListing?.price ?? null;
  const previewDetailPriceNote = customerPriceNote(
    detailPreviewVariant?.priceNote || previewListing?.priceNote,
  );
  const previewDescription = customerProductDescription(
    previewListing?.description,
  );
  const previewCardAvailability =
    previewListing?.availabilityStatus === "IN_STOCK" ||
    previewListing?.variants.some(
      (variant) =>
        variant.availabilityStatus === "IN_STOCK" ||
        (variant.availabilityStatus == null && variant.inStock),
    )
      ? "IN_STOCK"
      : previewListing?.availabilityStatus === "OUT_OF_STOCK" ||
          (previewListing?.variants.length &&
            previewListing.variants.every(
              (variant) => variant.availabilityStatus === "OUT_OF_STOCK",
            ))
        ? "OUT_OF_STOCK"
        : "CHECK_AVAILABILITY";
  const previewDetailAvailability =
    detailPreviewVariant?.availabilityStatus ||
    previewListing?.availabilityStatus ||
    (detailPreviewVariant?.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY");

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
    if (file.size > 5 * 1024 * 1024) {
      setError("Product images must be 5 MB or smaller.");
      input.value = "";
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
          signal: AbortSignal.timeout(60000),
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
  ) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP product image.");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Product images must be 5 MB or smaller.");
      input.value = "";
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
          signal: AbortSignal.timeout(60000),
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
            : "Could not upload this option image.",
        );
      setEditing((current) =>
        current
          ? {
              ...current,
              variants: current.variants.map((variant, rowIndex) =>
                rowIndex === index
                  ? { ...variant, image: result.url! }
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
                  ? { ...variant, image: result.url! }
                  : variant,
              ),
            }
          : current,
      );
      setNotice("Option photo uploaded. Save the product to keep it.");
      input.value = "";
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload this option image.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadGalleryImages(files: FileList, input: HTMLInputElement) {
    const selected = Array.from(files);
    const galleryCount = editing?.galleryImages.length || 0;
    const remaining = MAX_GALLERY_IMAGES - galleryCount;
    if (
      selected.length > remaining ||
      selected.some(
        (file) =>
          !new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError(
        remaining < 1
          ? "You can add up to three optional product images. Remove an image before uploading another."
          : `Choose up to ${remaining} more PNG, JPEG, or WebP image${remaining === 1 ? "" : "s"}, each 5 MB or smaller.`,
      );
      input.value = "";
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body,
            signal: AbortSignal.timeout(60000),
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
              : `Could not upload ${file.name}.`,
          );
        uploaded.push(result.url);
      }
      setEditing((current) =>
        current
          ? {
              ...current,
              galleryImages: Array.from(
                new Set([...(current.galleryImages || []), ...uploaded]),
              ),
            }
          : current,
      );
      setPreviewListing((current) =>
        current
          ? {
              ...current,
              galleryImages: Array.from(
                new Set([...(current.galleryImages || []), ...uploaded]),
              ),
            }
          : current,
      );
      setNotice(
        `${uploaded.length} gallery image${uploaded.length === 1 ? "" : "s"} uploaded. Save the product to keep them.`,
      );
      input.value = "";
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not upload these gallery images.",
      );
    } finally {
      setBusy(false);
    }
  }

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const rows = await request<Listing[]>("/products/catalogue");
      setListings(
        rows.map((row) => ({
          ...row,
          availabilityStatus:
            row.availabilityStatus ||
            (row.isInStock ? "IN_STOCK" : "CHECK_AVAILABILITY"),
          galleryImages: Array.isArray(row.galleryImages)
            ? row.galleryImages
            : [],
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
          features: Array.isArray(row.features) ? row.features : [],
          applications: Array.isArray(row.applications) ? row.applications : [],
          specifications:
            row.specifications && typeof row.specifications === "object"
              ? row.specifications
              : {},
        })),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the catalogue.",
      );
    } finally {
      setBusy(false);
    }
  }, [request]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    let active = true;
    void request<Array<{ name: string; isActive: boolean }>>(
      "/products/catalogue/partner-brands",
    )
      .then((brands) => {
        if (active)
          setPartnerBrandOptions(
            brands.filter((brand) => brand.isActive).map((brand) => brand.name),
          );
      })
      .catch(() => undefined);
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
      code: String(formValues.get("code") || "").trim() || null,
      category: String(formValues.get("category") || "").trim(),
      categoryLabel: String(formValues.get("categoryLabel") || "").trim(),
      unit: String(formValues.get("unit") || "").trim(),
      grade: String(formValues.get("grade") || "").trim() || null,
      packaging: String(formValues.get("packaging") || "").trim() || null,
      brandTagline: String(formValues.get("brandTagline") || "").trim() || null,
      image: String(formValues.get("image") || "").trim() || null,
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const code = String(values.get("code") || "").trim();
    const rawPrice = String(values.get("price") || "").trim();
    const rawCompare = String(values.get("compareAtPrice") || "").trim();
    const payload = {
      slug: slugify(String(values.get("slug") || code || name)),
      code: code || null,
      name,
      brand: String(values.get("brand") || "").trim(),
      brandTagline: String(values.get("brandTagline") || "").trim() || null,
      category: String(values.get("category") || "").trim(),
      categoryLabel: String(values.get("categoryLabel") || "").trim(),
      unit: String(values.get("unit") || "").trim(),
      packaging: String(values.get("packaging") || "").trim() || null,
      image: String(values.get("image") || "").trim() || null,
      galleryImages: fromLines(values.get("galleryImages")),
      grade: String(values.get("grade") || "").trim() || null,
      description: String(values.get("description") || "").trim() || null,
      minOrderQty: String(values.get("minOrderQty") || "").trim() || null,
      dispatchTime: String(values.get("dispatchTime") || "").trim() || null,
      price: rawPrice ? Number(rawPrice) : null,
      compareAtPrice: rawCompare ? Number(rawCompare) : null,
      priceNote:
        customerPriceNote(String(values.get("priceNote") || "")) || null,
      offerLabel: String(values.get("offerLabel") || "").trim() || null,
      offerStartsAt: String(values.get("offerStartsAt") || "") || null,
      offerEndsAt: String(values.get("offerEndsAt") || "") || null,
      availabilityStatus: String(
        values.get("availabilityStatus") || "CHECK_AVAILABILITY",
      ) as Listing["availabilityStatus"],
      isInStock: values.get("availabilityStatus") === "IN_STOCK",
      isPublished: values.get("isPublished") === "on",
      features: fromLines(values.get("features")),
      applications: fromLines(values.get("applications")),
      specifications: specsFromLines(values.get("specifications")),
      variants: (formProduct.variants || []).map((variant, sortOrder) => ({
        ...variant,
        isInStock: variant.availabilityStatus === "IN_STOCK",
        code: variant.code || null,
        price:
          variant.price == null || variant.price === ""
            ? null
            : Number(variant.price),
        compareAtPrice:
          variant.compareAtPrice == null || variant.compareAtPrice === ""
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
        quantityBreaks: variant.quantityBreaks || [],
        sortOrder,
      })),
      sortOrder: Number(values.get("sortOrder") || 0),
    };
    if (
      payload.galleryImages.length > MAX_GALLERY_IMAGES &&
      payload.galleryImages.length > (editing?.galleryImages.length || 0)
    ) {
      setError(
        "Add up to three optional product images. Existing listings with older galleries can still be saved as-is.",
      );
      return;
    }
    if (rawCompare && rawPrice && Number(rawCompare) < Number(rawPrice)) {
      setError(
        "Original price must be equal to or greater than the selling price.",
      );
      return;
    }
    if (
      payload.offerStartsAt &&
      payload.offerEndsAt &&
      payload.offerEndsAt < payload.offerStartsAt
    ) {
      setError("Offer end date must be on or after its start date.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/products/catalogue${editing?.id ? `/${editing.id}` : ""}`,
        editing?.id ? "PATCH" : "POST",
        payload,
      );
      setNotice(
        payload.isPublished
          ? "Product saved and published to the website."
          : "Product saved as a draft.",
      );
      try {
        localStorage.removeItem(productDraftKey(editing?.id || ""));
      } catch {
        /* browser storage is optional */
      }
      setEditing(null);
      setDraftSavedAt(null);
      setPreviewListing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this product.");
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

  const startEdit = (product: Listing) => {
    const recovery = recoverableDraftFor(product);
    const next = {
      ...product,
      ...(recovery
        ? {
            image: recovery.image,
            galleryImages: recovery.galleryImages,
            variants: recovery.variants,
          }
        : {}),
    };
    setPreviewListing(next);
    setPreviewMode("card");
    setEditing(next);
    setRecoveredDraft(recovery);
    setDraftSavedAt(recovery?.savedAt ?? null);
  };
  const startNew = () => {
    const product = {
      ...blank,
      sortOrder: listings.length
        ? Math.max(...listings.map((p) => p.sortOrder)) + 1
        : 0,
    };
    const recovery = recoverableDraftFor(product);
    const next = {
      ...product,
      ...(recovery
        ? {
            image: recovery.image,
            galleryImages: recovery.galleryImages,
            variants: recovery.variants,
          }
        : {}),
    };
    setPreviewListing(next);
    setPreviewMode("card");
    setEditing(next);
    setRecoveredDraft(recovery);
    setDraftSavedAt(recovery?.savedAt ?? null);
  };
  const formProduct = editing;

  const openProductPreview = () => {
    if (productForm.current) {
      captureProductDraft({
        currentTarget: productForm.current,
      } as FormEvent<HTMLFormElement>);
    }
    setPreviewOpen(true);
  };

  if (managingBrands)
    return (
      <PartnerBrandsManager
        token={token}
        role={role}
        onSignOut={onSignOut}
        onBack={() => setManagingBrands(false)}
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
            className="btn-sm btn-secondary"
            onClick={() => setManagingBrands(true)}
          >
            <Tags size={15} /> Partner brands
          </button>
          <button
            className="btn-sm btn-secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {canManage && (
            <button
              className="btn-sm btn-primary"
              disabled={busy}
              onClick={startNew}
            >
              <PackagePlus size={16} /> Add product
            </button>
          )}
        </div>
      </header>
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogue-editor-title"
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
                onClick={() => setEditing(null)}
                aria-label="Close product form"
              >
                <X size={16} />
              </button>
            </div>
            <div className="catalogue-fields">
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">01</span>
                <div>
                  <strong>Product identity</strong>
                  <small>Name, brand, category and ordering details.</small>
                </div>
              </div>
              <label>
                Product name
                <input
                  name="name"
                  required
                  maxLength={180}
                  defaultValue={formProduct.name}
                />
              </label>
              <label>
                Brand
                <input
                  name="brand"
                  list="catalogue-partner-brand-options"
                  maxLength={120}
                  defaultValue={formProduct.brand}
                />
                <datalist id="catalogue-partner-brand-options">
                  {[
                    ...new Set(
                      [
                        ...partnerBrandOptions,
                        ...brands,
                        formProduct.brand,
                      ].filter(Boolean),
                    ),
                  ].map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </label>
              <label>
                Product code
                <input
                  name="code"
                  maxLength={80}
                  defaultValue={formProduct.code || ""}
                />
              </label>
              <label>
                URL slug
                <input
                  name="slug"
                  maxLength={120}
                  placeholder="Generated from code or name"
                  defaultValue={formProduct.slug}
                />
              </label>
              <label>
                Category key
                <input
                  name="category"
                  required
                  maxLength={80}
                  defaultValue={formProduct.category}
                />
              </label>
              <label>
                Category name
                <input
                  name="categoryLabel"
                  required
                  maxLength={120}
                  defaultValue={formProduct.categoryLabel}
                />
              </label>
              <label>
                Unit shown to customer
                <input
                  name="unit"
                  required
                  maxLength={100}
                  placeholder="e.g. 50 kg bag"
                  defaultValue={formProduct.unit}
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
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">02</span>
                <div>
                  <strong>Pricing &amp; offers</strong>
                  <small>
                    Set a customer-facing price, optional offer and delivery
                    wording.
                  </small>
                </div>
              </div>
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
                  placeholder="e.g. per bag, GST included"
                  defaultValue={customerPriceNote(formProduct.priceNote)}
                />
              </label>
              <label>
                Offer label (optional)
                <input
                  name="offerLabel"
                  maxLength={120}
                  placeholder="e.g. Launch offer"
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
              <label>
                Packaging
                <input
                  name="packaging"
                  maxLength={500}
                  defaultValue={formProduct.packaging || ""}
                />
              </label>
              <label>
                Brand tagline
                <input
                  name="brandTagline"
                  maxLength={500}
                  defaultValue={formProduct.brandTagline || ""}
                />
              </label>
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">03</span>
                <div>
                  <strong>Product photos</strong>
                  <small>
                    Add one main photo and up to three optional views. Preview
                    them before publishing.
                  </small>
                </div>
              </div>
              <label className="catalogue-primary-image-url">
                Main photo · paste an image link
                <input
                  name="image"
                  type="url"
                  maxLength={1000}
                  placeholder="https://example.com/product-photo.jpg"
                  value={formProduct.image || ""}
                  onChange={(event) =>
                    setEditing({ ...formProduct, image: event.target.value })
                  }
                />
                <small>
                  Use a public image URL approved for this product. You can also
                  upload a file in the panel beside this field.
                </small>
                {formProduct.image && (
                  <span className="catalogue-image-preview">
                    <img
                      src={formProduct.image}
                      alt="Primary product preview"
                    />
                    <span>Main product photo</span>
                  </span>
                )}
              </label>
              <label className="catalogue-image-upload catalogue-primary-image-upload">
                <span>
                  <Upload size={17} />{" "}
                  {formProduct.image
                    ? "Replace main photo with a file"
                    : "Or upload the main photo"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (file) void uploadImage(file, input);
                  }}
                />
                <small>
                  PNG, JPEG or WebP · Up to 5 MB. Uploading replaces the main
                  photo.
                </small>
              </label>
              <input
                type="hidden"
                name="galleryImages"
                value={lines(formProduct.galleryImages || [])}
              />
              <div className="catalogue-gallery-url-options catalogue-wide">
                <div className="catalogue-gallery-url-heading">
                  <strong>Optional photo links</strong>
                  <span>
                    {formProduct.galleryImages.length} of {MAX_GALLERY_IMAGES}{" "}
                    added
                  </span>
                </div>
                {Array.from(
                  {
                    length: Math.max(
                      MAX_GALLERY_IMAGES,
                      formProduct.galleryImages.length,
                    ),
                  },
                  (_, index) => (
                    <label key={`gallery-url-${index}`}>
                      Photo {index + 1} · URL
                      <input
                        type="url"
                        value={formProduct.galleryImages[index] || ""}
                        placeholder="https://example.com/another-view.jpg"
                        onChange={(event) => {
                          const next = [...(formProduct.galleryImages || [])];
                          next[index] = event.currentTarget.value.trim();
                          setEditing({
                            ...formProduct,
                            galleryImages: next.filter(Boolean),
                          });
                        }}
                      />
                    </label>
                  ),
                )}
                <p>
                  Three optional views are available for new listings. Existing
                  listings may have one older extra photo; remove it if you want
                  to replace it.
                </p>
              </div>
              <div className="catalogue-image-upload catalogue-gallery-upload catalogue-wide">
                <label
                  className="catalogue-gallery-upload-label"
                  htmlFor="catalogue-gallery-upload-input"
                >
                  <Upload size={17} />
                  <strong>Or upload optional photos</strong>
                  <span>
                    Choose up to{" "}
                    {Math.max(
                      0,
                      MAX_GALLERY_IMAGES - formProduct.galleryImages.length,
                    )}{" "}
                    more · PNG, JPEG or WebP · 5 MB each
                  </span>
                </label>
                <input
                  id="catalogue-gallery-upload-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={
                    busy ||
                    formProduct.galleryImages.length >= MAX_GALLERY_IMAGES
                  }
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const files = input.files;
                    if (files?.length) void uploadGalleryImages(files, input);
                  }}
                />
              </div>
              {formProduct.galleryImages.length > 0 && (
                <div
                  className="catalogue-gallery-previews catalogue-wide"
                  aria-label="Optional product photo previews"
                >
                  {formProduct.galleryImages.map((image, index) => (
                    <span
                      className="catalogue-image-preview"
                      key={`${image}-${index}`}
                    >
                      <img
                        src={image}
                        alt={`Optional product photo ${index + 1}`}
                      />
                      <span>Photo {index + 1}</span>
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        aria-label={`Remove optional photo ${index + 1}`}
                        onClick={() =>
                          setEditing({
                            ...formProduct,
                            galleryImages: formProduct.galleryImages.filter(
                              (_, imageIndex) => imageIndex !== index,
                            ),
                          })
                        }
                      >
                        <X size={14} /> Remove
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">04</span>
                <div>
                  <strong>Customer-facing content</strong>
                  <small>
                    Explain the product clearly and add useful specifications.
                  </small>
                </div>
              </div>
              <label>
                Display order
                <input
                  name="sortOrder"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={formProduct.sortOrder}
                />
              </label>
              <label className="catalogue-wide">
                Short description
                <textarea
                  name="description"
                  rows={3}
                  maxLength={3000}
                  defaultValue={formProduct.description || ""}
                />
              </label>
              <label>
                Features (one per line)
                <textarea
                  name="features"
                  rows={5}
                  defaultValue={lines(formProduct.features)}
                />
              </label>
              <label>
                Applications (one per line)
                <textarea
                  name="applications"
                  rows={5}
                  defaultValue={lines(formProduct.applications)}
                />
              </label>
              <label className="catalogue-wide">
                Customer specifications (one “name: value” per line)
                <textarea
                  name="specifications"
                  rows={5}
                  defaultValue={Object.entries(
                    visibleSpecs(formProduct.specifications),
                  )
                    .map(([key, value]) => `${key}: ${value}`)
                    .join("\n")}
                />
              </label>
              <div className="catalogue-form-section-heading catalogue-wide">
                <span className="catalogue-section-number">05</span>
                <div>
                  <strong>Options &amp; variants</strong>
                  <small>
                    Configure sizes, colours, packaging or other selectable
                    combinations.
                  </small>
                </div>
              </div>
              <CatalogueVariantsEditor
                variants={formProduct.variants || []}
                onChange={(variants) => {
                  const next = { ...formProduct, variants };
                  setEditing(next);
                  setPreviewListing((current) =>
                    current ? { ...current, variants } : current,
                  );
                }}
                onUploadImage={(file, input, index) =>
                  void uploadVariantImage(file, input, index)
                }
                defaultUnit={formProduct.unit}
                busy={busy}
              />
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
                          className={previewMode === "card" ? "active" : ""}
                          aria-pressed={previewMode === "card"}
                          onClick={() => setPreviewMode("card")}
                        >
                          Marketplace card
                        </button>
                        <button
                          type="button"
                          className={previewMode === "detail" ? "active" : ""}
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
                          className={
                            previewViewport === "desktop" ? "active" : ""
                          }
                          aria-pressed={previewViewport === "desktop"}
                          onClick={() => setPreviewViewport("desktop")}
                        >
                          Desktop
                        </button>
                        <button
                          type="button"
                          className={
                            previewViewport === "mobile" ? "active" : ""
                          }
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
                        {(siteContent["contact.phoneDisplay"].trim() ||
                          siteContent["contact.phone"].trim()) && (
                          <strong>
                            ☎{" "}
                            {siteContent["contact.phoneDisplay"].trim() ||
                              siteContent["contact.phone"].trim()}
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
                            <article className="store-preview-card store-preview-current-product">
                              <div className="store-preview-media">
                                <StorefrontPreviewImage
                                  src={
                                    previewListing.image ||
                                    previewListing.galleryImages[0] ||
                                    ""
                                  }
                                  alt={previewListing.name || "Product preview"}
                                />
                                <span className="store-preview-category">
                                  {previewListing.categoryLabel || "Category"}
                                </span>
                                <span
                                  className={`store-preview-stock ${previewCardAvailability === "IN_STOCK" ? "available" : ""}`}
                                >
                                  {previewCardAvailability === "IN_STOCK"
                                    ? "In stock"
                                    : previewCardAvailability === "OUT_OF_STOCK"
                                      ? "Out of stock"
                                      : "Check availability"}
                                </span>
                                {(previewListing.offerLabel ||
                                  previewListing.variants.find(
                                    (variant) => variant.offerLabel,
                                  )?.offerLabel) && (
                                  <span className="store-preview-offer">
                                    {previewListing.offerLabel ||
                                      previewListing.variants.find(
                                        (variant) => variant.offerLabel,
                                      )?.offerLabel}
                                  </span>
                                )}
                              </div>
                              <div className="store-preview-card-body">
                                <div className="store-preview-brand-line">
                                  <div className="store-preview-brand-title">
                                    <span
                                      className="store-preview-brand-mark"
                                      aria-hidden="true"
                                    >
                                      {(previewListing.brand || "B")
                                        .slice(0, 1)
                                        .toUpperCase()}
                                    </span>
                                    <strong>
                                      {previewListing.brand || "Brand"}
                                    </strong>
                                  </div>
                                  {previewListing.code && (
                                    <span>{previewListing.code}</span>
                                  )}
                                </div>
                                <h3>{previewListing.name || "Product name"}</h3>
                                {(previewListing.grade ||
                                  previewListing.specifications.sizes) && (
                                  <p className="store-preview-unit">
                                    {previewListing.grade ||
                                      `Size guide: ${previewListing.specifications.sizes}`}
                                  </p>
                                )}
                                {(() => {
                                  const colours = Array.from(
                                    new Set(
                                      previewListing.variants.flatMap(
                                        (variant) =>
                                          Object.entries(
                                            variant.attributes || {},
                                          )
                                            .filter(([key]) =>
                                              /colou?r|shade|finish/i.test(key),
                                            )
                                            .map(([, value]) => value.trim())
                                            .filter(Boolean),
                                      ),
                                    ),
                                  );
                                  return colours.length ? (
                                    <div className="store-preview-colours">
                                      <span>Colours &amp; finishes</span>
                                      <div>
                                        {colours.slice(0, 3).map((colour) => (
                                          <small key={colour}>{colour}</small>
                                        ))}
                                        {colours.length > 3 && (
                                          <small>+{colours.length - 3}</small>
                                        )}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                {previewListing.features.length > 0 && (
                                  <ul>
                                    {previewListing.features
                                      .slice(0, 2)
                                      .map((feature, index) => (
                                        <li key={`${feature}-${index}`}>
                                          <span className="store-preview-check">
                                            ✓
                                          </span>
                                          <span>{feature}</span>
                                        </li>
                                      ))}
                                  </ul>
                                )}
                                <div className="store-preview-product-specs">
                                  <div>
                                    <span>Packaging</span>
                                    <strong>
                                      {previewListing.unit || "Add packaging"}
                                    </strong>
                                  </div>
                                  {previewListing.specifications.standard && (
                                    <div>
                                      <span>IS Standard</span>
                                      <strong>
                                        {previewListing.specifications.standard}
                                      </strong>
                                    </div>
                                  )}
                                </div>
                                <div className="store-preview-price-row">
                                  <div>
                                    <span className="store-preview-price-caption">
                                      {!previewListing.price &&
                                      pricedPreviewVariant
                                        ? "Starting from"
                                        : previewCardPrice
                                          ? "Price per unit"
                                          : "Pricing"}
                                    </span>
                                    <div className="store-preview-price">
                                      {previewCardPrice ? (
                                        <>
                                          <strong>
                                            ₹
                                            {Number(
                                              previewCardPrice,
                                            ).toLocaleString("en-IN")}
                                          </strong>
                                          <span>
                                            {" "}
                                            / {previewListing.unit || "unit"}
                                          </span>
                                        </>
                                      ) : (
                                        <strong>Request a quote</strong>
                                      )}
                                    </div>
                                    {previewCardPriceNote && (
                                      <small>{previewCardPriceNote}</small>
                                    )}
                                  </div>
                                  <span className="store-preview-moq">
                                    MOQ:{" "}
                                    {previewListing.minOrderQty || "Confirm"}
                                  </span>
                                </div>
                                <div className="store-preview-actions">
                                  <button type="button" disabled>
                                    <Info size={13} /> View details
                                  </button>
                                  <button type="button" disabled>
                                    <PackagePlus size={13} />{" "}
                                    {previewListing.variants.length ||
                                    previewListing.specifications.sizes
                                      ? "Choose options"
                                      : "Add to quote list"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled
                                    aria-label="Ask on WhatsApp"
                                  >
                                    <Phone size={14} />
                                  </button>
                                </div>
                              </div>
                            </article>
                            {previewGridNeighbors.map((listing) => {
                              const listingPrice =
                                listing.price ||
                                listing.variants.find(
                                  (variant) =>
                                    variant.price != null &&
                                    variant.price !== "",
                                )?.price ||
                                null;
                              const listingStatus =
                                listing.availabilityStatus ||
                                (listing.isInStock
                                  ? "IN_STOCK"
                                  : "CHECK_AVAILABILITY");
                              const listingFeatures = listing.features || [];
                              return (
                                <article
                                  className="store-preview-card store-preview-context-product"
                                  key={listing.id}
                                >
                                  <div className="store-preview-media">
                                    <StorefrontPreviewImage
                                      src={
                                        listing.image ||
                                        listing.galleryImages[0] ||
                                        ""
                                      }
                                      alt={listing.name || "Published product"}
                                    />
                                    <span className="store-preview-category">
                                      {listing.categoryLabel || "Category"}
                                    </span>
                                    <span
                                      className={`store-preview-stock ${listingStatus === "IN_STOCK" ? "available" : ""}`}
                                    >
                                      {listingStatus === "IN_STOCK"
                                        ? "In stock"
                                        : listingStatus === "OUT_OF_STOCK"
                                          ? "Out of stock"
                                          : "Check availability"}
                                    </span>
                                    {listing.offerLabel && (
                                      <span className="store-preview-offer">
                                        {listing.offerLabel}
                                      </span>
                                    )}
                                  </div>
                                  <div className="store-preview-card-body">
                                    <div className="store-preview-brand-line">
                                      <div className="store-preview-brand-title">
                                        <span
                                          className="store-preview-brand-mark"
                                          aria-hidden="true"
                                        >
                                          {(listing.brand || "B")
                                            .slice(0, 1)
                                            .toUpperCase()}
                                        </span>
                                        <strong>
                                          {listing.brand || "Brand"}
                                        </strong>
                                      </div>
                                      {listing.code && (
                                        <span>{listing.code}</span>
                                      )}
                                    </div>
                                    <h3>{listing.name || "Product name"}</h3>
                                    {(listing.grade ||
                                      listing.specifications.sizes) && (
                                      <p className="store-preview-unit">
                                        {listing.grade ||
                                          `Size guide: ${listing.specifications.sizes}`}
                                      </p>
                                    )}
                                    {listingFeatures.length > 0 && (
                                      <ul>
                                        {listingFeatures
                                          .slice(0, 2)
                                          .map((feature, index) => (
                                            <li key={`${feature}-${index}`}>
                                              <span className="store-preview-check">
                                                ✓
                                              </span>
                                              <span>{feature}</span>
                                            </li>
                                          ))}
                                      </ul>
                                    )}
                                    <div className="store-preview-product-specs">
                                      <div>
                                        <span>Packaging</span>
                                        <strong>
                                          {listing.unit || "Add packaging"}
                                        </strong>
                                      </div>
                                      {listing.specifications.standard && (
                                        <div>
                                          <span>IS Standard</span>
                                          <strong>
                                            {listing.specifications.standard}
                                          </strong>
                                        </div>
                                      )}
                                    </div>
                                    <div className="store-preview-price-row">
                                      <div>
                                        <span className="store-preview-price-caption">
                                          {listingPrice
                                            ? "Price per unit"
                                            : "Pricing"}
                                        </span>
                                        <div className="store-preview-price">
                                          {listingPrice ? (
                                            <>
                                              <strong>
                                                ₹
                                                {Number(
                                                  listingPrice,
                                                ).toLocaleString("en-IN")}
                                              </strong>
                                              <span>
                                                {" "}
                                                / {listing.unit || "unit"}
                                              </span>
                                            </>
                                          ) : (
                                            <strong>Request a quote</strong>
                                          )}
                                        </div>
                                        {customerPriceNote(
                                          listing.priceNote,
                                        ) && (
                                          <small>
                                            {customerPriceNote(
                                              listing.priceNote,
                                            )}
                                          </small>
                                        )}
                                      </div>
                                      <span className="store-preview-moq">
                                        MOQ: {listing.minOrderQty || "Confirm"}
                                      </span>
                                    </div>
                                    <div className="store-preview-actions">
                                      <button type="button" disabled>
                                        <Info size={13} /> View details
                                      </button>
                                      <button type="button" disabled>
                                        <PackagePlus size={13} />{" "}
                                        {listing.variants.length ||
                                        listing.specifications.sizes
                                          ? "Choose options"
                                          : "Add to quote list"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled
                                        aria-label="Ask on WhatsApp"
                                      >
                                        <Phone size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <article className="store-preview-detail">
                          <div className="store-preview-detail-breadcrumb">
                            <span>Home</span>
                            <span>/</span>
                            <span>{previewListing.brand || "Brand"}</span>
                            <span>/</span>
                            <strong>
                              {previewListing.name || "Product details"}
                            </strong>
                          </div>
                          <div className="store-preview-detail-media">
                            <StorefrontPreviewImage
                              src={
                                previewListing.image ||
                                previewListing.galleryImages[0] ||
                                ""
                              }
                              alt={previewListing.name || "Product preview"}
                            />
                            {previewListing.galleryImages.length > 0 && (
                              <div className="store-preview-thumbnails">
                                {previewListing.galleryImages
                                  .slice(0, 4)
                                  .map((image, index) => (
                                    <img
                                      key={`${image}-${index}`}
                                      src={image}
                                      alt={`Product view ${index + 1}`}
                                    />
                                  ))}
                              </div>
                            )}
                          </div>
                          <div className="store-preview-detail-copy">
                            <div className="store-preview-detail-kicker">
                              <span>
                                {previewListing.categoryLabel || "Category"}
                              </span>
                              {previewListing.code && (
                                <span>SKU · {previewListing.code}</span>
                              )}
                            </div>
                            <div className="store-preview-brand-line">
                              <div className="store-preview-brand-title">
                                <span
                                  className="store-preview-brand-mark"
                                  aria-hidden="true"
                                >
                                  {(previewListing.brand || "B")
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </span>
                                <strong>
                                  {previewListing.brand || "Brand"}
                                </strong>
                              </div>
                              {previewListing.brandTagline && (
                                <span>{previewListing.brandTagline}</span>
                              )}
                            </div>
                            <h2>{previewListing.name || "Product name"}</h2>
                            {previewListing.grade && (
                              <span className="store-preview-grade">
                                {previewListing.grade}
                              </span>
                            )}
                            {customerPriceNote(previewListing.priceNote) && (
                              <p className="store-preview-note">
                                {customerPriceNote(previewListing.priceNote)}
                              </p>
                            )}
                            {previewDescription ? (
                              <p>{previewDescription}</p>
                            ) : (
                              !previewListing.description && (
                                <p>
                                  A product description will appear here when
                                  you add one.
                                </p>
                              )
                            )}
                            {Object.keys(
                              visibleSpecs(previewListing.specifications),
                            ).length > 0 && (
                              <div className="store-preview-specs">
                                <h3>Specifications</h3>
                                {Object.entries(
                                  visibleSpecs(previewListing.specifications),
                                ).map(([key, value]) => (
                                  <div key={key}>
                                    <span>{key}</span>
                                    <strong>{value}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                            {previewListing.features.length > 0 && (
                              <div className="store-preview-list">
                                <h3>Key features</h3>
                                <ul>
                                  {previewListing.features.map(
                                    (feature, index) => (
                                      <li key={`${feature}-${index}`}>
                                        {feature}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                            {previewListing.applications.length > 0 && (
                              <div className="store-preview-list">
                                <h3>Applications</h3>
                                <ul>
                                  {previewListing.applications.map(
                                    (application, index) => (
                                      <li key={`${application}-${index}`}>
                                        {application}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                          <aside className="store-preview-detail-order">
                            <div className="store-preview-buy-heading">
                              <span>Configure your selection</span>
                              <strong>Choose a product option</strong>
                              <small>
                                Options and pricing reflect the selected product
                                combination.
                              </small>
                            </div>
                            <span className="store-preview-price-caption">
                              {previewDetailPrice
                                ? `Price per ${detailPreviewVariant?.unit || previewListing.unit || "unit"}`
                                : "Pricing"}
                            </span>
                            <div className="store-preview-detail-price">
                              {previewDetailPrice ? (
                                <strong>
                                  ₹
                                  {Number(previewDetailPrice).toLocaleString(
                                    "en-IN",
                                  )}
                                </strong>
                              ) : (
                                <strong>Request a quotation</strong>
                              )}
                            </div>
                            {(detailPreviewVariant?.offerLabel ||
                              previewListing.offerLabel) && (
                              <span className="store-preview-detail-offer">
                                {detailPreviewVariant?.offerLabel ||
                                  previewListing.offerLabel}
                              </span>
                            )}
                            {previewDetailPriceNote && (
                              <small className="store-preview-order-note">
                                {previewDetailPriceNote}
                              </small>
                            )}
                            <span
                              className={`store-preview-detail-stock ${previewDetailAvailability === "IN_STOCK" ? "available" : ""}`}
                            >
                              {previewDetailAvailability === "IN_STOCK"
                                ? "In stock"
                                : previewDetailAvailability === "OUT_OF_STOCK"
                                  ? "Out of stock"
                                  : "Check availability"}
                            </span>
                            {(detailPreviewVariant?.minOrderQuantity ||
                              previewListing.minOrderQty) && (
                              <small className="store-preview-order-moq">
                                Minimum order:{" "}
                                {detailPreviewVariant?.minOrderQuantity ||
                                  previewListing.minOrderQty}{" "}
                                {detailPreviewVariant?.unit ||
                                  previewListing.unit}
                              </small>
                            )}
                            {previewListing.variants.length > 0 && (
                              <div className="store-preview-variants">
                                <h3>Choose an option</h3>
                                <div>
                                  {previewListing.variants
                                    .slice(0, 6)
                                    .map((variant, index) => (
                                      <span
                                        key={`${variant.id || variant.label}-${index}`}
                                      >
                                        <strong>
                                          {variant.label ||
                                            Object.values(
                                              variant.attributes || {},
                                            ).join(" · ") ||
                                            `Option ${index + 1}`}
                                        </strong>
                                        <small>
                                          {variant.price != null &&
                                          variant.price !== ""
                                            ? `₹${Number(variant.price).toLocaleString("en-IN")}`
                                            : "Request a quote"}
                                        </small>
                                      </span>
                                    ))}
                                </div>
                                {previewListing.variants.length > 6 && (
                                  <small>
                                    +{previewListing.variants.length - 6} more
                                    options
                                  </small>
                                )}
                              </div>
                            )}
                            <label className="store-preview-quantity">
                              Quantity ({previewListing.unit || "unit"})
                              <input
                                type="text"
                                value={
                                  previewListing.minOrderQty?.match(
                                    /[\d.]+/,
                                  )?.[0] || "1"
                                }
                                readOnly
                              />
                            </label>
                            <button
                              type="button"
                              className="store-preview-detail-cta"
                              disabled
                            >
                              <PackagePlus size={15} /> Add to Material List{" "}
                              <ArrowRight size={15} />
                            </button>
                            <small className="store-preview-private-note">
                              Preview controls are disabled. Customers can use
                              them on the published product page.
                            </small>
                          </aside>
                        </article>
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
        products · {listings.filter((p) => p.isPublished).length} published
      </div>
      {listings.length === 0 && !busy && (
        <section className="panel-card catalogue-empty">
          <h3>No catalogue products yet</h3>
          <p>
            {canManage
              ? "Add the first client-approved product as a draft, then publish it after checking its details and options."
              : "A catalogue manager can add client-approved products here. No sample products are being shown."}
          </p>
          {canManage && (
            <button className="btn-sm btn-primary" onClick={startNew}>
              <PackagePlus size={15} /> Add first product
            </button>
          )}
        </section>
      )}
      {listings.length > 0 && visibleListings.length === 0 && (
        <section className="panel-card catalogue-empty">
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
      {visibleListings.length > 0 && (
        <nav className="catalogue-pagination" aria-label="Catalogue pages">
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
                {customerPriceNote(product.priceNote) && (
                  <span>{customerPriceNote(product.priceNote)}</span>
                )}
                {product.offerLabel && (
                  <span className="catalogue-offer">{product.offerLabel}</span>
                )}
              </div>
              {product.variants?.length > 0 && (
                <details>
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
                                : `${variant.minOrderQuantity} ${variant.unit}`}
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
                  onClick={() => startEdit(product)}
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
    </div>
  );
}
