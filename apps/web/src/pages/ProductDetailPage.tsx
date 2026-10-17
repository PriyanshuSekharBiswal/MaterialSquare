import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info, Truck } from "lucide-react";
import { materialId } from "../ids";
import { useCustomer } from "../customer";
import { trackWebsiteEvent } from "../analytics";
import type { CatalogueProduct, MaterialItem } from "../types";
import { catalogueCategoryLabel, normalizeCatalogueCategory, parsePolicy, publicFaqEntries } from "@material-square/types";
import ProductDetailSurface, { type ProductDetailChoiceGroup } from "../../../../packages/storefront-ui/ProductDetailSurface";
import { getBrandMeta } from "../components/icons/BrandBadges";
import PartnerBrandLogo from "../components/PartnerBrandLogo";
import ProductRecommendationCarousel from "../components/ProductRecommendationCarousel";
import { bestMatchingVariant } from "../search/variant-match";
import { partnerBrandMatchesProduct, usePartnerBrands } from "../partner-brands";
import { customerCardFeatures, customerPriceNote, customerProductDescription, customerSpecifications } from "../catalogue/customer-display";
import { useSiteContent } from "../site-content";

export default function ProductDetailPage({ products, loading = false, catalogueUnavailable = false, onRetryCatalogue }: { products: CatalogueProduct[]; loading?: boolean; catalogueUnavailable?: boolean; onRetryCatalogue?: () => void }) {
  const { productId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedVariantId = searchParams.get("variant") || "";
  const searchQuery = searchParams.get("q") || "";
  const product = products.find((item) => item.id === productId);
  const { items, updateItems, ready, canEdit, error } = useCustomer();
  const partnerBrands = usePartnerBrands();
  const siteContent = useSiteContent();
  const [specification, setSpecification] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [added, setAdded] = useState(false);
  const initializedSelection = useRef("");

  useEffect(() => {
    if (!product) return;
    const queryKey = `${product.id}:${searchQuery}`;
    if (initializedSelection.current === queryKey) {
      const selectedFromUrl = product.variants?.find((variant) => variant.id === requestedVariantId);
      if (selectedFromUrl) setSelectedVariantId(selectedFromUrl.id);
      return;
    }
    initializedSelection.current = queryKey;
    setSpecification("");
    const requested = product.variants?.find((variant) => variant.id === requestedVariantId);
    const matched = requested || bestMatchingVariant(product, searchQuery);
    const initial = matched || product.variants?.find((variant) => variant.inStock) || product.variants?.[0];
    setQuantity(String(Math.max(1, Number(initial?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0))));
    setSelectedVariantId(initial?.id || "");
    setSelectedImage("");
    setAdded(false);
    trackWebsiteEvent({ type: "product_view", target: product.id });
  }, [product?.id, requestedVariantId, searchQuery]);

  const variants = product?.variants || [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || variants[0];
  const optionGroups = useMemo(() => {
    const values = new Map<string, { label: string; values: string[] }>();
    for (const variant of variants) for (const [rawKey, rawValue] of Object.entries(variant.attributes || {})) {
      const label = rawKey.trim();
      const value = String(rawValue || "").trim();
      if (!label || !value) continue;
      const key = label.toLocaleLowerCase();
      const group = values.get(key) || { label, values: [] };
      if (!group.values.some((existing) => existing.toLocaleLowerCase() === value.toLocaleLowerCase())) group.values.push(value);
      values.set(key, group);
    }
    const attributeSignatures = variants.map((variant) => JSON.stringify(
      Object.entries(variant.attributes || {}).map(([key, value]) => [key.trim().toLocaleLowerCase(), String(value).trim().toLocaleLowerCase()]).sort(([left], [right]) => left.localeCompare(right)),
    ));
    if (variants.length > 1 && (!values.size || new Set(attributeSignatures).size < variants.length)) {
      const labels = Array.from(new Set(variants.map((variant) => variant.label.trim()).filter(Boolean)));
      if (labels.length > 1) values.set("__variant", { label: "Option", values: labels });
    }
    return Array.from(values.entries()).map(([key, group]) => ({ key, ...group }));
  }, [variants]);
  const technicalSpecs = useMemo(() => customerSpecifications({
    ...(product?.specs || {}),
    ...(selectedVariant?.attributes || {}),
  }), [product, selectedVariant]);

  if (!product && loading) return <p className="page-loading-state container" role="status">Loading product details…</p>;
  if (!product && catalogueUnavailable) return (
    <section className="product-route-empty container" role="alert">
      <span className="badge-pill badge-orange-pill">Catalogue unavailable</span>
      <h1>We couldn’t load the published inventory.</h1>
      <p>Please try again in a moment. No sample products are shown.</p>
      {onRetryCatalogue && <button className="btn btn-orange" type="button" onClick={onRetryCatalogue}>Retry inventory <ArrowRight size={16} /></button>}
    </section>
  );
  if (!product) return (
    <section className="product-route-empty container">
      <span className="badge-pill badge-orange-pill">Product unavailable</span>
      <h1>This product is no longer in the catalogue.</h1>
      <p>It may have been unpublished or its details may have changed.</p>
      <Link className="btn btn-orange" to="/marketplace">Browse the catalogue <ArrowRight size={16} /></Link>
    </section>
  );

  const currentProduct = product;

  const brandMeta = getBrandMeta(product.brand);
  const partnerBrand = partnerBrands.find((brand) => partnerBrandMatchesProduct(brand.name, product.brand, `${product.category} ${product.categoryLabel}`));
  const displayBrand = partnerBrand || { id: brandMeta?.id, name: product.brand };
  const gallery = Array.from(new Set([...(selectedVariant?.galleryImages || []), selectedVariant?.image, ...(product.galleryImages || []), product.image].filter((image): image is string => Boolean(image))));
  const activeImage = selectedImage || gallery[0] || null;
  const selectedLabel = [selectedVariant?.label, ...Object.entries(selectedVariant?.attributes || {}).map(([key, value]) => `${key}: ${value}`), specification.trim()].filter(Boolean).join(" · ");
  const quantityBreaks = (selectedVariant?.quantityBreaks || []).slice().sort((a, b) => Number(a.minimumQuantity) - Number(b.minimumQuantity));
  const matchedBreak = quantityBreaks.filter((row) => Number(quantity) >= Number(row.minimumQuantity)).at(-1);
  const price = matchedBreak?.unitPrice ?? selectedVariant?.price ?? product.price;
  const compareAtPrice = matchedBreak ? null : selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const discountPercent = price != null && compareAtPrice != null && Number(compareAtPrice) > Number(price)
    ? Math.round(((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100)
    : 0;
  const unit = selectedVariant?.unit || product.unit;
  const priceDisclosure = customerPriceNote(selectedVariant?.priceNote || product.priceNote);
  const description = customerProductDescription(product.description);
  const faqEntries = publicFaqEntries(siteContent);
  const returnPolicy = parsePolicy(siteContent["policy.returns"], "returns");
  const availability = selectedVariant?.availabilityStatus || product.availabilityStatus || ((selectedVariant?.inStock ?? product.inStock) ? "IN_STOCK" : "CHECK_AVAILABILITY");
  const minimumOrder = Number(selectedVariant?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0) || 0;
  const productCategoryId = normalizeCatalogueCategory(product.categoryLabel || product.category);
  const productCategoryLabel = catalogueCategoryLabel(product.categoryLabel || product.category);
  const relatedVariants = variants
    .filter((variant) => variant.id !== selectedVariant?.id)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const relatedProducts = products.filter((item) => item.id !== product.id && normalizeCatalogueCategory(item.categoryLabel || item.category) === productCategoryId).slice(0, 10);
  const complementaryCategories: Record<string, string[]> = {
    cement: ["paints", "pipes", "adhesives", "steel"],
    pipes: ["sanitary", "paints", "adhesives", "cement"],
    wires: ["sanitary", "paints", "pipes", "cement"],
    paints: ["adhesives", "pipes", "sanitary", "cement"],
    sanitary: ["pipes", "paints", "adhesives", "cement"],
    steel: ["cement", "pipes", "paints", "adhesives"],
    adhesives: ["paints", "pipes", "cement", "sanitary"],
  };
  // Keep recommendations within the curated catalogue taxonomy. Raw product
  // category slugs (for example "paints-wall-prep") are internal and should
  // not create customer-facing sections on the product page.
  const complementaryCategoryOrder = complementaryCategories[productCategoryId] || [];
  const complementaryByCategory = complementaryCategoryOrder.map((category) => products
    .filter((item) => normalizeCatalogueCategory(item.categoryLabel || item.category) === category && item.id !== product.id && !relatedProducts.some((related) => related.id === item.id)));
  const complementaryProducts = Array.from({ length: 10 }, (_, round) => complementaryByCategory.flatMap((categoryProducts) => categoryProducts[round] ? [categoryProducts[round]] : []))
    .flat()
    .slice(0, 10);
  const additionalCategorySections = complementaryCategoryOrder
    .map((category) => ({
      category,
      products: products.filter((item) => normalizeCatalogueCategory(item.categoryLabel || item.category) === category && item.id !== product.id).slice(0, 10),
    }))
    .filter((section) => section.products.length > 0)
    .slice(0, 3);
  const inList = items.some((item) => (item.catalogueId || item.id) === product.id && (item.variantId || "") === (selectedVariant?.id || "") && (item.specification || "") === selectedLabel);

  const preferredUnitGroup = optionGroups.find((group) =>
    /size|unit|pack|volume|capacity|weight/i.test(group.key),
  );
  const primaryChoiceKey = preferredUnitGroup?.key || optionGroups[0]?.key;
  const orderedOptionGroups = primaryChoiceKey
    ? [
        ...optionGroups.filter((group) => group.key === primaryChoiceKey),
        ...optionGroups.filter((group) => group.key !== primaryChoiceKey),
      ]
    : optionGroups;
  const detailChoiceGroups: ProductDetailChoiceGroup[] = (orderedOptionGroups.length
    ? orderedOptionGroups
    : variants.length ? [{ key: "__variant", label: "Choose size, pack or option", values: variants.map((variant) => variant.label) }] : [])
    .map((group) => {
      const selectedValue = group.key === "__variant"
        ? selectedVariant?.label || ""
        : Object.entries(selectedVariant?.attributes || {}).find(([key]) => key.trim().toLocaleLowerCase() === group.key)?.[1] || "";
      return {
        label:
          group.key === preferredUnitGroup?.key &&
          /^(size|unit|pack|volume|capacity|weight)s?$/i.test(group.key)
            ? "Unit"
            : group.label,
        presentation:
          group.key === primaryChoiceKey || group.key === "__variant"
            ? "cards"
            : "select",
        selectedValue,
        choices: group.values.map((value) => {
          const optionVariant = group.key === "__variant"
            ? variants.find((variant) => variant.label.trim() === value)
            : bestVariantForAttribute(group.key, value);
          return {
            label: value,
            price: optionVariant?.price ?? product.price,
            offerLabel: optionVariant?.offerLabel,
            selected: selectedValue.toLocaleLowerCase() === value.toLocaleLowerCase(),
            onSelect: () => selectAttribute(group.key, value),
          };
        }),
      };
    });

  function addSelection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(quantity);
    const requiredMinimum = minimumOrder > 0 ? minimumOrder : 1;
    if (availability === "OUT_OF_STOCK" || !ready || !Number.isFinite(value) || value < requiredMinimum || value > 1_000_000) return;
    const accepted = updateItems((old) => {
      const existing = old.find((item) => (item.catalogueId || item.id) === currentProduct.id && (item.variantId || "") === (selectedVariant?.id || "") && (item.specification || "") === selectedLabel);
      const item: MaterialItem = {
        ...currentProduct,
        ...(selectedVariant ? { code: selectedVariant.code || currentProduct.code, price, compareAtPrice: selectedVariant.compareAtPrice, priceNote: selectedVariant.priceNote, unit, inStock: selectedVariant.inStock, variantId: selectedVariant.id, minOrderQuantity: selectedVariant.minOrderQuantity ?? (minimumOrder > 0 ? minimumOrder : undefined), image: selectedVariant.image || currentProduct.image, galleryImages: selectedVariant.galleryImages || currentProduct.galleryImages } : minimumOrder > 0 ? { minOrderQuantity: minimumOrder } : {}),
        catalogueId: currentProduct.id,
        id: existing?.id || `${currentProduct.id}-${materialId()}`,
        specification: selectedLabel,
        quantity: value,
      };
      return existing ? old.map((row) => row.id === existing.id ? item : row) : [...old, item];
    });
    if (accepted && !inList) trackWebsiteEvent({ type: "add_to_list", target: currentProduct.id });
    setAdded(accepted);
  }

  function selectVariant(variant: (typeof variants)[number]) {
    const minimum = Number(variant.minOrderQuantity || product?.minOrderQty?.match(/[\d.]+/)?.[0] || 0);
    setSelectedVariantId(variant.id);
    setSelectedImage(variant.image || "");
    if (minimum > Number(quantity)) setQuantity(String(minimum));
    setAdded(false);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("variant", variant.id);
      return next;
    }, { replace: true });
  }

  function bestVariantForAttribute(groupKey: string, value: string) {
    if (groupKey === "__variant") return variants.find((variant) => variant.label.trim() === value) || variants[0];
    const selectedAttributes = selectedVariant?.attributes || {};
    const candidates = variants.filter((variant) => Object.entries(variant.attributes || {}).some(([key, candidate]) => key.trim().toLocaleLowerCase() === groupKey && String(candidate).toLocaleLowerCase() === value.toLocaleLowerCase()));
    return candidates.sort((a, b) => {
      const score = (variant: (typeof variants)[number]) => Object.entries(selectedAttributes).filter(([key, current]) => key.trim().toLocaleLowerCase() !== groupKey && Object.entries(variant.attributes || {}).some(([otherKey, otherValue]) => otherKey.trim().toLocaleLowerCase() === key.trim().toLocaleLowerCase() && String(otherValue).toLocaleLowerCase() === String(current).toLocaleLowerCase())).length;
      const available = (variant: (typeof variants)[number]) => (variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")) === "IN_STOCK" ? 1 : 0;
      return score(b) - score(a) || available(b) - available(a) || a.sortOrder - b.sortOrder;
    })[0];
  }

  function selectAttribute(groupKey: string, value: string) {
    const best = bestVariantForAttribute(groupKey, value);
    if (best) selectVariant(best);
  }

  return (
    <section className="product-detail-page container">
      <nav className="product-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span>/</span><Link to={displayBrand.name ? `/marketplace?brand=${encodeURIComponent(displayBrand.name)}` : "/marketplace"}>{displayBrand.name || "Marketplace"}</Link><span>/</span><span aria-current="page">{product.name}</span>
      </nav>
      <Link className="product-back-link" to={displayBrand.name ? `/marketplace?brand=${encodeURIComponent(displayBrand.name)}` : "/marketplace"}><ArrowLeft size={16} /> Back to {displayBrand.name ? `${displayBrand.name} products` : "all materials"}</Link>

      <ProductDetailSurface
        title={product.name}
        brand={displayBrand.name}
        brandTagline={partnerBrand?.tagline || product.brandTagline}
        category={productCategoryLabel}
        code={selectedVariant?.code || product.code}
        grade={product.grade}
        brandMark={<PartnerBrandLogo brand={displayBrand} className="mini shared-product-brand-logo" />}
        images={gallery}
        selectedImage={activeImage}
        onImageSelect={setSelectedImage}
        price={price}
        compareAtPrice={compareAtPrice}
        unit={unit}
        offerLabel={selectedVariant?.offerLabel || product.offerLabel || (discountPercent > 0 ? `${discountPercent}% OFF` : null)}
        priceNote={priceDisclosure}
        availability={availability}
        stockQuantity={selectedVariant?.stockQuantity}
        minimumOrder={minimumOrder}
        choiceGroups={detailChoiceGroups}
        selectionLabel={selectedVariant?.label || selectedLabel}
        quantity={quantity}
        onQuantityChange={(value) => { setQuantity(value); setAdded(false); }}
        specification={specification}
        specificationRequired={Boolean(product.specs?.sizes)}
        onSpecificationChange={(value) => { setSpecification(value); setAdded(false); }}
        description={description}
        faqEntries={faqEntries}
        returnPolicy={returnPolicy.published ? returnPolicy : null}
        highlights={technicalSpecs.map(([key, value]) => [key, String(value)])}
        features={customerCardFeatures(product.features)}
        applications={product.applications}
        quantityBreaks={quantityBreaks}
        actionLabel={availability === "OUT_OF_STOCK" ? "Out of stock" : inList ? "Update cart" : "Add to cart"}
        actionDisabled={!canEdit || !ready || availability === "OUT_OF_STOCK"}
        onSubmit={addSelection}
        afterAction={error ? <p role="alert" className="shared-product-detail-feedback">{error}</p> : added ? <p role="status" className="shared-product-detail-feedback">Added to your cart. <Link to="/material-list">Review cart <ArrowRight size={14} /></Link></p> : null}
      />

      <section className="product-detail-support" aria-label="Product support">
        <div className="product-detail-assurance">
          <div><Truck size={17} /><span><strong>Delivery</strong>Confirm timing and site availability with the team.</span></div>
          <div><Info size={17} /><span><strong>Product information</strong>Confirm exact specifications and documents before ordering.</span></div>
        </div>
      </section>

      {(relatedProducts.length > 0 || relatedVariants.length > 0) && <section className="product-page-related" aria-label="Similar products">
        <ProductRecommendationCarousel
          eyebrow="Continue browsing"
          title={`Similar ${productCategoryLabel.toLowerCase()} products`}
          browseHref={`/marketplace?category=${encodeURIComponent(productCategoryId)}`}
          browseLabel="View all"
          products={relatedProducts}
          variantProduct={relatedVariants.length ? product : undefined}
          variants={relatedVariants}
          partnerBrands={partnerBrands}
          ariaLabel="Similar products carousel"
        />
      </section>}
      {complementaryProducts.length > 0 && <section className="product-page-related product-project-related" aria-label="Products to complete your project">
        <ProductRecommendationCarousel
          eyebrow="Plan the next step"
          title="Complete your project"
          browseHref="/marketplace"
          browseLabel="Browse all materials"
          products={complementaryProducts}
          partnerBrands={partnerBrands}
          description="Useful materials from other catalogue categories. Add only what your project needs; pricing and availability are confirmed with the team."
          ariaLabel="Other category products carousel"
          showCategory
        />
      </section>}
      {additionalCategorySections.map(({ category, products: categoryProducts }) => {
        const categoryLabel = catalogueCategoryLabel(categoryProducts[0].categoryLabel || categoryProducts[0].category);
        return <section className="product-page-related" aria-label={`${categoryLabel} products`} key={category}>
          <ProductRecommendationCarousel
            eyebrow="Explore more materials"
            title={`${categoryLabel} products`}
            browseHref={`/marketplace?category=${encodeURIComponent(category)}`}
            browseLabel="View all"
            products={categoryProducts}
            partnerBrands={partnerBrands}
            ariaLabel={`${categoryLabel} products carousel`}
          />
        </section>;
      })}
    </section>
  );
}
