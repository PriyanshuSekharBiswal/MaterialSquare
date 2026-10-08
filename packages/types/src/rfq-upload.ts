export const RFQ_ATTACHMENT_MAX_FILES = 10;
export const RFQ_ATTACHMENT_MAX_FILE_BYTES = 100 * 1024 * 1024;

export function getRfqAttachmentValidationError(
  files: readonly { size: number }[],
) {
  if (files.length > RFQ_ATTACHMENT_MAX_FILES)
    return `You can attach up to ${RFQ_ATTACHMENT_MAX_FILES} files to a request.`;

  if (files.some((file) => file.size > RFQ_ATTACHMENT_MAX_FILE_BYTES)) {
    const maxMb = RFQ_ATTACHMENT_MAX_FILE_BYTES / (1024 * 1024);
    return `Each attachment must be ${maxMb} MB or smaller.`;
  }

  return null;
}
