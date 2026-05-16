"use client";

import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/providers/I18nProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import { createCustomerTableUrl, getConfiguredPublicAppUrl } from "@/lib/public-url";
import { formatText, t } from "@/lib/i18n";

function getClientOrigin() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

export default function TablesLauncher() {
  const { dict } = useI18n();
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [qrCodes, setQrCodes] = useState({});
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTables() {
      setIsLoading(true);
      setLoadMessage("");

      try {
        const response = await fetch("/api/tables", {
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

  useEffect(() => {
    let isMounted = true;

    async function generateQrCodes() {
      if (!restaurant?.slug || tables.length === 0) {
        setQrCodes({});
        return;
      }

      const preferredOrigin = getConfiguredPublicAppUrl() || getClientOrigin();

      try {
        const entries = await Promise.all(
          tables.map(async (table) => {
            const customerUrl = createCustomerTableUrl(restaurant.slug, table.code, preferredOrigin);
            const qrCodeDataUrl = await QRCode.toDataURL(customerUrl, {
              width: 280,
              margin: 1,
            });

            return [
              table.code,
              {
                customerUrl,
                qrCodeDataUrl,
              },
            ];
          })
        );

        if (!isMounted) {
          return;
        }

        setQrCodes(Object.fromEntries(entries));
      } catch {
        if (isMounted) {
          setActionMessage(t(dict, "tables.qrFailed"));
        }
      }
    }

    generateQrCodes();

    return () => {
      isMounted = false;
    };
  }, [dict, restaurant, tables]);

  async function handleCopyUrl(tableCode) {
    const tableMeta = qrCodes[tableCode];

    if (!tableMeta?.customerUrl || !navigator?.clipboard) {
      setActionMessage(t(dict, "tables.copyFailed"));
      return;
    }

    try {
      await navigator.clipboard.writeText(tableMeta.customerUrl);
      setActionMessage(
        formatText(t(dict, "tables.copySuccess"), {
          tableCode,
        })
      );
    } catch {
      setActionMessage(t(dict, "tables.copyFailed"));
    }
  }

  function handleDownloadQr(tableCode) {
    const tableMeta = qrCodes[tableCode];

    if (!tableMeta?.qrCodeDataUrl || typeof document === "undefined") {
      setActionMessage(t(dict, "tables.downloadFailed"));
      return;
    }

    const link = document.createElement("a");
    link.href = tableMeta.qrCodeDataUrl;
    link.download = `${restaurant?.slug || "restaurant"}-${tableCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionMessage(
      formatText(t(dict, "tables.downloadSuccess"), {
        tableCode,
      })
    );
  }

  return (
    <section className="z-dashboard-home z-tables-page">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">{t(dict, "tables.kicker")}</p>
        <h1>{t(dict, "tables.title")}</h1>
        <p className="z-dashboard-copy">{t(dict, "tables.description")}</p>
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "tables.loading")}</p> : null}
      {!isLoading && loadMessage ? <p className="z-dashboard-notice">{loadMessage}</p> : null}
      {actionMessage ? <p className="z-dashboard-notice">{actionMessage}</p> : null}

      <div className="z-dashboard-card-grid z-table-card-grid">
        {tables.map((table) => {
          const tableMeta = qrCodes[table.code];
          const customerUrl = tableMeta?.customerUrl || table.customerPath;

          return (
            <article key={table.code} className="z-card z-table-card">
              <div className="z-table-card-head">
                <div>
                  <p className="z-dashboard-card-label">{t(dict, "tables.cardLabel")}</p>
                  <h2>{table.code}</h2>
                  <p className="z-table-label">{table.label}</p>
                </div>
                <span className={`z-status-pill ${table.isActive ? "z-status-on" : "z-status-off"}`}>
                  {table.isActive ? t(dict, "common.available") : t(dict, "common.unavailable")}
                </span>
              </div>

              <div className="z-table-qr-frame">
                {tableMeta?.qrCodeDataUrl ? (
                  <Image
                    src={tableMeta.qrCodeDataUrl}
                    alt={formatText(t(dict, "tables.qrAlt"), { tableCode: table.code })}
                    className="z-table-qr-image"
                    width={220}
                    height={220}
                    unoptimized
                  />
                ) : (
                  <div className="z-table-qr-placeholder">{t(dict, "tables.generatingQr")}</div>
                )}
              </div>

              <div className="z-table-url-block">
                <span>{t(dict, "tables.customerUrlLabel")}</span>
                <code>{customerUrl}</code>
              </div>

              <div className="z-table-actions">
                <button
                  type="button"
                  className="z-btn z-btn-secondary"
                  onClick={() => handleCopyUrl(table.code)}
                >
                  {t(dict, "tables.copyUrl")}
                </button>
                <button
                  type="button"
                  className="z-btn z-btn-secondary"
                  onClick={() => handleDownloadQr(table.code)}
                >
                  {t(dict, "tables.downloadQr")}
                </button>
                <Link
                  href={table.customerPath}
                  className="z-btn z-btn-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(dict, "tables.openCustomer")}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
