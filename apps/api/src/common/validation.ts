import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
export function validate<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException({
      message: "Invalid request",
      issues: result.error.flatten(),
    });
  return result.data;
}
