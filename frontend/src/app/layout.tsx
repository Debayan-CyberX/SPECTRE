import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/sora";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import "./reinvention.css";
import "./workspace-reinvention.css";
import "./unseen.css";
import "./workspace-unseen.css";
import "./workspace-glass.css";
import { Providers } from "@/components/providers";
export const metadata: Metadata = {
  title: "SPECTRE — Reconstruct the unseen",
  description:
    "A local-first forensic investigation workspace. Reconstruct incidents, trace evidence, and uncover the sequence behind a compromise.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
