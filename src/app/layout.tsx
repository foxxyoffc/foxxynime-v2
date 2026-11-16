import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoxxyNime V2 — Anime & Comics",
  description:
    "Discover anime and comics in one elegant streaming experience.",
  applicationName: "FoxxyNime V2",
};

export const viewport: Viewport = {
  themeColor: "#090711",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
