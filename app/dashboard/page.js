"use client";

import Link from "next/link";

import { useDashboardSession } from "@/components/providers/DashboardSessionProvider";
import { t } from "@/lib/i18n";
import { PERMISSIONS, can } from "@/lib/permissions";
import { useI18n } from "@/components/providers/I18nProvider";

export default function DashboardPage() {
  const { dict } = useI18n();
  const { session } = useDashboardSession();
  const role = session?.user?.role || "";

  return (
    <section className="z-dashboard-home">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">{t(dict, "dashboard.title")}</p>
        <h1>{t(dict, "dashboard.heroTitle")}</h1>
        <p className="z-dashboard-copy">
          {t(dict, "dashboard.heroDescription")}
        </p>
      </div>

      <div className="z-dashboard-card-grid">
        {can(role, PERMISSIONS.MENU_READ) ? (
          <Link href="/dashboard/menu" className="z-dashboard-link-card z-card">
            <p className="z-dashboard-card-label">{t(dict, "dashboard.menuLabel")}</p>
            <h2>{t(dict, "dashboard.menuTitle")}</h2>
            <p>{t(dict, "dashboard.menuDescription")}</p>
          </Link>
        ) : null}

        {can(role, PERMISSIONS.TABLES_READ) ? (
          <Link href="/dashboard/tables" className="z-dashboard-link-card z-card">
            <p className="z-dashboard-card-label">{t(dict, "dashboard.tablesLabel")}</p>
            <h2>{t(dict, "dashboard.tablesTitle")}</h2>
            <p>{t(dict, "dashboard.tablesDescription")}</p>
          </Link>
        ) : null}

        {can(role, PERMISSIONS.ORDERS_READ) ? (
          <Link href="/dashboard/orders" className="z-dashboard-link-card z-card">
            <p className="z-dashboard-card-label">{t(dict, "dashboard.ordersLabel")}</p>
            <h2>{t(dict, "dashboard.ordersTitle")}</h2>
            <p>{t(dict, "dashboard.ordersDescription")}</p>
          </Link>
        ) : null}

        {can(role, PERMISSIONS.STAFF_READ) ? (
          <Link href="/dashboard/staff" className="z-dashboard-link-card z-card">
            <p className="z-dashboard-card-label">{t(dict, "dashboard.staffLabel")}</p>
            <h2>{t(dict, "dashboard.staffTitle")}</h2>
            <p>{t(dict, "dashboard.staffDescription")}</p>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
