import type { Request } from "express";

export type StaffRequest = Request & { user: { userId: string; role: string } };
