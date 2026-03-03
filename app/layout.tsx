import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export const metadata: Metadata = {
  title: "Bitterballen Index Amsterdam",
  description: "Track the price of bitterballen at bars across Amsterdam",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("layout");

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <NextIntlClientProvider messages={messages}>
          <header className="bg-white border-b border-gray-200">
            <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
                <span className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-black leading-none">bi</span>
                <span className="text-gray-900">{t("brand")}</span>
              </Link>
              <div className="flex items-center">
                <div className="flex gap-1 text-sm font-medium">
                  <Link href="/bars" prefetch={false} className="px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">{t("navBars")}</Link>
                  <Link href="/map" prefetch={false} className="px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">{t("navMap")}</Link>
                </div>
                <LocaleSwitcher />
              </div>
            </nav>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="text-center text-xs text-gray-400 py-6 mt-8 border-t border-gray-200">
            {t("footer")}
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
