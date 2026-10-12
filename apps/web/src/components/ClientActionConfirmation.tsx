import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";

export type ClientActionConfirmationDetails = {
  title: string;
  message: string;
  actionLabel?: string;
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
  useEffect(() => {
    if (!confirmation) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmation, onClose]);

  if (!confirmation) return null;
  const actionLabel = confirmation.actionLabel || "Got it";

  return createPortal((
    <div className="client-confirmation-backdrop" onMouseDown={onClose}>
      <section
        className="client-confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-confirmation-title"
        aria-describedby="client-confirmation-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="client-confirmation-close" type="button" aria-label="Close confirmation" onClick={onClose}>
          <X size={19} aria-hidden="true" />
        </button>
        <CheckCircle2 className="client-confirmation-icon" size={42} aria-hidden="true" />
        <h2 id="client-confirmation-title">{confirmation.title}</h2>
        <p id="client-confirmation-message">{confirmation.message}</p>
        {confirmation.actionHref ? (
          <a
            className="btn btn-primary client-confirmation-action"
            href={confirmation.actionHref}
            target={confirmation.actionTarget}
            rel={confirmation.actionTarget === "_blank" ? "noopener noreferrer" : undefined}
            onClick={onClose}
          >
            {actionLabel}
          </a>
        ) : (
          <button
            className="btn btn-primary client-confirmation-action"
            type="button"
            onClick={() => {
              onClose();
              confirmation.onAction?.();
            }}
          >
            {actionLabel}
          </button>
        )}
      </section>
    </div>
  ), document.body);
}
