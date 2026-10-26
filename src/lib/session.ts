import type { Role } from "@/components/pramana/demo-state";

/**
 * Stores the short-lived API token in tab-scoped session storage. A refresh
 * keeps the session; closing the tab clears it. The backend remains the
 * authority for identity and authorization.
 */

export type Session = {
  token: string;
  role: Role;
  userId: string;
  name: string;
  email: string;
};

const SESSION_KEY = "pramana-session";

/**
 * Reads the stored session. Safe to call during server rendering: it returns
 * null when `sessionStorage` is unavailable (no window) instead of throwing.
 */
export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Session).token === "string" &&
      ((parsed as Session).role === "customer" || (parsed as Session).role === "admin") &&
      typeof (parsed as Session).userId === "string"
    ) {
      return parsed as Session;
    }
    return null;
  } catch {
    return null;
  }
}

/** Writes the session. No-op outside the browser. */
export function writeSession(session: Session | null): void {
  if (typeof window === "undefined") return;
  if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.sessionStorage.removeItem(SESSION_KEY);
}

/** Initials for avatar chips, e.g. "Anaya Rao" -> "AR". */
export function initials(name: string | undefined | null, fallback = "PR"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Masks an email like "an•••@example.test" for display. */
export function maskEmail(email: string | undefined | null): string {
  if (!email) return "—";
  const match = email.match(/^(.{2}).*(@.*)$/);
  return match ? `${match[1]}•••${match[2]}` : email;
}

/** Masks a phone number keeping only the last 4 digits, e.g. "•••••• 4821". */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "").slice(-4);
  return `•••••• ${digits}`;
}
