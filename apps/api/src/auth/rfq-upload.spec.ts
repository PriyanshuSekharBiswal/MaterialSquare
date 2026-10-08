import {
  getRfqAttachmentValidationError,
  RFQ_ATTACHMENT_MAX_FILE_BYTES,
  RFQ_ATTACHMENT_MAX_FILES,
} from "@material-square/types";

describe("RFQ attachment limits", () => {
  it("accepts the maximum file count and exact per-file size limit", () => {
    const files = Array.from({ length: RFQ_ATTACHMENT_MAX_FILES }, () => ({
      size: RFQ_ATTACHMENT_MAX_FILE_BYTES,
    }));

    expect(getRfqAttachmentValidationError(files)).toBeNull();
  });

  it("rejects more than ten files", () => {
    const files = Array.from({ length: RFQ_ATTACHMENT_MAX_FILES + 1 }, () => ({
      size: 1,
    }));

    expect(getRfqAttachmentValidationError(files)).toBe(
      "You can attach up to 10 files to a request.",
    );
  });

  it("rejects a file one byte over the 100 MB limit", () => {
    expect(
      getRfqAttachmentValidationError([
        { size: RFQ_ATTACHMENT_MAX_FILE_BYTES + 1 },
      ]),
    ).toBe("Each attachment must be 100 MB or smaller.");
  });
});
