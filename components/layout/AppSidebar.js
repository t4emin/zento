"use client";

import Link from "next/link";

import { t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AppSidebar() {
  const { dict } = useI18n();

  return (
    <aside className="z-sidebar">
      <div className="z-sidebar-brand">{t(dict, "common.appName")}</div>

      <nav className="z-sidebar-nav">
        <Link href="/dashboard">{t(dict, "dashboard.title")}</Link>
        <Link href="/dashboard/menu">{t(dict, "dashboard.menuLabel")}</Link>
        <Link href="/dashboard/tables">{t(dict, "dashboard.tablesLabel")}</Link>
        <Link href="/dashboard/orders">{t(dict, "dashboard.ordersLabel")}</Link>
      </nav>
    </aside>
  );
}
