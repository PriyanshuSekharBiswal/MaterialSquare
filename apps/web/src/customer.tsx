import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { customerApi, ApiError } from "./api";
import type { MaterialItem } from "./types";
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  shippingAddress: string | null;
  city: string;
  pincode: string;
  materialList: MaterialItem[];
  listVersion: number;
}
const guestKey = "material-square-bom";
export function compactList(items: MaterialItem[]) {
  return items.map((i) => ({
    id: i.id,
    catalogueId: i.catalogueId,
    name: i.name,
    brand: i.brand,
    unit: i.unit || "Pieces",
    code: i.code,
    quantity: i.quantity || 1,
    specification: i.specification || "",
    variantId: i.variantId,
    price: i.price == null || !Number.isFinite(Number(i.price)) ? undefined : Number(i.price),
    compareAtPrice: i.compareAtPrice == null || !Number.isFinite(Number(i.compareAtPrice)) ? undefined : Number(i.compareAtPrice),
    priceNote: i.priceNote,
  }));
}
function readGuest(): MaterialItem[] {
  try {
    const data = JSON.parse(localStorage.getItem(guestKey) || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (i) =>
              typeof i.id === "string" &&
              typeof i.name === "string" &&
              typeof i.brand === "string" &&
              typeof i.unit === "string",
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
function useCustomerState() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<MaterialItem[]>(readGuest);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const version = useRef(0),
    epoch = useRef(0),
    itemsRef = useRef(items);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<MaterialItem[] | null>(null),
    running = useRef(false),
    blocked = useRef(false);
  const load = async (mergeGuest = false) => {
    if (running.current) return;
    if (debounce.current) clearTimeout(debounce.current);
    setSaving(false);
    setReady(false);
    setError("");
    blocked.current = true;
    const generation = ++epoch.current;
    try {
      const data = await customerApi<Customer>("/customer/me");
      if (generation !== epoch.current) return;
      version.current = data.listVersion;
      setCustomer(data);
      let list = compactList(data.materialList);
      if (mergeGuest) {
        const guest = readGuest();
        list = compactList([
          ...list,
          ...guest.filter((i) => !list.some((j) => j.id === i.id)),
        ]).slice(0, 100);
        if (
          JSON.stringify(list) !==
          JSON.stringify(compactList(data.materialList))
        ) {
          const result = await customerApi<{ version: number }>(
            "/customer/materials",
            "PUT",
            { version: version.current, items: list },
            data.id,
          );
          version.current = result.version;
        }
      }
      itemsRef.current = list;
      setItems(list);
      pending.current = null;
      setUnsaved(false);
      blocked.current = false;
      try {
        localStorage.removeItem(guestKey);
      } catch {}
    } catch (e) {
      if (generation !== epoch.current) return;
      if (e instanceof ApiError && e.status === 401) {
        setCustomer(null);
        const list = readGuest();
        itemsRef.current = list;
        setItems(list);
        blocked.current = false;
      } else {
        if (!customer) blocked.current = false;
        // A failed account check must not interrupt anonymous browsing. A
        // signed-in customer gets a brief, task-focused notice instead of an
        // infrastructure status message.
        setError(
          customer
            ? "Your saved list couldn't be refreshed. Please try again before continuing."
            : "",
        );
      }
    } finally {
      if (generation === epoch.current) setReady(true);
    }
  };
  useEffect(() => {
    void load();
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (customer && (saving || unsaved)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [customer, saving, unsaved]);
  const flush = async () => {
    if (running.current || blocked.current || !customer) return;
    running.current = true;
    setSaving(true);
    const generation = epoch.current;
    try {
      while (pending.current && generation === epoch.current) {
        const snapshot = pending.current;
        pending.current = null;
        const result = await customerApi<{ version: number }>(
          "/customer/materials",
          "PUT",
          { version: version.current, items: compactList(snapshot) },
          customer.id,
        );
        if (generation === epoch.current) version.current = result.version;
      }
      if (generation === epoch.current) {
        setError("");
        setUnsaved(false);
      }
    } catch (e) {
      blocked.current = true;
      setError("Your changes couldn't be saved. Check your connection and try again.");
    } finally {
      running.current = false;
      setSaving(false);
    }
  };
  // Refresh server changes when returning to the tab and while the list is idle.
  useEffect(() => {
    if (!customer || saving || unsaved) return;
    let disposed = false;
    let checking = false;
    const refresh = async () => {
      if (
        disposed ||
        checking ||
        document.hidden ||
        running.current ||
        pending.current ||
        blocked.current
      )
        return;
      checking = true;
      const generation = epoch.current;
      try {
        const data = await customerApi<Customer>("/customer/me");
        if (
          disposed ||
          generation !== epoch.current ||
          pending.current ||
          running.current ||
          blocked.current
        )
          return;
        if (data.id !== customer.id || data.listVersion !== version.current) {
          version.current = data.listVersion;
          const next = compactList(data.materialList);
          itemsRef.current = next;
          setItems(next);
        }
        setCustomer(data);
      } catch {
        /* A later foreground request handles authentication errors. */
      } finally {
        checking = false;
      }
    };
    const timer = setInterval(() => void refresh(), 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [customer?.id, saving, unsaved]);
  const updateItems = (
    update: MaterialItem[] | ((old: MaterialItem[]) => MaterialItem[]),
  ) => {
    if (!ready || blocked.current) return false;
    const next =
      typeof update === "function" ? update(itemsRef.current) : update;
    if (next.length > 100) {
      setError("Please keep your list to 100 materials.");
      return false;
    }
    itemsRef.current = next;
    setItems(next);
    if (customer) {
      setUnsaved(true);
      pending.current = next;
      setSaving(true);
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void flush(), 400);
    } else
      try {
        localStorage.setItem(guestKey, JSON.stringify(compactList(next)));
      } catch {
        setError(
          "This browser cannot save your list. Sign in to save it to your account.",
        );
      }
    return true;
  };
  const logout = async () => {
    if (running.current || pending.current)
      throw new Error("Please wait for your material list to finish saving.");
    await customerApi("/customer/logout", "POST", {}, customer?.id);
    epoch.current++;
    pending.current = null;
    blocked.current = false;
    setCustomer(null);
    itemsRef.current = [];
    setItems([]);
    setError("");
    try {
      localStorage.removeItem(guestKey);
    } catch {}
  };
  const saveProfile = async (data: unknown) => {
    const result = await customerApi<Customer>(
      "/customer/profile",
      "PUT",
      data,
      customer?.id,
    );
    setCustomer(result);
  };
  return {
    customer,
    items,
    updateItems,
    ready,
    canEdit: ready && !blocked.current,
    error,
    saving,
    unsaved,
    load,
    logout,
    saveProfile,
  };
}
const Context = createContext<ReturnType<typeof useCustomerState> | null>(null);
export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const state = useCustomerState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useCustomer() {
  const state = useContext(Context);
  if (!state) throw new Error("CustomerProvider missing");
  return state;
}
