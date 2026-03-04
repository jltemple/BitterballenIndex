"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-semibold ml-2 border-l border-gray-200 pl-3">
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending}
        className={`cursor-pointer disabled:cursor-wait transition-colors ${locale === "en" ? "text-orange-500" : "text-gray-400 hover:text-gray-900"}`}
      >
        EN
      </button>
      <span className="text-gray-300 select-none">|</span>
      <button
        onClick={() => switchLocale("nl")}
        disabled={isPending}
        className={`cursor-pointer disabled:cursor-wait transition-colors ${locale === "nl" ? "text-orange-500" : "text-gray-400 hover:text-gray-900"}`}
      >
        NL
      </button>
    </div>
  );
}
