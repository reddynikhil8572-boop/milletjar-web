import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Millet Jar",
    short_name: "Millet Jar",
    description:
      "Fresh from Farm to Your Family. Wholesome millet-based foods from www.milletjar.in.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F6F1",
    theme_color: "#1F7C3F",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
