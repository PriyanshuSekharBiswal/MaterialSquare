import React, { createContext, useCallback, useContext, useState } from "react";
import type { MaterialItem } from "./types";

const listStorageKey = "material-square-bom";

function readList(): MaterialItem[] {
  try {
    const items = JSON.parse(localStorage.getItem(listStorageKey) || "[]");
    if (!Array.isArray(items)) return [];
    return items
      .filter(
        (item) =>
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.brand === "string" &&
          typeof item.unit === "string",
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}

type QuoteListState = {
  customer: null;
  items: MaterialItem[];
  ready: true;
  canEdit: true;
  saving: false;
  unsaved: false;
  error: string;
  updateItems: (
    update: MaterialItem[] | ((old: MaterialItem[]) => MaterialItem[]),
  ) => boolean;
};

const Context = createContext<QuoteListState | null>(null);

/** Guest-only quote list. Account storage and authentication are not used. */
export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<MaterialItem[]>(readList);
  const updateItems = useCallback<QuoteListState["updateItems"]>(
    (update) => {
      const next = typeof update === "function" ? update(items) : update;
      if (next.length > 100) return false;
      setItems(next);
      try {
        localStorage.setItem(listStorageKey, JSON.stringify(next));
      } catch {
        return false;
      }
      return true;
    },
    [items],
  );
  const state: QuoteListState = {
    customer: null,
    items,
    ready: true,
    canEdit: true,
    saving: false,
    unsaved: false,
    error: "",
    updateItems,
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useCustomer() {
  const state = useContext(Context);
  if (!state) throw new Error("CustomerProvider missing");
  return state;
}
