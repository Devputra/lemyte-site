// src/app/manifest.ts — /manifest.webmanifest: name, colours and icon when the site is added to a home screen.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lemyte — GATE practice tests",
    short_name: "Lemyte",
    description: "Official GATE past papers as timed tests, marked with the official answer key.",
    start_url: "/gate",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#193bc8",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
