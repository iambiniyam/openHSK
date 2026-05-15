/**
 * Safe localStorage wrappers that never throw.
 * All reads validate with a parser function and fall back to a default value.
 */

export type StorageParser<T> = (raw: unknown) => T | undefined;

/** Safely get an item from localStorage, parse it, and return a default on any failure. */
export function safeGetItem<T>(key: string, parser: StorageParser<T>, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed = JSON.parse(raw);
    const result = parser(parsed);
    return result === undefined ? defaultValue : result;
  } catch {
    return defaultValue;
  }
}

/** Safely get a raw string from localStorage (no JSON.parse). */
export function safeGetString(key: string, defaultValue: string | null = null): string | null {
  if (typeof window === 'undefined') return defaultValue;
  try {
    return window.localStorage.getItem(key) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/** Safely set an item in localStorage. */
export function safeSetItem(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Safely set a raw string in localStorage (no JSON.stringify). */
export function safeSetString(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Safely remove an item from localStorage. */
export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Common parsers for safeGetItem. */
export const parsers = {
  string: (v: unknown): string | undefined =>
    typeof v === 'string' ? v : undefined,

  number: (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined,

  boolean: (v: unknown): boolean | undefined =>
    typeof v === 'boolean' ? v : undefined,

  arrayOfStrings: (v: unknown): string[] | undefined =>
    Array.isArray(v) && v.every((item) => typeof item === 'string') ? v : undefined,

  object: <T extends Record<string, unknown>>(
    validator: (obj: Record<string, unknown>) => T | undefined
  ): StorageParser<T> => {
    return (v: unknown): T | undefined => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return validator(v as Record<string, unknown>);
      }
      return undefined;
    };
  },
};
