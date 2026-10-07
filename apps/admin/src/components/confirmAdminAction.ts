export type AdminConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
};

export function confirmAdminAction({
  title,
  message,
  confirmLabel = "Confirm",
  tone = "default",
}: AdminConfirmationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "admin-confirm-dialog";
    dialog.setAttribute("aria-labelledby", "admin-confirm-title");
    dialog.setAttribute("aria-describedby", "admin-confirm-message");

    const content = document.createElement("div");
    content.className = "admin-confirm-content";
    const icon = document.createElement("span");
    icon.className = `admin-confirm-icon${tone === "danger" ? " is-danger" : ""}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = tone === "danger" ? "!" : "✓";

    const copy = document.createElement("div");
    copy.className = "admin-confirm-copy";
    const heading = document.createElement("h2");
    heading.id = "admin-confirm-title";
    heading.textContent = title;
    const description = document.createElement("p");
    description.id = "admin-confirm-message";
    description.textContent = message;
    copy.append(heading, description);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "admin-confirm-close";
    close.setAttribute("aria-label", "Cancel and close");
    close.textContent = "×";
    close.addEventListener("click", () => dialog.close("cancel"));
    content.append(icon, copy, close);

    const actions = document.createElement("div");
    actions.className = "admin-confirm-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "admin-confirm-cancel";
    cancel.textContent = "Cancel";
    cancel.autofocus = true;
    cancel.addEventListener("click", () => dialog.close("cancel"));
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = `admin-confirm-submit${tone === "danger" ? " is-danger" : ""}`;
    confirm.textContent = confirmLabel;
    confirm.addEventListener("click", () => dialog.close("confirm"));
    actions.append(cancel, confirm);
    dialog.append(content, actions);

    dialog.addEventListener("close", () => {
      const accepted = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(accepted);
    }, { once: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}
