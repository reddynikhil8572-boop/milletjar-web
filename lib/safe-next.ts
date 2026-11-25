/** Only same-site local paths may be used as post-login redirects. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/account";

  const lower = value.toLowerCase();
  if (
    value.startsWith("//") ||
    lower.includes("\\") ||
    lower.includes("%5c") ||
    lower.startsWith("/%2f")
  ) {
    return "/account";
  }

  try {
    const url = new URL(value, "https://milletjar.in");
    if (url.origin !== "https://milletjar.in") return "/account";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/account";
  }
}
