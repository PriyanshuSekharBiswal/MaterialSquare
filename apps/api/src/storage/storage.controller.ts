import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "node:crypto";
import { StaffGuard } from "../auth/access.guard";
import { StorageService } from "./storage.service";
@Controller("storage")
@UseGuards(StaffGuard)
export class StorageController {
  constructor(private storage: StorageService) {}
  @Post("images")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file) throw new BadRequestException("Image file is required");
    const bytes = file.buffer;
    let type: { extension: string; mime: string } | undefined;
    if (
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      type = { extension: "png", mime: "image/png" };
    else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
      type = { extension: "jpg", mime: "image/jpeg" };
    else if (
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP"
    )
      type = { extension: "webp", mime: "image/webp" };
    if (!type)
      throw new BadRequestException(
        "Only PNG, JPEG, and WebP images are supported",
      );
    const key = `images/${randomUUID()}.${type.extension}`;
    return { key, url: await this.storage.uploadFile(key, bytes, type.mime) };
  }
}
