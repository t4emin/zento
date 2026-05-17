"use client";

import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, t } from "@/lib/i18n";
import { useDashboardSession } from "@/components/providers/DashboardSessionProvider";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AppHeader() {
  const { dict, locale, setLocale } = useI18n();
  const { session } = useDashboardSession();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="z-header">
      <div>
        <strong>{t(dict, "dashboard.adminTitle")}</strong>
      </div>

      <div className="z-header-user">
        <div className="z-header-locale-switcher" aria-label="Language switcher">
          {SUPPORTED_LOCALES.map((nextLocale) => (
            <button
              key={nextLocale}
              type="button"
              className={`z-btn z-btn-secondary ${
                locale === nextLocale ? "z-header-locale-active" : ""
              }`}
              onClick={() => setLocale(nextLocale)}
            >
              {nextLocale.toUpperCase()}
            </button>
          ))}
        </div>
        <span>
          {session?.user?.name || t(dict, "dashboard.ownerLabel")} ·{" "}
          {t(dict, `roles.${session?.user?.role || "owner"}`)}
        </span>
        <button type="button" className="z-btn z-btn-secondary" onClick={handleLogout}>
          {t(dict, "common.logout")}
        </button>
      </div>
    </header>
  );
}
