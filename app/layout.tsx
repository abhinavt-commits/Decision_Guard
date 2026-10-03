import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "SANGYAN Decision Guard",
  description: "Before you act, let's check. A bilingual (Hindi/English) decision-safety check for share tips — never buy/sell advice.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Decision Guard", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1749c9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
