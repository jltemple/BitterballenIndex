import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bitterballen Index Amsterdam",
  description: "Track the price of bitterballen at bars across Amsterdam",
};

// Root layout — html/body are provided by app/[locale]/layout.tsx for public routes
// and by app/admin/layout.tsx for admin routes.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
