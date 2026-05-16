const BOOK_QUERY_PATTERN = /^[\p{L}\p{N}\s\-'.]+$/u;

export interface ValidationOk<T> {
  ok: true;
  data: T;
}

export interface ValidationErr {
  ok: false;
  error: string;
}

export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

export interface NormalizedBook {
  title: string;
  author: string;
  year: number;
  image: string | null;
  url: string | null;
}

export interface NormalizedLoan {
  bookId: number;
}

export function isNonEmptyTrimmedString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidUsername(value: unknown): boolean {
  if (!isNonEmptyTrimmedString(value)) return false;
  const normalized = (value as string).trim();
  return normalized.length >= 3 && normalized.length <= 50;
}

export function isValidPassword(value: unknown): boolean {
  if (!isNonEmptyTrimmedString(value)) return false;
  const normalized = (value as string).trim();
  return normalized.length >= 4 && normalized.length <= 128;
}

export function parsePositiveIntId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeBookUrl(value: unknown): ValidationResult<string | null> {
  if (value === undefined || value === null) {
    return { ok: true, data: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "Invalid url" };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { ok: true, data: null };
  }

  if (normalized.length > 2048) {
    return { ok: false, error: "Invalid url" };
  }

  if (/[\u0000-\u001F\u007F]/.test(normalized)) {
    return { ok: false, error: "Invalid url" };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: "Invalid url" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Invalid url" };
  }

  if (!parsed.hostname || parsed.username || parsed.password) {
    return { ok: false, error: "Invalid url" };
  }

  if (
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1"
  ) {
    return { ok: false, error: "Invalid url" };
  }

  return { ok: true, data: parsed.toString() };
}

export function validateBookPayload(payload: unknown): ValidationResult<NormalizedBook> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const body = payload as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const author = typeof body.author === "string" ? body.author.trim() : "";
  const year = body.year;
  const currentYear = new Date().getFullYear();

  if (!title || title.length > 255) {
    return { ok: false, error: "Invalid title" };
  }

  if (!author || author.length > 255) {
    return { ok: false, error: "Invalid author" };
  }

  if (typeof year !== "number" || !Number.isInteger(year) || year < 1000 || year > currentYear + 1) {
    return { ok: false, error: "Invalid year" };
  }

  if (
    body.image !== undefined &&
    body.image !== null &&
    typeof body.image !== "string"
  ) {
    return { ok: false, error: "Invalid image" };
  }

  const urlValidation = normalizeBookUrl(body.url);
  if (!urlValidation.ok) {
    return { ok: false, error: urlValidation.error };
  }

  return {
    ok: true,
    data: {
      title,
      author,
      year,
      image: (body.image as string | null | undefined) ?? null,
      url: urlValidation.data,
    },
  };
}

export function validateLoanPayload(payload: unknown): ValidationResult<NormalizedLoan> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const body = payload as Record<string, unknown>;
  const bookId = parsePositiveIntId(body.bookId);
  if (!bookId) {
    return { ok: false, error: "Invalid bookId" };
  }

  return {
    ok: true,
    data: { bookId },
  };
}

export function validateBooksQueryValue(
  rawValue: unknown,
  fieldName: string,
): ValidationResult<string | null> {
  if (rawValue === undefined) {
    return { ok: true, data: null };
  }

  if (typeof rawValue !== "string") {
    return { ok: false, error: `Invalid ${fieldName}` };
  }

  const value = rawValue.trim();
  if (value.length > 100) {
    return { ok: false, error: `Invalid ${fieldName}` };
  }

  if (value.length === 0) {
    return { ok: true, data: null };
  }

  if (!BOOK_QUERY_PATTERN.test(value)) {
    return { ok: false, error: `Invalid ${fieldName}` };
  }

  return { ok: true, data: value };
}
