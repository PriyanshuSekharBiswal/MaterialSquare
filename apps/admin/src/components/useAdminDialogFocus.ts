import { useEffect } from "react";

const DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"], dialog[open]';
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let lastInteractionTarget: HTMLElement | null = null;

export function getAdminDialogOpener() {
  return lastInteractionTarget;
}

function isVisible(element: HTMLElement) {
  return element.isConnected && element.getClientRects().length > 0;
}

function focusInitial(dialog: HTMLElement) {
  const target =
    dialog.querySelector<HTMLElement>("[autofocus]") ??
    dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  if (target) {
    target.focus({ preventScroll: true });
    return;
  }
  if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
  dialog.focus({ preventScroll: true });
}

export function useAdminDialogFocus() {
  useEffect(() => {
    let activeDialog: HTMLElement | null = null;
    let lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lastInteractionTarget = lastFocused;
    const knownDialogs = new Set<HTMLElement>();
    const returnTargets = new WeakMap<HTMLElement, HTMLElement | null>();

    const getVisibleDialogs = () =>
      Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)).filter(isVisible);

    const syncDialog = () => {
      const visible = getVisibleDialogs();
      for (const dialog of visible) {
        if (knownDialogs.has(dialog)) continue;
        knownDialogs.add(dialog);
        returnTargets.set(dialog, lastFocused);
      }

      const nextDialog = visible[visible.length - 1] ?? null;
      const previousDialog = activeDialog;
      if (nextDialog !== previousDialog) {
        activeDialog = nextDialog;
        if (nextDialog) {
          const restore = previousDialog && !visible.includes(previousDialog)
            ? returnTargets.get(previousDialog)
            : null;
          if (restore && nextDialog.contains(restore)) restore.focus({ preventScroll: true });
          else if (!nextDialog.contains(document.activeElement)) focusInitial(nextDialog);
        } else if (previousDialog) {
          const restore = returnTargets.get(previousDialog);
          if (restore?.isConnected) restore.focus({ preventScroll: true });
        }
      }

      for (const dialog of knownDialogs) {
        if (!visible.includes(dialog)) knownDialogs.delete(dialog);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !activeDialog) return;
      const focusable = Array.from(activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
      if (!focusable.length) {
        event.preventDefault();
        focusInitial(activeDialog);
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !activeDialog.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !activeDialog.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      const topDialog = getVisibleDialogs().at(-1) ?? null;
      if (topDialog && topDialog !== activeDialog && target instanceof Node && topDialog.contains(target)) {
        return;
      }
      if (activeDialog && target instanceof Node && !activeDialog.contains(target)) {
        focusInitial(activeDialog);
        return;
      }
      if (target instanceof HTMLElement) {
        lastFocused = target;
        lastInteractionTarget = target;
      }
    };

    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>(FOCUSABLE_SELECTOR)
        : null;
      const topDialog = getVisibleDialogs().at(-1) ?? null;
      if (
        target &&
        (!activeDialog || activeDialog.contains(target) || topDialog?.contains(target))
      ) {
        lastFocused = target;
        lastInteractionTarget = target;
      }
    };

    const observer = new MutationObserver(syncDialog);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "class", "hidden", "style"],
    });
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onPointerDown, true);
    syncDialog();

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onPointerDown, true);
    };
  }, []);
}
