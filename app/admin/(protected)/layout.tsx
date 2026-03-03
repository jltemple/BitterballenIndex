import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import Link from "next/link";
import LogoutClientButton from "./LogoutClientButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <Link href="/admin" className="text-lg font-bold text-orange-500">admin panel</Link>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">← public site</Link>
          <LogoutClientButton />
        </div>
      </div>
      {children}
    </div>
  );
}
