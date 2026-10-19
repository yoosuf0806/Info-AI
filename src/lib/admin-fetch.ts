"use client";

// Thin client-side JSON fetch helper for the admin UI. Throws on non-2xx with
// the server's error message.
export async function apiJson<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

// For multipart uploads (no JSON content-type).
export async function apiForm<T = unknown>(
  url: string,
  form: FormData,
  method = "POST",
): Promise<T> {
  const res = await fetch(url, { method, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`);
  }
  return data as T;
}
