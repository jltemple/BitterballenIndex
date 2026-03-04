"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const links = [
  { href: "/bars", key: "navBars" },
  { href: "/map", key: "navMap" },
] as const;

export default function PrimaryNav() {
  const pathname = usePathname();
  const t = useTranslations("layout");

  return (
    <div className="flex gap-1 text-sm font-medium self-stretch">
      {links.map(({ href, key }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`inline-flex items-center px-3 border-b-2 -mb-px transition-all ${
              isActive
                ? "border-orange-500 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </div>
  );
}
