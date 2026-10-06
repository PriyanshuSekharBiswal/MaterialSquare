import { z } from "zod";

export function normalizeStaffPhone(value: string): string {
  const digits = value.trim().replace(/[\s()+.-]/g, "");
  if (/^0091[6-9]\d{9}$/.test(digits)) return digits.slice(4);
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  if (/^0[6-9]\d{9}$/.test(digits)) return digits.slice(1);
  return digits;
}

export const StaffLoginSchema = z
  .object({
    phone: z
      .string()
      .transform(normalizeStaffPhone)
      .pipe(
        z
          .string()
          .regex(
            /^[6-9]\d{9}$/,
            "Enter a valid 10-digit Indian mobile number (with optional +91)",
          ),
      )
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .max(254)
      .optional(),
    password: z
      .string()
      .min(8, "Enter your password with at least 8 characters")
      .max(256, "Password is too long"),
  })
  .refine(
    (input) => Boolean(input.phone || input.email),
    "Enter your mobile number or email address",
  );
