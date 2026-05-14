"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

export default function TablesLauncher() {
  const { dict } = useI18n();
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTables() {
      setIsLoading(true);
      setLoadMessage("");

      try {
        const response = await fetch("/api/tables?restaurantSlug=demo", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load tables API"));
        }

        if (!isMounted) {
          return;
        }

        setRestaurant(payload.restaurant);
        setTables(payload.tables);
        setLoadMessage(t(dict, "tables.loaded"));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRestaurant(null);
        setTables([]);
        setLoadMessage(error.message || t(dict, "tables.loadFailed"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTables();

    return () => {
      isMounted = false;
    };
  }, [dict]);

  return (
    <section className="z-dashboard-home">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">{t(dict, "tables.kicker")}</p>
        <h1>{t(dict, "tables.title")}</h1>
        <p className="z-dashboard-copy">
          {t(dict, "tables.description")}
        </p>
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "tables.loading")}</p> : null}
      {!isLoading && loadMessage ? (
        <p className="z-dashboard-notice">{loadMessage}</p>
      ) : null}

      <div className="z-dashboard-card-grid">
        {tables.map((table) => (
          <Link
            key={table.code}
            href={`/r/${restaurant?.slug || "demo"}/table/${table.code}`}
            className="z-dashboard-link-card z-card"
          >
            <p className="z-dashboard-card-label">{t(dict, "tables.cardLabel")}</p>
            <h2>{table.code}</h2>
            <p>
              {formatText(t(dict, "tables.openDescription"), {
                restaurantName: restaurant?.name || t(dict, "common.demoRestaurantName"),
              })}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
