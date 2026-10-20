import { z } from "zod";
import { validate } from "./validation";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type Pagination = {
  page: number;
  pageSize: number;
  skip: number;
};

export function parsePagination(
  pageInput?: string,
  pageSizeInput?: string,
): Pagination {
  const { page, pageSize } = validate(paginationSchema, {
    page: pageInput,
    pageSize: pageSizeInput,
  });
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function paginatedResult<T>(
  rows: T[],
  pagination: Pick<Pagination, "page" | "pageSize">,
) {
  const hasMore = rows.length > pagination.pageSize;
  return {
    items: hasMore ? rows.slice(0, pagination.pageSize) : rows,
    page: pagination.page,
    pageSize: pagination.pageSize,
    hasMore,
  };
}
