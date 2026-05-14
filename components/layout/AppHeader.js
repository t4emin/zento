"use client";

import { SUPPORTED_LOCALES, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AppHeader() {
  const { dict, locale, setLocale } = useI18n();

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
        <span>{t(dict, "dashboard.ownerLabel")}</span>
      </div>
    </header>
  );
}
