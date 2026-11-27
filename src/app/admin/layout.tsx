import React from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="h-screen bg-[#080808] text-white flex flex-col md:flex-row overflow-hidden">
      <AdminSidebar adminName={admin.full_name} adminEmail={admin.email} />
      <main className="flex-1 overflow-y-auto p-5 sm:p-8 max-w-7xl">{children}</main>
    </div>
  );
}
