export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        "X-Spectre-Request": "1",
        ...(init?.body instanceof File
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach SPECTRE. Check that the local API is running on port 8100.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.detail === "string"
        ? body.detail
        : body?.detail
          ? "Check the supplied values and try again."
          : `Request failed (${response.status}).`;
    throw new ApiError(response.status, message);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function timeLabel(timestamp: string, local = false, precise = false) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (!local) return timestamp.slice(11, precise ? 23 : 19);
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...(precise ? { fractionalSecondDigits: 3 } : {}),
  }).format(date);
}
export function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}
export function fileSize(value: number) {
  return value < 1024
    ? `${value} B`
    : value < 1024 ** 2
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / 1024 ** 2).toFixed(1)} MB`;
}
