import type { NextConfig } from "next";

/**
 * Product images uploaded from /admin live in the Supabase Storage bucket
 * `product-images`; the host is taken from SUPABASE_URL when it is set so the
 * exact project is allowed, with wildcard fallbacks for other Supabase regions.
 */
function storageHosts(): { protocol: "https"; hostname: string }[] {
  const hosts: { protocol: "https"; hostname: string }[] = [];
  try {
    if (process.env.SUPABASE_URL) {
      hosts.push({ protocol: "https", hostname: new URL(process.env.SUPABASE_URL).host });
    }
  } catch {
    // Ignore an unusable SUPABASE_URL; the wildcards below still apply.
  }
  hosts.push({ protocol: "https", hostname: "**.supabase.co" });
  hosts.push({ protocol: "https", hostname: "**.supabase.in" });
  return hosts;
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: storageHosts().map((host) => ({
      ...host,
      pathname: "/storage/v1/object/public/**",
    })),
  },
};

export default nextConfig;
