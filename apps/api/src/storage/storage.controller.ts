import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Query,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "node:crypto";
import { StaffGuard } from "../auth/access.guard";
import type { StaffRequest } from "../auth/staff-request";
import { StorageService } from "./storage.service";
import { z } from "zod";
import { validate } from "../common/validation";
import { MediaAssetsService } from "./media-assets.service";
import { detectSupportedImage } from "./image-file";
@Controller("storage")
@UseGuards(StaffGuard)
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly mediaAssets: MediaAssetsService,
  ) {}

  @Get("media")
  async listMedia(@Query() query: Record<string, string>) {
    const input = validate(
      z.object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        search: z.string().trim().max(120).default(""),
      }),
      query,
    );
    return this.mediaAssets.list(input);
  }

  @Post("images")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(
    @UploadedFile()
    file?: { buffer: Buffer; originalname?: string; size?: number },
    @Req() req?: StaffRequest,
  ) {
    if (!file) throw new BadRequestException("Image file is required");
    const bytes = file.buffer;
    const type = detectSupportedImage(bytes);
    if (!type)
      throw new BadRequestException(
        "Only PNG, JPEG, and WebP images are supported",
      );
    const key = `images/${randomUUID()}.${type.extension}`;
    const url = await this.storage.uploadFile(key, bytes, type.mimeType);
    return this.mediaAssets.recordUploadedAsset({
      key,
      url,
      originalName: file.originalname || `image.${type.extension}`,
      mimeType: type.mimeType,
      byteSize: file.size ?? bytes.byteLength,
      staffId: req?.user.userId,
    });
  }
}
