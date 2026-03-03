"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function LogoutClientButton() {
  const router = useRouter();
  const t = useTranslations("admin");

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-gray-500 hover:text-gray-900 transition-colors"
    >
      {t("logout")}
    </button>
  );
}
