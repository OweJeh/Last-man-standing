import React from "react";
import { requireAdmin } from "@/lib/auth";
import { emailToPhone } from "@/lib/validations";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  // Show phone number for phone-auth admins, real email for email-auth admins
  const displayIdentifier = admin.email?.endsWith("@lms.com")
    ? emailToPhone(admin.email)
    : (admin.email ?? "");

  return (
    <div className="h-screen bg-[#080808] text-white flex flex-col md:flex-row overflow-hidden">
      <AdminSidebar adminName={admin.full_name} adminEmail={displayIdentifier} />
      <main className="flex-1 overflow-y-auto p-5 sm:p-8 max-w-7xl">{children}</main>
    </div>
  );
}
