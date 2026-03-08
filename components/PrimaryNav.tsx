"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const navLinks = [
  { href: "/bars", key: "navBars" },
  { href: "/map", key: "navMap" },
] as const;

export default function PrimaryNav() {
  const pathname = usePathname();
  const t = useTranslations("layout");

  return (
    <div className="flex items-center gap-1 text-sm font-medium self-stretch">
      {navLinks.map(({ href, key }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`inline-flex items-center px-2 sm:px-3 self-stretch border-b-2 -mb-px transition-all ${
              isActive
                ? "border-orange-500 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {t(key)}
          </Link>
        );
      })}

      <Link
        href="/submit"
        prefetch={false}
        className="ml-1 sm:ml-2 inline-flex items-center whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 hover:-translate-y-px active:scale-95 transition-all shadow-sm"
      >
        + {t("navSubmit")}
      </Link>
    </div>
  );
}
