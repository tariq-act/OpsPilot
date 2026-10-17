/**
 * Centralized, type-safe API client for the OpsPilot NestJS backend.
 *
 * - Reads NEXT_PUBLIC_API_URL for the base URL; never hardcodes it.
 * - Sends credentials (session cookies set by Better Auth) on every request.
 * - Throws ApiError on non-2xx responses so callers can handle errors uniformly.
 */

import type { ApiErrorBody } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message ?? `API error ${status}`);
    this.name = "ApiError";
  }

  /** True when the session is missing or expired. */
  get isUnauthorized() {
    return this.status === 401;
  }

  /** True when the user is authenticated but lacks permission. */
  get isForbidden() {
    return this.status === 403;
  }

  /** True when the requested resource does not exist. */
  get isNotFound() {
    return this.status === 404;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Extra headers merged with the defaults. */
  headers?: Record<string, string>;
  /** Passed straight through to `fetch`. Useful for Next.js cache options. */
  next?: NextFetchRequestConfig;
}

async function request<T>(
  path: string,
  { method = "GET", body, headers: extraHeaders, next }: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
    next,
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      errorBody = {
        statusCode: response.status,
        message: response.statusText || "Unknown error",
        error: "Unknown",
      };
    }
    throw new ApiError(response.status, errorBody);
  }

  // 204 No Content — return an empty object cast to T
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Typed resource helpers
// ---------------------------------------------------------------------------

export const api = {
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "GET" });
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method">,
  ) {
    return request<T>(path, { ...options, method: "POST", body });
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method">,
  ) {
    return request<T>(path, { ...options, method: "PATCH", body });
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method">,
  ) {
    return request<T>(path, { ...options, method: "PUT", body });
  },

  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "DELETE" });
  },
};
