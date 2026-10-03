export async function submitRequest<T>(
  path: string,
  body: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_API_URL || "/api"}${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(65000),
      },
    );
  } catch {
    throw new Error("We couldn't complete that action. Please try again shortly.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "Could not submit your request. Please try again.",
    );
  return data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function customerApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
  accountId?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_API_URL || "/api"}${path}`,
      {
        method,
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Material-Square": "customer",
          ...(accountId ? { "X-Material-Account": accountId } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(65000),
      },
    );
  } catch {
    throw new ApiError("We couldn't complete sign-in. Please try again shortly.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok && response.status >= 500)
    throw new ApiError("We couldn't complete sign-in. Please try again shortly.", response.status);
  if (!response.ok)
    throw new ApiError(
      typeof data?.message === "string"
        ? data.message
        : "We couldn't complete that action. Please try again.",
      response.status,
    );
  return data as T;
}
