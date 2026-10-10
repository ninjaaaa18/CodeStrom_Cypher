import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export interface ApiListResponse<T> {
  data: T[];
  count: number;
  pagination: {
    limit: number;
    offset: number;
  };
}

export interface OrderApiRow {
  id: number;
  order_number: string;
  customer_name: string;
  product_name: string;
  total: number;
  status: string;
  created_at: string;
}

export interface ProductApiRow {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  created_at: string;
}

export interface AnalyticsOverviewResponse {
  totalOrders: number;
  deliveredRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
}

const defaultBaseUrl = "http://localhost:4000";
const normalizedBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl).replace(/\/$/, "");

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.error?.message ?? `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(`${normalizedBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });

  return parseApiResponse<T>(response);
}

export async function postApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${normalizedBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse<T>(response);
}

export async function patchApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${normalizedBaseUrl}${path}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse<T>(response);
}

// ---------------------------------------------------------------------------
// Authenticated helpers for /api/v1 routes.
//
// These are the ONLY helpers that may be used against protected /api/v1
// endpoints. Every call retrieves a fresh access token at request time from
// the Supabase session (never from React state, which may be stale) and fails
// safely before sending anything if the token is unavailable. Do not route
// /api/v1 calls through the unauthenticated fetchApi/postApi/patchApi helpers.
// ---------------------------------------------------------------------------

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

// Retrieves a valid access token at call time. Throws AuthenticationError
// (without performing any network request) when Supabase is not configured or
// no session/token is present, so we never send an unauthenticated request.
async function getAccessToken(): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new AuthenticationError(
      "Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable it."
    );
  }

  let session;
  try {
    const result = await getSupabaseClient().auth.getSession();
    session = result.data.session;
  } catch {
    throw new AuthenticationError("Unable to read your session. Please sign in again.");
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new AuthenticationError("You must be signed in to perform this action.");
  }

  return accessToken;
}

async function authedApiRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown
): Promise<T> {
  const accessToken = await getAccessToken();

  const hasBody = method !== "GET" && body !== undefined;
  const response = await fetch(`${normalizedBaseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  return parseApiResponse<T>(response);
}

export function fetchApiV1<T>(path: string): Promise<T> {
  return authedApiRequest<T>("GET", path);
}

export function postApiV1<T>(path: string, body: unknown): Promise<T> {
  return authedApiRequest<T>("POST", path, body);
}

export function patchApiV1<T>(path: string, body: unknown): Promise<T> {
  return authedApiRequest<T>("PATCH", path, body);
}
