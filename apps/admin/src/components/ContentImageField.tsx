import { useState } from "react";

export default function ContentImageField({
  token,
  initialUrl = "",
  value,
  onChange,
  label,
  onSignOut,
  onBusyChange,
}: {
  token: string;
  initialUrl?: string;
  value?: string;
  onChange?: (url: string) => void;
  label: string;
  onSignOut: () => void;
  onBusyChange: (value: boolean) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currentUrl = value ?? url;
  const updateUrl = (next: string) => {
    setUrl(next);
    onChange?.(next);
  };
  return (
    <div className="bc-wide">
      <label>
        {label}
        <input
          name="image"
          type="url"
          value={currentUrl}
          onChange={(event) => updateUrl(event.target.value)}
        />
      </label>
      <label>
        Upload {label.toLowerCase()}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            if (
              !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
              file.size > 5 * 1024 * 1024
            ) {
              setError("Choose a PNG, JPEG or WebP image up to 5 MB.");
              input.value = "";
              return;
            }
            setBusy(true);
            onBusyChange(true);
            setError("");
            try {
              const body = new FormData();
              body.append("file", file);
              const response = await fetch(
                `${import.meta.env.VITE_API_URL || "/api"}/storage/images`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                  body,
                  signal: AbortSignal.timeout(65000),
                },
              );
              const result = await response.json().catch(() => null);
              if (response.status === 401) onSignOut();
              if (!response.ok || typeof result?.url !== "string")
                throw new Error(
                  typeof result?.message === "string"
                    ? result.message
                    : "Image upload failed. Please try again.",
                );
              updateUrl(result.url);
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setBusy(false);
              onBusyChange(false);
              input.value = "";
            }
          }}
        />
      </label>
      {busy && <p role="status">Uploading image…</p>}
      {error && (
        <p role="alert" className="bc-error">
          {error}
        </p>
      )}
      {currentUrl && (
        <img
          className="content-image-preview"
          src={currentUrl}
          alt="Selected image preview"
        />
      )}
      <p className="bc-helper">
        Upload an approved image or paste its URL. Save the record to apply it.
      </p>
    </div>
  );
}
