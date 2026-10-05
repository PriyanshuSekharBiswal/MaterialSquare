export type SupportedImage = {
  extension: "png" | "jpg" | "webp";
  mimeType: "image/png" | "image/jpeg" | "image/webp";
};

/** Trust the file signature rather than the browser-provided MIME type. */
export function detectSupportedImage(bytes: Buffer): SupportedImage | null {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { extension: "png", mimeType: "image/png" };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { extension: "jpg", mimeType: "image/jpeg" };
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return { extension: "webp", mimeType: "image/webp" };
  return null;
}
