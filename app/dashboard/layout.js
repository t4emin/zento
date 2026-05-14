import { redirect } from "next/navigation";

import DashboardShell from "@/components/layout/DashboardShell";
import { getStaffSession } from "@/lib/auth";

export default async function DashboardLayout({ children }) {
  const session = await getStaffSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
