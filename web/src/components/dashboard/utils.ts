// ─── Dashboard Utility Functions ───

import type { Agent, Personality } from "./types";

const API_BASE = "/api/v1";
const STORAGE_KEY = "agentsid_api_key";

// ─── API Key Storage ───

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearStoredApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── API Fetch ───

export async function apiFetch<T>(
  path: string,
  apiKey: string,
  options?: RequestInit,
): Promise<T> {
  const url = API_BASE + path;
  const headers: Record<string, string> = {
    Authorization: "Bearer " + apiKey,
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  const resp = await fetch(url, { ...options, headers });

  if (resp.status === 401 || resp.status === 403) {
    throw new Error("Unauthorized");
  }
  if (resp.status === 204) return null as T;
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatApiError(body, resp.status));
  }
  return resp.json();
}

/**
 * FastAPI returns validation errors as `detail: [{loc, msg, type}, ...]`.
 * Naively throwing `new Error(detail)` stringifies an array of objects to
 * "[object Object]", which is what users saw. Normalize to a readable message.
 */
function formatApiError(body: unknown, status: number): string {
  if (typeof body !== "object" || body === null) {
    return `Request failed: ${status}`;
  }
  const detail = (body as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const loc = Array.isArray((item as { loc?: unknown[] }).loc)
            ? (item as { loc: unknown[] }).loc.join(".")
            : "";
          const msg = String((item as { msg: unknown }).msg);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return JSON.stringify(item);
      })
      .filter(Boolean);
    return messages.join("; ") || `Request failed: ${status}`;
  }

  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }

  return `Request failed: ${status}`;
}

// ─── Color Utilities ───

export function agentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 65%, 55%)`;
}

export function agentGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 65%, 50%), hsl(${h2}, 55%, 40%))`;
}

export function agentInitial(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

// ─── Personality ───

export function agentPersonality(
  denyRate: number,
  totalEvents: number,
): Personality {
  if (totalEvents === 0) {
    return { emoji: "\u{1F95A}", label: "Newborn", desc: "No activity yet" };
  }
  if (denyRate === 0) {
    return {
      emoji: "\u{1F607}",
      label: "Model citizen",
      desc: "Never been denied",
    };
  }
  if (denyRate < 5) {
    return {
      emoji: "\u{1F916}",
      label: "Well-behaved",
      desc: "Stays within boundaries",
    };
  }
  if (denyRate < 20) {
    return {
      emoji: "\u{1F50D}",
      label: "Curious explorer",
      desc: "Occasionally tests limits",
    };
  }
  if (denyRate < 50) {
    return {
      emoji: "\u26A1",
      label: "Boundary pusher",
      desc: "Frequently hitting walls",
    };
  }
  return {
    emoji: "\u{1F6A8}",
    label: "Rogue agent",
    desc: "Mostly denied \u2014 review permissions",
  };
}

// ─── Time Utilities ───

export function relativeTime(isoStr: string | null | undefined): string {
  if (!isoStr || isoStr === "None") return "--";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 0) {
    const a = Math.abs(diff);
    if (a < 60000) return "in " + Math.floor(a / 1000) + "s";
    if (a < 3600000) return "in " + Math.floor(a / 60000) + "m";
    if (a < 86400000) return "in " + Math.floor(a / 3600000) + "h";
    return "in " + Math.floor(a / 86400000) + "d";
  }
  if (diff < 60000) return Math.floor(diff / 1000) + "s ago";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
  return d.toLocaleDateString();
}

export function expiresDisplay(isoStr: string | null | undefined): string {
  if (!isoStr || isoStr === "None") return "Never";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  if (diff < 86400000) {
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? h + "h " + m + "m" : m + "m";
  }
  return d.toLocaleDateString();
}

export function fullDate(isoStr: string | null | undefined): string {
  if (!isoStr || isoStr === "None") return "--";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString();
}

export function maskToken(tokenId: string): string {
  if (!tokenId) return "--";
  if (tokenId.length <= 8) return tokenId;
  return tokenId.slice(0, 4) + "****..." + tokenId.slice(-4);
}

// ─── Agent Status ───

export function effectiveStatus(
  agent: Agent,
): "active" | "expiring" | "revoked" | "expired" {
  if (agent.status === "revoked") return "revoked";
  if (agent.status === "expired") return "expired";
  if (agent.status === "active" && agent.expires_at) {
    const diff = new Date(agent.expires_at).getTime() - Date.now();
    if (diff <= 0) return "expired";
    if (diff < 86400000) return "expiring";
  }
  return "active";
}

// ─── Sparkline Data ───

export function generateSparklineData(seed: number, count: number): number[] {
  const data: number[] = [];
  let val = seed || 5;
  for (let i = 0; i < count; i++) {
    val = Math.max(1, val + Math.floor(Math.random() * 7) - 3);
    data.push(val);
  }
  return data;
}

// ─── Cookie Consent ───

export function getCookieConsent(): "accepted" | "declined" | null {
  const consent = localStorage.getItem("cookie_consent");
  if (consent === "accepted") return "accepted";
  if (consent === "declined") return "declined";
  return null;
}

export function setCookieConsent(value: "accepted" | "declined"): void {
  localStorage.setItem("cookie_consent", value);
}
