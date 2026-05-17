"use client";

import Link from "next/link";

import { useDashboardSession } from "@/components/providers/DashboardSessionProvider";
import { t } from "@/lib/i18n";
import { PERMISSIONS, can } from "@/lib/permissions";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AppSidebar() {
  const { dict } = useI18n();
  const { session } = useDashboardSession();
  const role = session?.user?.role || "";

  return (
    <aside className="z-sidebar">
      <div className="z-sidebar-brand">{t(dict, "common.appName")}</div>

      <nav className="z-sidebar-nav">
        <Link href="/dashboard">{t(dict, "dashboard.title")}</Link>
        {can(role, PERMISSIONS.MENU_READ) ? (
          <Link href="/dashboard/menu">{t(dict, "dashboard.menuLabel")}</Link>
        ) : null}
        {can(role, PERMISSIONS.TABLES_READ) ? (
          <Link href="/dashboard/tables">{t(dict, "dashboard.tablesLabel")}</Link>
        ) : null}
        {can(role, PERMISSIONS.ORDERS_READ) ? (
          <Link href="/dashboard/orders">{t(dict, "dashboard.ordersLabel")}</Link>
        ) : null}
        {can(role, PERMISSIONS.STAFF_READ) ? (
          <Link href="/dashboard/staff">{t(dict, "dashboard.staffLabel")}</Link>
        ) : null}
      </nav>
    </aside>
  );
}
