import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import PrimaryNav from "@/components/PrimaryNav";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations("layout");

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <NextIntlClientProvider messages={messages}>
          <header className="bg-white border-b border-gray-200">
            <nav className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 sm:gap-2.5 font-bold text-sm sm:text-lg">
                <span className="w-6 h-6 sm:w-7 sm:h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-black leading-none shrink-0">bi</span>
                <span className="text-gray-900">{t("brand")}</span>
              </Link>
              <div className="flex items-center">
                <PrimaryNav />
                <LocaleSwitcher />
              </div>
            </nav>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-4 sm:py-8">
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
