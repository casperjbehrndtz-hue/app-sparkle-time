// Allowed origins — add partner domains here when onboarded
const ALLOWED_ORIGINS = [
  "https://app-sparkle-time.vercel.app",
  "https://nemtbudget.nu",
  "http://localhost:5173",
  "http://localhost:8080",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any localhost port in dev
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = isAllowedOrigin(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Validate message length to prevent prompt injection / token overflow
export function validateMessages(
  messages: unknown[]
): { role: string; content: string }[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(0, 12) // max 12 messages in history
    .filter(
      (m): m is { role: string; content: string } =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as Record<string, unknown>).role === "string" &&
        typeof (m as Record<string, unknown>).content === "string"
    )
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content).slice(0, 600), // max 600 chars per message
    }));
}

// Validate Danish postal code
export function isValidPostalCode(code: unknown): boolean {
  return typeof code === "string" && /^\d{4}$/.test(code);
}
