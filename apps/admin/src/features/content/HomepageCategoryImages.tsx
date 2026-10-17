import { useEffect, useMemo, useState } from "react";
import ContentImageField from "../../components/ContentImageField";
import { resolveCatalogueCategoryId, STOREFRONT_CATEGORIES, type ManagedCatalogueCategory, type SiteContent } from "@material-square/types";

type ProductCategory = {
  category: string;
  categoryLabel: string;
  products: string[];
};
type CatalogueProduct = {
  category: string;
  categoryLabel: string;
  name: string;
  isPublished: boolean;
};
function parseImages(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

export default function HomepageCategoryImages({
  token,
  content,
  customerUrl,
  onChange,
  onBusyChange,
  onSignOut,
}: {
  token: string;
  content: SiteContent;
  customerUrl: string;
  onChange: (images: Record<string, string>) => void;
  onBusyChange: (busy: boolean) => void;
  onSignOut: () => void;
}) {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [managedCategories, setManagedCategories] = useState<ManagedCatalogueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const images = useMemo(() => parseImages(content["home.categoryImages"]), [content]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const fetchProducts = fetch(`${import.meta.env.VITE_API_URL || "/api"}/products/catalogue`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(async (response) => {
        const result = await response.json().catch(() => null);
        if (response.status === 401) onSignOut();
        if (!response.ok || !Array.isArray(result)) {
          throw new Error("Could not load catalogue categories.");
        }
        return result.filter((product): product is CatalogueProduct =>
          product && typeof product.category === "string" && typeof product.categoryLabel === "string" && typeof product.name === "string"
        );
      });
    const fetchCategories = fetch(`${import.meta.env.VITE_API_URL || "/api"}/products/catalogue/categories`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(async (response) => {
      const result = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok || !Array.isArray(result)) throw new Error("Could not load managed categories.");
      return result as ManagedCatalogueCategory[];
    });
    void Promise.all([fetchProducts, fetchCategories])
      .then(([productList, categoryList]) => {
        setProducts(productList);
        setManagedCategories(categoryList);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load catalogue categories.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, onSignOut]);

  const categories = useMemo(() => {
    const groups = new Map<string, ProductCategory>(managedCategories.filter((category) => category.active).map((category) => [category.id, {
      category: category.id,
      categoryLabel: category.label,
      products: [],
    }]));
    products.filter((product) => product.isPublished).forEach((product) => {
      const id = resolveCatalogueCategoryId(product.categoryLabel || product.category, managedCategories);
      const group = groups.get(id);
      if (!group) return;
      if (!group.products.includes(product.name)) group.products.push(product.name);
    });
    return [...groups.values()].sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));
  }, [managedCategories, products]);

  const legacyImage = (category: string) =>
    category === "steel" ? content["home.categoryImage.steel"] :
      category === "adhesives" ? content["home.categoryImage.adhesives"] : "";
  const builtInImage = (category: ProductCategory) =>
    STOREFRONT_CATEGORIES.find(({ id }) => id === category.category)?.image || "";

  const setImage = (category: string, url: string) => {
    const next = { ...images, [category]: url };
    onChange(next);
  };

  return (
    <section className="panel-card panel-body homepage-category-images">
      <h2>Homepage category card images</h2>
      <p>Choose an image for each category shown in “Browse materials from the current catalogue.” Categories can come from partner brands even before products are listed.</p>
      {loading ? <p role="status">Loading categories from brands and catalogue…</p> : null}
      {error ? <p role="alert" className="bc-error">{error}</p> : null}
      {!loading && !error && categories.length === 0 ? <p>No categories are available yet. Add a category to a partner brand to manage its card here.</p> : null}
      <div className="homepage-category-image-list">
        {categories.map((category) => {
          const image = Object.prototype.hasOwnProperty.call(images, category.category)
            ? images[category.category]
            : legacyImage(category.category) || builtInImage(category);
          return (
            <article className="homepage-category-image-item" key={category.category}>
              <div className="homepage-category-image-heading">
                <div>
                  <h3>{category.categoryLabel}</h3>
                  <p>{category.products.length} published {category.products.length === 1 ? "product" : "products"}</p>
                </div>
                <details>
                  <summary>View products</summary>
                  <ul>{category.products.map((name) => <li key={name}>{name}</li>)}</ul>
                </details>
              </div>
              <ContentImageField
                token={token}
                customerUrl={customerUrl}
                value={image}
                label={`${category.categoryLabel} card image`}
                recommendedSize="800 × 600 px (4:3)"
                onChange={(url) => setImage(category.category, url)}
                onBusyChange={onBusyChange}
                onSignOut={onSignOut}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
