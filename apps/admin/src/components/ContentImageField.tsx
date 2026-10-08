import { useState } from "react";
import { ImagePlus, Link2, LoaderCircle, UploadCloud, X } from "lucide-react";

export default function ContentImageField({
  token,
  initialUrl = "",
  value,
  onChange,
  label,
  customerUrl,
  onSignOut,
  onBusyChange,
}: {
  token: string;
  initialUrl?: string;
  value?: string;
  onChange?: (url: string) => void;
  label: string;
  customerUrl?: string;
  onSignOut: () => void;
  onBusyChange: (value: boolean) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const currentUrl = value ?? url;
  const previewUrl = (() => {
    if (!currentUrl.startsWith("/")) return currentUrl;
    const localCustomerUrl =
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? `${window.location.protocol}//material-square.localtest.me:5173`
        : window.location.origin;
    try {
      return new URL(
        currentUrl,
        customerUrl || import.meta.env.VITE_CUSTOMER_APP_URL || localCustomerUrl,
      ).toString();
    } catch {
      return currentUrl;
    }
  })();

  const updateUrl = (next: string) => {
    setImageFailed(false);
    setUrl(next);
    onChange?.(next);
  };

  async function upload(file: File, input: HTMLInputElement) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/storage/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
        signal: AbortSignal.timeout(65000),
      });
      const result = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok || typeof result?.url !== "string") {
        throw new Error(typeof result?.message === "string" ? result.message : "Image upload failed. Please try again.");
      }
      updateUrl(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed. Please try again.");
    } finally {
      setBusy(false);
      onBusyChange(false);
      input.value = "";
    }
  }

  return (
    <fieldset className="content-image-field">
      <legend>{label}</legend>
      <p className="content-image-field-intro">Choose one main image for this section. You can paste an approved image link or upload a file.</p>
      <div className="content-image-field-options">
        <label className="content-image-url-option">
          <span className="content-image-option-heading"><Link2 size={16} /> Image URL <small>Use an approved public image link</small></span>
          <input
            name="image"
            type="url"
            value={currentUrl}
            onChange={(event) => updateUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
            aria-label={`${label} image URL`}
          />
        </label>
        <label className={`content-image-upload-option${busy ? " is-uploading" : ""}`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (file) void upload(file, input);
            }}
          />
          {busy ? <LoaderCircle className="spin" size={19} /> : <UploadCloud size={19} />}
          <span>{busy ? "Uploading image…" : currentUrl ? "Replace with uploaded image" : "Upload an image"}</span>
          <small>PNG, JPEG or WebP · Up to 5 MB</small>
        </label>
      </div>
      {error && <p role="alert" className="bc-error">{error}</p>}
      {currentUrl && (
        <div className="content-image-preview-card">
          {imageFailed ? <div className="content-image-preview-placeholder"><ImagePlus size={24} /><span>Image preview unavailable</span></div> : <img className="content-image-preview" src={previewUrl} alt={`${label} preview`} onError={() => setImageFailed(true)} />}
          <div className="content-image-preview-details">
            <strong>{imageFailed ? "Check this image link" : "Image preview"}</strong>
            <span title={currentUrl}>{currentUrl}</span>
          </div>
          <button type="button" className="btn-sm btn-secondary" onClick={() => updateUrl("")} aria-label={`Remove ${label} image`}><X size={15} /> Remove</button>
        </div>
      )}
      <p className="bc-helper">Your image stays in this draft until you save or publish the page.</p>
    </fieldset>
  );
}
