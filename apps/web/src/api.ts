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
    response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Material-Square": "customer",
        ...(accountId ? { "X-Material-Account": accountId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(
      "We couldn't reach your account. Check your connection and try again.",
      0,
    );
  }
  const contentType = response.headers.get("content-type") || "";
  let data: { message?: unknown } | null = null;
  let text = "";
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  } else {
    text = await response.text().catch(() => "");
  }
  if (!response.ok) {
    const serverMessage =
      typeof data?.message === "string" ? data.message : text.trim();
    const missingApiRoute =
      response.status === 404 &&
      /^Cannot (?:GET|POST|PUT|PATCH|DELETE) \/api\//i.test(serverMessage);
    throw new ApiError(
      missingApiRoute
        ? "The account service is out of date. Restart or redeploy the Material Square API, then try again."
        : serverMessage && !/^<!doctype html|^<html/i.test(serverMessage)
          ? serverMessage
          : "The account service returned an unexpected response. Please try again later.",
      response.status,
    );
  }
  return data as T;
}
