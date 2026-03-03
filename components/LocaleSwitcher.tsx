"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function switchLocale(next: string) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-semibold ml-2 border-l border-gray-200 pl-3">
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending}
        className={`transition-colors ${locale === "en" ? "text-orange-500" : "text-gray-400 hover:text-gray-900"}`}
      >
        EN
      </button>
      <span className="text-gray-300 select-none">|</span>
      <button
        onClick={() => switchLocale("nl")}
        disabled={isPending}
        className={`transition-colors ${locale === "nl" ? "text-orange-500" : "text-gray-400 hover:text-gray-900"}`}
      >
        NL
      </button>
    </div>
  );
}
