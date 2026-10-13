type EditableControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const dirtyForms = new Set<HTMLFormElement>();
const formBaselines = new WeakMap<HTMLFormElement, string>();
let pendingActions = 0;

function getForm(target: EventTarget | null) {
  return target instanceof Element ? target.closest("form") : null;
}

function shouldTrack(form: HTMLFormElement) {
  if (form.dataset.skipUnsavedWarning === "true") return false;
  const marker = `${form.id} ${form.className}`.toLowerCase();
  return !/(filter|search|login)/.test(marker);
}

function registerActiveEditors(root: ParentNode) {
  const forms = [
    ...(root instanceof HTMLFormElement ? [root] : []),
    ...root.querySelectorAll<HTMLFormElement>("form"),
  ];
  for (const form of forms) {
    if (!shouldTrack(form)) continue;
    const signature = formSignature(form);
    const baseline = formBaselines.get(form);
    if (baseline === undefined) formBaselines.set(form, signature);
    if (form.matches("[data-admin-unsaved-form]") || (baseline !== undefined && baseline !== signature))
      dirtyForms.add(form);
    else dirtyForms.delete(form);
  }
}

function formSignature(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll<EditableControl>("input, select, textarea"))
    .map((control) => {
      if (control instanceof HTMLInputElement) {
        if (control.type === "file") {
          return `${control.type}:${Array.from(control.files || []).map((file) => `${file.name}:${file.size}`).join(",")}`;
        }
        if (control.type === "checkbox" || control.type === "radio") {
          return `${control.type}:${control.name}:${control.value}:${control.checked}`;
        }
      }
      if (control instanceof HTMLSelectElement) {
        return `select:${control.name}:${Array.from(control.selectedOptions).map((option) => option.value).join(",")}`;
      }
      return `${control.tagName}:${control.getAttribute("name") || ""}:${control.value}`;
    })
    .join("\u001f");
}

function trackInput(event: Event) {
  const form = getForm(event.target);
  if (!form || !shouldTrack(form)) return;

  const baseline = formBaselines.get(form) ?? formSignature(form);
  formBaselines.set(form, baseline);
  if (formSignature(form) === baseline) dirtyForms.delete(form);
  else dirtyForms.add(form);
}

/** Warn before a hard refresh/close if a form has unsaved edits or an admin action is still running. */
export function installUnsavedChangesGuard() {
  if (typeof window === "undefined") return;

  registerActiveEditors(document);
  const editorObserver = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) registerActiveEditors(node);
      }
    }
    for (const form of dirtyForms) {
      if (!form.isConnected) dirtyForms.delete(form);
    }
  });
  editorObserver.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("focusin", (event) => {
    const form = getForm(event.target);
    if (form && shouldTrack(form) && !formBaselines.has(form)) {
      formBaselines.set(form, formSignature(form));
    }
  }, true);
  document.addEventListener("input", trackInput, true);
  document.addEventListener("change", trackInput, true);
  document.addEventListener("reset", (event) => {
    const form = getForm(event.target);
    if (!form) return;
    window.setTimeout(() => {
      formBaselines.set(form, formSignature(form));
      dirtyForms.delete(form);
    }, 0);
  }, true);
  document.addEventListener("click", (event) => {
    const form = getForm(event.target);
    if (!form || !shouldTrack(form)) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button,[role='button']")) {
      if (!formBaselines.has(form)) formBaselines.set(form, formSignature(form));
      dirtyForms.add(form);
    }
  }, true);

  window.addEventListener("beforeunload", (event) => {
    for (const form of dirtyForms) {
      if (!form.isConnected) dirtyForms.delete(form);
    }
    const activeEditor = document.querySelector("form[data-admin-unsaved-form]");
    if (pendingActions === 0 && dirtyForms.size === 0 && !activeEditor) return;
    event.preventDefault();
    // A non-empty legacy returnValue maximizes compatibility; browsers replace
    // it with their own standard confirmation copy.
    event.returnValue = "Unsaved changes may be lost.";
  });
}

/** Track mutations so refreshes during an upload/save/delete show the browser confirmation. */
export async function runAdminAction<T>(form: HTMLFormElement | null, action: () => Promise<T>, succeeded: (result: T) => boolean) {
  const signatureAtStart = form ? formSignature(form) : null;
  pendingActions += 1;
  try {
    const result = await action();
    if (form && signatureAtStart !== null && succeeded(result) && form.isConnected && formSignature(form) === signatureAtStart) {
      dirtyForms.delete(form);
      formBaselines.set(form, signatureAtStart);
    }
    return result;
  } finally {
    pendingActions = Math.max(0, pendingActions - 1);
  }
}
