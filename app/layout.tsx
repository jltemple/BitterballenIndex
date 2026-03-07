import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    template: "%s · Bitterballen Index",
    default: "Bitterballen Index Amsterdam",
  },
  description: "Tracking the price of bitterballen at bars across Amsterdam.",
  openGraph: {
    siteName: "Bitterballen Index",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

// Root layout — html/body are provided by app/[locale]/layout.tsx for public routes
// and by app/admin/layout.tsx for admin routes.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
