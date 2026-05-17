"use client";

import Link from "next/link";

import { t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ForbiddenState({
  titleKey = "forbidden.title",
  descriptionKey = "forbidden.description",
  showHomeLink = true,
}) {
  const { dict } = useI18n();

  return (
    <section className="z-dashboard-home">
      <div className="z-orders-empty z-card">
        <h1>{t(dict, titleKey)}</h1>
        <p>{t(dict, descriptionKey)}</p>
        {showHomeLink ? (
          <Link href="/dashboard" className="z-btn z-btn-primary">
            {t(dict, "forbidden.backToDashboard")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
