import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export type ClientActionConfirmationDetails = {
  title: string;
  message: string;
  cancelLabel?: string;
  actionLabel?: string;
  actionTone?: "default" | "danger";
  actionHref?: string;
  actionTarget?: "_blank";
  onAction?: () => void;
};

export default function ClientActionConfirmation({
  confirmation,
  onClose,
}: {
  confirmation: ClientActionConfirmationDetails | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!confirmation) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>(".client-confirmation-close")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [confirmation]);

  if (!confirmation) return null;
  const actionLabel = confirmation.actionLabel || "Got it";

  return createPortal((
  <div className="client-confirmation-backdrop" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="client-confirmation-dialog"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="client-confirmation-title"
        aria-describedby="client-confirmation-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="client-confirmation-close" type="button" aria-label="Close confirmation" onClick={onClose}>
          <X size={19} aria-hidden="true" />
        </button>
        {confirmation.actionTone === "danger" ? (
          <AlertTriangle className="client-confirmation-icon client-confirmation-icon--danger" size={42} aria-hidden="true" />
        ) : (
          <CheckCircle2 className="client-confirmation-icon" size={42} aria-hidden="true" />
        )}
        <h2 id="client-confirmation-title">{confirmation.title}</h2>
        <p id="client-confirmation-message">{confirmation.message}</p>
        <div className="client-confirmation-actions">
          {confirmation.cancelLabel && (
            <button className="client-confirmation-cancel" type="button" onClick={onClose}>
              {confirmation.cancelLabel}
            </button>
          )}
          {confirmation.actionHref ? (
            <a
              className={`btn btn-primary client-confirmation-action${confirmation.actionTone === "danger" ? " client-confirmation-action--danger" : ""}`}
              href={confirmation.actionHref}
              target={confirmation.actionTarget}
              rel={confirmation.actionTarget === "_blank" ? "noopener noreferrer" : undefined}
              onClick={onClose}
            >
              {actionLabel}
            </a>
          ) : (
            <button
              className={`btn btn-primary client-confirmation-action${confirmation.actionTone === "danger" ? " client-confirmation-action--danger" : ""}`}
              type="button"
              onClick={() => {
                onClose();
                confirmation.onAction?.();
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </section>
    </div>
  ), document.body);
}
