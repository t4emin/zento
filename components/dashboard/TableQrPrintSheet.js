"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/providers/I18nProvider";
import { formatText, t } from "@/lib/i18n";

function getPrintSheetItems(tables, printType) {
  if (printType === "session") {
    return tables
      .filter((table) => table.activeSession?.customerPath)
      .map((table) => ({
        key: `${table.code}-${table.activeSession.code}`,
        tableCode: table.code,
        tableLabel: table.label,
        title: table.activeSession.code,
        url: table.activeSession.customerUrl || table.activeSession.customerPath,
        urlLabel: table.activeSession.customerPath,
        type: "session",
      }));
  }

  return tables.map((table) => ({
    key: table.code,
    tableCode: table.code,
    tableLabel: table.label,
    title: table.code,
    url: table.customerUrl || table.customerPath,
    urlLabel: table.customerPath,
    type: "table",
  }));
}

export default function TableQrPrintSheet({
  restaurant,
  settings,
  tables,
  printType = "table",
}) {
  const { dict } = useI18n();
  const [qrCodes, setQrCodes] = useState({});
  const items = useMemo(() => getPrintSheetItems(tables, printType), [tables, printType]);

  useEffect(() => {
    let isMounted = true;

    async function generateQrCodes() {
      if (items.length === 0) {
        setQrCodes({});
        return;
      }

      const entries = await Promise.all(
        items.map(async (item) => {
          const qrCodeDataUrl = await QRCode.toDataURL(item.url, {
            width: 320,
            margin: 1,
          });

          return [item.key, qrCodeDataUrl];
        })
      );

      if (!isMounted) {
        return;
      }

      setQrCodes(Object.fromEntries(entries));
    }

    generateQrCodes().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [items]);

  return (
    <main className="z-dashboard-home z-print-sheet-page">
      <div className="z-receipt-actions z-card">
        <div>
          <p className="z-dashboard-kicker">{t(dict, "tables.printQrSheet")}</p>
          <h1>{restaurant.name}</h1>
          <p className="z-dashboard-copy">
            {formatText(
              t(
                dict,
                printType === "session"
                  ? "tables.printSheetSessionDescription"
                  : "tables.printSheetTableDescription"
              ),
              {
                count: items.length,
              }
            )}
          </p>
        </div>

        <div className="z-receipt-action-row">
          <Link href="/dashboard/tables" className="z-btn z-btn-secondary">
            {t(dict, "forbidden.backToDashboard")}
          </Link>
          <button
            type="button"
            className="z-btn z-btn-primary"
            onClick={() => window.print()}
          >
            {t(dict, "receipt.print")}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="z-empty-state z-card">
          <h2>{t(dict, "tables.printSheetEmptyTitle")}</h2>
          <p>{t(dict, "tables.printSheetEmptyDescription")}</p>
        </div>
      ) : (
        <div className="z-print-sheet-grid">
          {items.map((item) => (
            <article key={item.key} className="z-card z-print-sheet-card">
              <p className="z-dashboard-card-label">
                {item.type === "session"
                  ? t(dict, "tables.sessionQr")
                  : t(dict, "tables.permanentQr")}
              </p>
              <h2>{item.title}</h2>
              <p className="z-table-label">{item.tableLabel}</p>
              <div className="z-table-qr-frame">
                {qrCodes[item.key] ? (
                  <Image
                    src={qrCodes[item.key]}
                    alt={item.title}
                    className="z-table-qr-image"
                    width={320}
                    height={320}
                    unoptimized
                  />
                ) : (
                  <div className="z-table-qr-placeholder">{t(dict, "tables.generatingQr")}</div>
                )}
              </div>
              <code className="z-print-sheet-url">{item.urlLabel || item.url}</code>
              {printType === "session" ? (
                <p className="z-table-mode-hint">
                  {formatText(t(dict, "tables.buffetDurationValue"), {
                    duration: settings?.buffetDurationMinutes || 90,
                  })}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
