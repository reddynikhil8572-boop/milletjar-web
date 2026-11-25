/**
 * Edge-safe client IP resolution. Shared by proxy.ts and the route guards so
 * both layers key rate limits on the same value.
 *
 * Behind a trusted proxy the right-most X-Forwarded-For entry is the peer the
 * platform appended; trusting the left-most value would let any client spoof
 * its IP. Set TRUST_PROXY=false only when the app is directly exposed.
 */
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

function validIp(value: string): boolean {
  const candidate = value.trim();
  if (IPV4.test(candidate)) {
    return candidate.split(".").every((part) => Number(part) <= 255);
  }
  return IPV6.test(candidate) && candidate.includes(":");
}

export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY === "false") return "unknown";

  const real = req.headers.get("x-real-ip") || "";
  if (validIp(real)) return real.trim();

  const forwarded = req.headers.get("x-forwarded-for") || "";
  const candidates = forwarded
    .split(",")
    .map((part) => part.trim())
    .filter(validIp);
  if (candidates.length > 0) return candidates[candidates.length - 1];

  return "unknown";
}
