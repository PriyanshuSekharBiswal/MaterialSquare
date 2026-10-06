import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import type { WorkspaceTab } from "../features/customers/contracts";

type Destination = {
  id: WorkspaceTab;
  label: string;
  keywords: string;
  detail: string;
  icon: typeof Search;
  acceptsQuery?: boolean;
};

const destinations: Destination[] = [
  {
    id: "overview",
    label: "Overview",
    keywords: "dashboard home summary",
    detail: "Workspace summary",
    icon: LayoutDashboard,
  },
  {
    id: "recent",
    label: "Recent activity",
    keywords: "recent changes updated edited uploaded published history",
    detail: "Changes from the last 7 days",
    icon: Clock3,
  },
  {
    id: "customers",
    label: "Customers",
    keywords: "customer client buyer contact name mobile phone email",
    detail: "Find a customer by name or mobile",
    icon: Users,
    acceptsQuery: true,
  },
  {
    id: "followups",
    label: "Follow-ups",
    keywords: "follow up enquiry inquiry callback reminder pending",
    detail: "Find an enquiry or follow-up",
    icon: ClipboardList,
    acceptsQuery: true,
  },
  {
    id: "sales",
    label: "Quotations & orders",
    keywords:
      "quotation quote rfq order invoice dispatch payment delivery sales",
    detail: "Quotations, requests and orders",
    icon: FileText,
  },
  {
    id: "business",
    label: "Business management",
    keywords:
      "supplier procurement transport discount loyalty commission experts services",
    detail: "Suppliers, delivery and business tools",
    icon: Tags,
  },
  {
    id: "reports",
    label: "Operational reports",
    keywords: "report analytics performance sales procurement delivery",
    detail: "Business and website reporting",
    icon: BarChart3,
  },
  {
    id: "catalogue",
    label: "Products, prices & offers",
    keywords:
      "product material catalogue catalog brand price offer discount stock availability cement paint wire image photo ultratech ambuja shree astral supreme finolex zoloto polycab havells asian birla jaquar cera tata myk ppc fr lsh sdr",
    detail: "Find products by name, brand or code",
    icon: Tags,
    acceptsQuery: true,
  },
  {
    id: "content",
    label: "Website pages & content",
    keywords:
      "website page homepage banner logo phone whatsapp storefront copy blog article",
    detail: "Edit website pages and storefront content",
    icon: FileText,
  },
  {
    id: "team",
    label: "Staff & Roles",
    keywords: "staff team role access permission user administrator",
    detail: "Manage staff and access",
    icon: ShieldCheck,
  },
  {
    id: "audit",
    label: "Audit log",
    keywords: "audit log history who changed action record",
    detail: "Review recorded workspace changes",
    icon: FileText,
  },
  {
    id: "notifications",
    label: "Notifications",
    keywords: "notification message email sms whatsapp queued delivery failed",
    detail: "Check message and alert status",
    icon: FileText,
  },
];

const permitted = (id: WorkspaceTab, role: string) => {
  if (id === "audit" || id === "notifications")
    return role === "SUPER_ADMIN" || role === "ADMIN";
  if (id === "overview" || id === "recent") return true;
  if (id === "sales" || id === "reports")
    return [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "PROCUREMENT_HEAD",
      "DISPATCH_OFFICER",
      "ACCOUNTS_MANAGER",
    ].includes(role);
  if (id === "business") return Boolean(role);
  if (id === "customers" || id === "followups")
    return ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(role);
  if (id === "catalogue")
    return [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "CATALOG_MANAGER",
    ].includes(role);
  if (id === "content")
    return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role);
  if (id === "team") return role === "SUPER_ADMIN";
  return false;
};

type Suggestion = Destination & {
  title: string;
  description: string;
  query?: string;
};

export default function GlobalAdminSearch({
  role,
  onSelect,
}: {
  role: string;
  onSelect: (tab: WorkspaceTab, query?: string) => void;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = value.trim().toLocaleLowerCase();
  const allowed = useMemo(
    () => destinations.filter((item) => permitted(item.id, role)),
    [role],
  );
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!normalized)
      return allowed
        .filter((item) =>
          ["catalogue", "customers", "sales", "content", "recent"].includes(
            item.id,
          ),
        )
        .map((item) => ({
          ...item,
          title: item.label,
          description: item.detail,
        }));

    const ranked = allowed
      .map((item) => {
        const label = item.label.toLocaleLowerCase();
        const keywords = item.keywords.toLocaleLowerCase().split(/\s+/);
        const queryTerms = normalized.split(/\s+/);
        const matchingTerms = queryTerms.filter(
          (term) =>
            term.length > 1 &&
            keywords.some(
              (word) => word.startsWith(term) || term.startsWith(word),
            ),
        );
        const score =
          label === normalized
            ? 5
            : label.startsWith(normalized)
              ? 4
              : label.includes(normalized)
                ? 3
                : matchingTerms.length
                  ? 2 + matchingTerms.length / queryTerms.length
                  : item.keywords.toLocaleLowerCase().includes(normalized)
                    ? 1
                    : 0;
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => ({
        ...item,
        title: item.acceptsQuery
          ? `Search ${item.id === "catalogue" ? "products" : item.id} for “${value.trim()}”`
          : item.label,
        description: item.acceptsQuery ? item.detail : item.detail,
        query: item.acceptsQuery ? value.trim() : undefined,
      }));

    const queryDestinations = ranked.length
      ? []
      : allowed
          .filter((item) => item.acceptsQuery)
          .slice(0, 3)
          .map((item) => ({
            ...item,
            title: `Search ${item.id === "catalogue" ? "products" : item.id} for “${value.trim()}”`,
            description: item.detail,
            query: value.trim(),
          }));
    return [...ranked, ...queryDestinations].slice(0, 6);
  }, [allowed, normalized, value]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLocaleLowerCase() === "k"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (open && !rootRef.current?.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onShortcut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onShortcut);
    };
  }, [open]);

  const choose = (suggestion: Suggestion) => {
    onSelect(suggestion.id, suggestion.query);
    setValue("");
    setOpen(false);
    setActive(0);
  };

  return (
    <div className="admin-global-search" ref={rootRef}>
      <label className="admin-global-search-field">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search the admin workspace"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="admin-search-suggestions"
          aria-activedescendant={
            open && suggestions.length
              ? `admin-search-option-${active}`
              : undefined
          }
          placeholder="Search products, customers, pages…"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setValue(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length) {
              event.preventDefault();
              setActive((index) => (index + 1) % suggestions.length);
            } else if (event.key === "ArrowUp" && suggestions.length) {
              event.preventDefault();
              setActive(
                (index) =>
                  (index - 1 + suggestions.length) % suggestions.length,
              );
            } else if (event.key === "Enter" && open && suggestions.length) {
              event.preventDefault();
              choose(suggestions[active]);
            } else if (event.key === "Escape") setOpen(false);
          }}
        />
        <kbd aria-hidden="true">⌘ K</kbd>
      </label>
      {open && (
        <div
          className="admin-search-popover"
          id="admin-search-suggestions"
          role="listbox"
          aria-label="Admin search suggestions"
        >
          <div className="admin-search-popover-heading">
            {normalized ? "SUGGESTED DESTINATIONS" : "QUICK ACCESS"}
          </div>
          {suggestions.length ? (
            suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={active === index}
                  id={`admin-search-option-${index}`}
                  className={`admin-search-option ${active === index ? "active" : ""}`}
                  key={`${suggestion.id}-${suggestion.title}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(suggestion)}
                >
                  <span className="admin-search-option-icon">
                    <Icon size={17} />
                  </span>
                  <span className="admin-search-option-copy">
                    <strong>{suggestion.title}</strong>
                    <small>{suggestion.description}</small>
                  </span>
                  <ArrowRight size={15} className="admin-search-option-arrow" />
                </button>
              );
            })
          ) : (
            <div className="admin-search-empty">
              <Search size={17} />
              <span>
                No matching section. Try a product, customer, quote or page.
              </span>
            </div>
          )}
          <div className="admin-search-footer">
            <span>
              <ArrowDown size={13} /> Navigate
            </span>
            <span>Enter to open</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
