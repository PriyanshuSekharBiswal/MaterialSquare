import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { StaffRequest } from "./staff-request";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { validate } from "../common/validation";
import { hashPassword } from "./password";
import { StaffGuard } from "./access.guard";
import {
  ASSIGNABLE_STAFF_ROLES,
  ASSIGNABLE_STAFF_ROLE_DEFINITIONS,
} from "./staff-access";
import { PrismaService } from "../prisma/prisma.service";

const roleSchema = z.enum(ASSIGNABLE_STAFF_ROLES);
const createStaffSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(254).optional(),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/)
      .optional(),
    role: roleSchema,
    password: z
      .string()
      .min(6)
      .max(256)
      .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,256}$/, {
        message: "Use at least 6 characters, including an uppercase letter, a number and a special character",
      }),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Add an email address or mobile number for staff sign-in",
  });
const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).nullable().optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});
const passwordSchema = z.object({
  password: z
    .string()
    .min(6)
    .max(256)
    .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,256}$/, {
      message: "Use at least 6 characters, including an uppercase letter, a number and a special character",
    }),
});

@Controller("admin/staff")
@UseGuards(StaffGuard)
export class StaffManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("roles")
  roles() {
    return ASSIGNABLE_STAFF_ROLE_DEFINITIONS;
  }

  @Get()
  list() {
    return this.prisma.staffUser.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  @Post()
  async create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(createStaffSchema, body);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const staff = await tx.staffUser.create({
          data: {
            name: data.name,
            email: data.email?.toLowerCase() || null,
            phone: data.phone || null,
            role: data.role,
            passwordHash: hashPassword(data.password),
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });
        await tx.auditLog.create({
          data: {
            staffId: req.user.userId,
            action: "STAFF_ACCOUNT_CREATED",
            entityType: "STAFF_USER",
            entityId: staff.id,
            metadata: { role: staff.role },
          },
        });
        return staff;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "That staff email or mobile number is already in use",
        );
      throw error;
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const data = validate(updateStaffSchema, body);
    const target = await this.prisma.staffUser.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
    });
    if (!target) throw new NotFoundException("Staff account not found");
    if (
      target.role === "SUPER_ADMIN" &&
      (data.role !== undefined || data.isActive !== undefined)
    )
      throw new ConflictException(
        "The primary owner’s role and access status cannot be changed here",
      );
    const nextEmail = data.email === undefined ? target.email : data.email;
    const nextPhone = data.phone === undefined ? target.phone : data.phone;
    if (!nextEmail && !nextPhone)
      throw new ConflictException("Keep at least one sign-in method on the account");
    const normalizedData = {
      ...data,
      ...(data.email !== undefined
        ? { email: data.email?.toLowerCase() || null }
        : {}),
    };
    return this.prisma.$transaction(async (tx) => {
      const staff = await tx.staffUser.update({
        where: { id },
        data: {
          ...normalizedData,
          ...(data.role !== undefined || data.isActive !== undefined
            ? { authVersion: { increment: 1 } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      const changes = Object.entries(normalizedData).map(([field, value]) => ({
        field,
        before: field === "role"
          ? target.role
          : field === "isActive"
            ? target.isActive
            : target[field as "name" | "email" | "phone"],
        after: value,
      }));
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "STAFF_ACCESS_UPDATED",
          entityType: "STAFF_USER",
          entityId: id,
          metadata: { changedFields: Object.keys(normalizedData), changes },
        },
      });
      return staff;
    });
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: StaffRequest) {
    if (id === req.user.userId)
      throw new ConflictException("You cannot delete your own staff account");
    const target = await this.prisma.staffUser.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, role: true, isActive: true },
    });
    if (!target) throw new NotFoundException("Staff account not found");
    if (target.role === "SUPER_ADMIN")
      throw new ConflictException("The primary owner account cannot be deleted");
    const actor = await this.prisma.staffUser.findUnique({
      where: { id: req.user.userId },
      select: { name: true },
    });
    if (!actor) throw new NotFoundException("Staff account not found");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id },
        data: { deletedAt: now, isActive: false, authVersion: { increment: 1 } },
      });
      await tx.recentlyDeletedRecord.create({
        data: {
          entityType: "STAFF_USER",
          entityId: id,
          displayName: target.name,
          deletedById: req.user.userId,
          deletedByName: actor.name,
          deletedAt: now,
          expiresAt,
          metadata: { wasActive: target.isActive, role: target.role },
        },
      });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "STAFF_ACCOUNT_DELETED",
          entityType: "STAFF_USER",
          entityId: id,
          metadata: { name: target.name, role: target.role, expiresAt: expiresAt.toISOString() },
        },
      });
    });
    return { success: true, expiresAt };
  }

  @Post(":id/password")
  async resetPassword(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    if (id === req.user.userId)
      throw new ConflictException(
        "Use the account password-change flow for your own password",
      );
    const { password } = validate(passwordSchema, body);
    const target = await this.prisma.staffUser.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("Staff account not found");
    await this.prisma.$transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id },
        data: {
          passwordHash: hashPassword(password),
          authVersion: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "STAFF_PASSWORD_RESET",
          entityType: "STAFF_USER",
          entityId: id,
          metadata: { sessionsRevoked: true },
        },
      });
    });
    return { success: true };
  }
}
