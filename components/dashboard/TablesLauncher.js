"use client";

import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/providers/I18nProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  createCustomerSessionUrl,
  createCustomerTableUrl,
  getConfiguredPublicAppUrl,
} from "@/lib/public-url";
import { formatText, t } from "@/lib/i18n";

function getClientOrigin() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TablesLauncher() {
  const { dict } = useI18n();
  const [restaurant, setRestaurant] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [qrCodes, setQrCodes] = useState({});
  const [actionMessage, setActionMessage] = useState("");
  const [pendingTableCode, setPendingTableCode] = useState("");
  const [pendingSessionCode, setPendingSessionCode] = useState("");

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

      setRestaurant(payload.restaurant);
      setSettings(payload.settings || null);
      setTables(payload.tables);
      setLoadMessage(t(dict, "tables.loaded"));
    } catch (error) {
      setRestaurant(null);
      setSettings(null);
      setTables([]);
      setLoadMessage(error.message || t(dict, "tables.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTables().catch(() => {});
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
            let sessionCustomerUrl = "";
            let sessionQrCodeDataUrl = "";

            if (table.activeSession?.code) {
              sessionCustomerUrl = createCustomerSessionUrl(
                restaurant.slug,
                table.activeSession.code,
                preferredOrigin
              );
              sessionQrCodeDataUrl = await QRCode.toDataURL(sessionCustomerUrl, {
                width: 280,
                margin: 1,
              });
            }

            return [
              table.code,
              {
                customerUrl,
                qrCodeDataUrl,
                sessionCustomerUrl,
                sessionQrCodeDataUrl,
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

  async function copyText(value, message) {
    if (!value || !navigator?.clipboard) {
      setActionMessage(t(dict, "tables.copyFailed"));
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setActionMessage(message);
    } catch {
      setActionMessage(t(dict, "tables.copyFailed"));
    }
  }

  async function handleCopyUrl(tableCode) {
    const tableMeta = qrCodes[tableCode];

    await copyText(
      tableMeta?.customerUrl,
      formatText(t(dict, "tables.copySuccess"), {
        tableCode,
      })
    );
  }

  async function handleCopySessionUrl(tableCode) {
    const table = tables.find((entry) => entry.code === tableCode);
    const tableMeta = qrCodes[tableCode];

    await copyText(
      tableMeta?.sessionCustomerUrl,
      formatText(t(dict, "tables.copySessionSuccess"), {
        tableCode,
        sessionCode: table?.activeSession?.code || "",
      })
    );
  }

  function handleDownloadQr(tableCode, mode = "table") {
    const tableMeta = qrCodes[tableCode];
    const qrCodeDataUrl = mode === "session" ? tableMeta?.sessionQrCodeDataUrl : tableMeta?.qrCodeDataUrl;
    const downloadLabel = mode === "session" ? "session" : "table";

    if (!qrCodeDataUrl || typeof document === "undefined") {
      setActionMessage(t(dict, "tables.downloadFailed"));
      return;
    }

    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `${restaurant?.slug || "restaurant"}-${tableCode}-${downloadLabel}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionMessage(
      mode === "session"
        ? formatText(t(dict, "tables.downloadSessionSuccess"), {
            tableCode,
          })
        : formatText(t(dict, "tables.downloadSuccess"), {
            tableCode,
          })
    );
  }

  async function handleOpenNewSession(tableCode) {
    setPendingTableCode(tableCode);
    setActionMessage("");

    try {
      const response = await fetch(`/api/tables/${tableCode}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json();

      if (!response.ok) {
        setActionMessage(getApiErrorMessage(payload, t(dict, "tables.openSessionFailed")));
        return;
      }

      setActionMessage(
        formatText(t(dict, "tables.openSessionSuccess"), {
          tableCode,
          sessionCode: payload.session.code,
        })
      );
      await loadTables();
    } catch {
      setActionMessage(t(dict, "tables.openSessionFailed"));
    } finally {
      setPendingTableCode("");
    }
  }

  async function handleCloseSession(sessionCode) {
    setPendingSessionCode(sessionCode);
    setActionMessage("");

    try {
      const response = await fetch(`/api/sessions/${sessionCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "closed",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setActionMessage(getApiErrorMessage(payload, t(dict, "tables.closeSessionFailed")));
        return;
      }

      setActionMessage(
        formatText(t(dict, "tables.closeSessionSuccess"), {
          sessionCode,
        })
      );
      await loadTables();
    } catch {
      setActionMessage(t(dict, "tables.closeSessionFailed"));
    } finally {
      setPendingSessionCode("");
    }
  }

  async function handleModeChange(nextMode) {
    setActionMessage("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: nextMode,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setActionMessage(getApiErrorMessage(payload, t(dict, "tables.modeUpdateFailed")));
        return;
      }

      setSettings(payload.settings);
      setActionMessage(
        formatText(t(dict, "tables.modeUpdated"), {
          mode: t(dict, `tables.modes.${payload.settings.mode}`),
        })
      );
    } catch {
      setActionMessage(t(dict, "tables.modeUpdateFailed"));
    }
  }

  return (
    <section className="z-dashboard-home z-tables-page">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">{t(dict, "tables.kicker")}</p>
        <h1>{t(dict, "tables.title")}</h1>
        <p className="z-dashboard-copy">{t(dict, "tables.description")}</p>
      </div>

      <div className="z-card z-mode-settings-card">
        <div className="z-panel-heading">
          <h2>{t(dict, "tables.modeTitle")}</h2>
          <p>{t(dict, "tables.modeDescription")}</p>
        </div>

        <label className="z-field">
          <span>{t(dict, "tables.modeField")}</span>
          <select
            value={settings?.mode || "normal"}
            onChange={(event) => handleModeChange(event.target.value)}
          >
            <option value="normal">{t(dict, "tables.modes.normal")}</option>
            <option value="buffet">{t(dict, "tables.modes.buffet")}</option>
            <option value="hybrid">{t(dict, "tables.modes.hybrid")}</option>
          </select>
        </label>

        <div className="z-mode-guidance">
          <p>{t(dict, `tables.modeGuidance.${settings?.mode || "normal"}`)}</p>
        </div>
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "tables.loading")}</p> : null}
      {!isLoading && loadMessage ? <p className="z-dashboard-notice">{loadMessage}</p> : null}
      {actionMessage ? <p className="z-dashboard-notice">{actionMessage}</p> : null}

      <div className="z-dashboard-card-grid z-table-card-grid">
        {tables.map((table) => {
          const tableMeta = qrCodes[table.code];
          const customerUrl = tableMeta?.customerUrl || table.customerPath;
          const sessionUrl = tableMeta?.sessionCustomerUrl || table.activeSession?.customerPath || "";

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

              <p className="z-table-mode-hint">
                {t(dict, `tables.tableHint.${settings?.mode || "normal"}`)}
              </p>

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

              <div className="z-table-session-panel">
                <div className="z-table-session-head">
                  <div>
                    <p className="z-dashboard-card-label">{t(dict, "tables.sessionLabel")}</p>
                    <h3>
                      {table.activeSession?.code || t(dict, "tables.noActiveSessionTitle")}
                    </h3>
                  </div>
                  {table.activeSession ? (
                    <span className="z-status-pill z-status-on">
                      {t(dict, "tables.sessionActive")}
                    </span>
                  ) : null}
                </div>

                {table.activeSession ? (
                  <>
                    <div className="z-table-session-copy">
                      <p>
                        {formatText(t(dict, "tables.sessionStartedAt"), {
                          startedAt: formatDateTime(table.activeSession.startedAt),
                        })}
                      </p>
                      {table.activeSession.customerCount ? (
                        <p>
                          {formatText(t(dict, "tables.sessionCustomerCount"), {
                            count: table.activeSession.customerCount,
                          })}
                        </p>
                      ) : null}
                      {table.activeSession.expiresAt ? (
                        <p>
                          {formatText(t(dict, "tables.sessionExpiresAt"), {
                            expiresAt: formatDateTime(table.activeSession.expiresAt),
                          })}
                        </p>
                      ) : null}
                      {table.activeSession.note ? (
                        <p>
                          {formatText(t(dict, "tables.sessionNote"), {
                            note: table.activeSession.note,
                          })}
                        </p>
                      ) : null}
                    </div>

                    <div className="z-table-qr-frame z-table-session-qr">
                      {tableMeta?.sessionQrCodeDataUrl ? (
                        <Image
                          src={tableMeta.sessionQrCodeDataUrl}
                          alt={formatText(t(dict, "tables.sessionQrAlt"), {
                            tableCode: table.code,
                            sessionCode: table.activeSession.code,
                          })}
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
                      <span>{t(dict, "tables.sessionUrlLabel")}</span>
                      <code>{sessionUrl}</code>
                    </div>

                    <div className="z-table-actions">
                      <button
                        type="button"
                        className="z-btn z-btn-secondary"
                        onClick={() => handleCopySessionUrl(table.code)}
                      >
                        {t(dict, "tables.copySessionUrl")}
                      </button>
                      <button
                        type="button"
                        className="z-btn z-btn-secondary"
                        onClick={() => handleDownloadQr(table.code, "session")}
                      >
                        {t(dict, "tables.downloadSessionQr")}
                      </button>
                      <Link
                        href={sessionUrl}
                        className="z-btn z-btn-primary"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t(dict, "tables.openSession")}
                      </Link>
                      <button
                        type="button"
                        className="z-btn z-btn-secondary"
                        disabled={pendingSessionCode === table.activeSession.code}
                        onClick={() => handleCloseSession(table.activeSession.code)}
                      >
                        {pendingSessionCode === table.activeSession.code
                          ? t(dict, "tables.closingSession")
                          : t(dict, "tables.closeSession")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="z-empty-state">
                    <h3>{t(dict, "tables.noActiveSessionTitle")}</h3>
                    <p>{t(dict, "tables.noActiveSessionDescription")}</p>
                  </div>
                )}

                <p className="z-table-mode-hint">
                  {t(dict, `tables.sessionHint.${settings?.mode || "normal"}`)}
                </p>

                <button
                  type="button"
                  className="z-btn z-btn-primary"
                  disabled={!table.isActive || pendingTableCode === table.code}
                  onClick={() => handleOpenNewSession(table.code)}
                >
                  {pendingTableCode === table.code
                    ? t(dict, "tables.openingSession")
                    : t(dict, "tables.openNewSession")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
