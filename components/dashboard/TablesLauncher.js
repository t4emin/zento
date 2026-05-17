"use client";

import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/providers/I18nProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import {
  createCustomerSessionUrl,
  createCustomerTableUrl,
  getConfiguredPublicAppUrl,
} from "@/lib/public-url";

const DEFAULT_BUFFET_DURATION_MINUTES = 90;

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

function getRestaurantType(restaurant) {
  return restaurant?.type === "buffet" ? "buffet" : "normal";
}

function getBuffetDurationMinutes(settings) {
  return settings?.buffetDurationMinutes || DEFAULT_BUFFET_DURATION_MINUTES;
}

function getRemainingMilliseconds(expiresAt, nowMs) {
  if (!expiresAt || !nowMs) {
    return null;
  }

  return new Date(expiresAt).getTime() - nowMs;
}

function formatRemainingTime(milliseconds, dict) {
  if (milliseconds === null) {
    return "";
  }

  if (milliseconds <= 0) {
    return t(dict, "tables.remainingExpired");
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildPrintSheetHref(restaurantType, printType) {
  const resolvedType =
    printType || (restaurantType === "buffet" ? "session" : "table");

  return `/dashboard/tables/print?type=${resolvedType}`;
}

export default function TablesLauncher() {
  const { dict } = useI18n();
  const durationInputRef = useRef(null);
  const [restaurant, setRestaurant] = useState(null);
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    buffetDurationMinutes: String(DEFAULT_BUFFET_DURATION_MINUTES),
  });
  const [settingsErrors, setSettingsErrors] = useState({});
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isOpeningAllSessions, setIsOpeningAllSessions] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [qrCodes, setQrCodes] = useState({});
  const [actionMessage, setActionMessage] = useState("");
  const [pendingTableCode, setPendingTableCode] = useState("");
  const [pendingSessionCode, setPendingSessionCode] = useState("");
  const [nowMs, setNowMs] = useState(0);

  const restaurantType = getRestaurantType(restaurant);
  const isBuffetRestaurant = restaurantType === "buffet";
  const buffetDurationMinutes = getBuffetDurationMinutes(settings);
  const activeSessionCount = tables.filter((table) => table.activeSession).length;
  const activeTables = tables.filter((table) => table.isActive);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const applyTablesPayload = useCallback((payload) => {
    setRestaurant(payload.restaurant);
    setSettings(payload.settings || null);
    setSettingsForm({
      buffetDurationMinutes: String(
        payload.settings?.buffetDurationMinutes || DEFAULT_BUFFET_DURATION_MINUTES
      ),
    });
    setTables(payload.tables);
    setLoadMessage(t(dict, "tables.loaded"));
  }, [dict]);

  const requestTablesPayload = useCallback(async () => {
    const response = await fetch("/api/tables", {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload, "Failed to load tables API"));
    }

    return payload;
  }, []);

  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setLoadMessage("");

    try {
      const payload = await requestTablesPayload();
      applyTablesPayload(payload);
    } catch (error) {
      setRestaurant(null);
      setSettings(null);
      setTables([]);
      setLoadMessage(error.message || t(dict, "tables.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [applyTablesPayload, dict, requestTablesPayload]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialTables() {
      setIsLoading(true);
      setLoadMessage("");

      try {
        const payload = await requestTablesPayload();

        if (!isMounted) {
          return;
        }

        applyTablesPayload(payload);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRestaurant(null);
        setSettings(null);
        setTables([]);
        setLoadMessage(error.message || t(dict, "tables.loadFailed"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialTables().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [applyTablesPayload, dict, requestTablesPayload]);

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

    generateQrCodes().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [dict, restaurant, tables]);

  function updateSettingsField(fieldName, value) {
    setSettingsForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  }

  function validateSettingsForm() {
    const nextErrors = {};
    const rawDurationValue = String(settingsForm.buffetDurationMinutes || "").trim();

    if (rawDurationValue) {
      const parsedDurationValue = Number.parseInt(rawDurationValue, 10);

      if (
        !Number.isInteger(parsedDurationValue) ||
        parsedDurationValue < 30 ||
        parsedDurationValue > 240
      ) {
        nextErrors.buffetDurationMinutes = t(dict, "tables.durationValidation");
      }
    }

    setSettingsErrors(nextErrors);

    if (nextErrors.buffetDurationMinutes && durationInputRef.current) {
      durationInputRef.current.focus();
      durationInputRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return false;
    }

    return true;
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    setActionMessage("");

    if (!validateSettingsForm()) {
      return;
    }

    setIsSavingSettings(true);

    try {
      const normalizedDurationValue = String(settingsForm.buffetDurationMinutes || "").trim();
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buffetDurationMinutes:
            normalizedDurationValue || DEFAULT_BUFFET_DURATION_MINUTES,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setActionMessage(getApiErrorMessage(payload, t(dict, "tables.durationUpdateFailed")));
        return;
      }

      setSettings(payload.settings);
      setSettingsForm({
        buffetDurationMinutes: String(
          payload.settings?.buffetDurationMinutes || DEFAULT_BUFFET_DURATION_MINUTES
        ),
      });
      setActionMessage(
        formatText(t(dict, "tables.durationUpdated"), {
          duration: payload.settings?.buffetDurationMinutes || DEFAULT_BUFFET_DURATION_MINUTES,
        })
      );
    } catch {
      setActionMessage(t(dict, "tables.durationUpdateFailed"));
    } finally {
      setIsSavingSettings(false);
    }
  }

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

  function handleDownloadQr(tableCode, qrType = "table") {
    const tableMeta = qrCodes[tableCode];
    const qrCodeDataUrl =
      qrType === "session" ? tableMeta?.sessionQrCodeDataUrl : tableMeta?.qrCodeDataUrl;
    const downloadLabel = qrType === "session" ? "session" : "table";

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
      qrType === "session"
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

  async function handleOpenSessionsForAllTables() {
    setIsOpeningAllSessions(true);
    setActionMessage("");
    let openedCount = 0;

    try {
      for (const table of activeTables) {
        const response = await fetch(`/api/tables/${table.code}/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          openedCount += 1;
        }
      }

      await loadTables();
      setActionMessage(
        formatText(t(dict, "tables.openAllSessionsSuccess"), {
          count: openedCount,
        })
      );
    } catch {
      setActionMessage(t(dict, "tables.openAllSessionsFailed"));
    } finally {
      setIsOpeningAllSessions(false);
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

  return (
    <section className="z-dashboard-home z-tables-page">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">{t(dict, "tables.kicker")}</p>
        <h1>{t(dict, "tables.title")}</h1>
        <p className="z-dashboard-copy">{t(dict, "tables.description")}</p>
      </div>

      <div className="z-dashboard-card-grid">
        <div className="z-menu-summary z-card">
          <strong>{tables.length}</strong>
          <span>{t(dict, "tables.totalTables")}</span>
        </div>
        <div className="z-menu-summary z-card">
          <strong>{activeSessionCount}</strong>
          <span>{t(dict, "tables.activeSessionsCount")}</span>
        </div>
        <div className="z-menu-summary z-card">
          <strong>{t(dict, `restaurantTypes.${restaurantType}`)}</strong>
          <span>{t(dict, "tables.restaurantTypeSummary")}</span>
        </div>
      </div>

      <div className="z-card z-mode-settings-card">
        <div className="z-panel-heading">
          <h2>{t(dict, "tables.typeTitle")}</h2>
          <p>{t(dict, "tables.typeDescription")}</p>
        </div>

        <div className="z-table-session-copy">
          <p>
            {formatText(t(dict, "tables.typeValue"), {
              type: t(dict, `restaurantTypes.${restaurantType}`),
            })}
          </p>
          <p>{t(dict, `tables.typeGuidance.${restaurantType}`)}</p>
        </div>

        {isBuffetRestaurant ? (
          <form className="z-menu-form" onSubmit={handleSaveSettings}>
            <label className="z-field">
              <span>
                {t(dict, "tables.buffetDurationLabel")}
                <span className="z-field-required"> *</span>
              </span>
              <input
                ref={durationInputRef}
                type="number"
                min="30"
                max="240"
                value={settingsForm.buffetDurationMinutes}
                onChange={(event) =>
                  updateSettingsField("buffetDurationMinutes", event.target.value)
                }
                className={settingsErrors.buffetDurationMinutes ? "z-input-error" : ""}
              />
              {settingsErrors.buffetDurationMinutes ? (
                <p className="z-field-error-text">{settingsErrors.buffetDurationMinutes}</p>
              ) : null}
            </label>

            <div className="z-mode-guidance">
              <p>
                {formatText(t(dict, "tables.buffetDurationValue"), {
                  duration: buffetDurationMinutes,
                })}
              </p>
            </div>

            <div className="z-form-actions">
              <button
                type="submit"
                className="z-btn z-btn-primary"
                disabled={isSavingSettings}
              >
                {isSavingSettings ? t(dict, "menu.statuses.saving") : t(dict, "common.save")}
              </button>
              <Link
                href={buildPrintSheetHref(restaurantType, "session")}
                className="z-btn z-btn-secondary"
                target="_blank"
                rel="noreferrer"
              >
                {t(dict, "tables.printQrSheet")}
              </Link>
              <button
                type="button"
                className="z-btn z-btn-secondary"
                disabled={isOpeningAllSessions || activeTables.length === 0}
                onClick={handleOpenSessionsForAllTables}
              >
                {isOpeningAllSessions
                  ? t(dict, "tables.openingAllSessions")
                  : t(dict, "tables.openSessionsForAllTables")}
              </button>
            </div>
          </form>
        ) : (
          <div className="z-form-actions">
            <Link
              href={buildPrintSheetHref(restaurantType, "table")}
              className="z-btn z-btn-secondary"
              target="_blank"
              rel="noreferrer"
            >
              {t(dict, "tables.printQrSheet")}
            </Link>
            <Link
              href={buildPrintSheetHref(restaurantType, "table")}
              className="z-btn z-btn-secondary"
              target="_blank"
              rel="noreferrer"
            >
              {t(dict, "tables.generateAllTableQrs")}
            </Link>
          </div>
        )}
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "tables.loading")}</p> : null}
      {!isLoading && loadMessage ? <p className="z-dashboard-notice">{loadMessage}</p> : null}
      {actionMessage ? <p className="z-dashboard-notice">{actionMessage}</p> : null}

      <div className="z-dashboard-card-grid z-table-card-grid">
        {tables.map((table) => {
          const tableMeta = qrCodes[table.code];
          const customerUrl = tableMeta?.customerUrl || table.customerPath;
          const sessionUrl =
            tableMeta?.sessionCustomerUrl || table.activeSession?.customerPath || "";
          const remainingMilliseconds = getRemainingMilliseconds(
            table.activeSession?.expiresAt,
            nowMs
          );
          const isSessionExpired =
            table.activeSession?.status === "expired" ||
            (remainingMilliseconds !== null && remainingMilliseconds <= 0);
          const shouldShowSessionPanel = isBuffetRestaurant || Boolean(table.activeSession);

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

              {!isBuffetRestaurant ? (
                <section className="z-table-qr-section">
                  <div className="z-table-section-head">
                    <div>
                      <p className="z-dashboard-card-label">{t(dict, "tables.permanentQrTitle")}</p>
                      <h3>{t(dict, "tables.permanentQrSubtitle")}</h3>
                    </div>
                    <span className="z-status-pill z-status-on">{t(dict, "tables.permanentQrBadge")}</span>
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
                    {t(dict, "tables.tableHint.normal")}
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
                </section>
              ) : (
                <div className="z-empty-state">
                  <h3>{t(dict, "tables.buffetPrimaryTitle")}</h3>
                  <p>{t(dict, "tables.buffetPrimaryDescription")}</p>
                </div>
              )}

              {shouldShowSessionPanel ? (
                <div className="z-table-session-panel">
                  <div className="z-table-section-head">
                    <div>
                      <p className="z-dashboard-card-label">{t(dict, "tables.sessionQrTitle")}</p>
                      <h3>
                        {table.activeSession?.code || t(dict, "tables.noActiveSessionTitle")}
                      </h3>
                    </div>
                    <span
                      className={`z-status-pill ${
                        table.activeSession
                          ? isSessionExpired
                            ? "z-status-off"
                            : "z-status-on"
                          : "z-status-off"
                      }`}
                    >
                      {table.activeSession
                        ? isSessionExpired
                          ? t(dict, "tables.expiredSession")
                          : t(dict, "tables.sessionActive")
                        : t(dict, "tables.noActiveSessionBadge")}
                    </span>
                  </div>

                  {table.activeSession ? (
                    <>
                      <div className="z-table-session-copy">
                        <p>
                          {formatText(t(dict, "tables.sessionStartedAt"), {
                            startedAt: formatDateTime(table.activeSession.startedAt),
                          })}
                        </p>
                        {table.activeSession.expiresAt ? (
                          <>
                            <p>
                              {formatText(t(dict, "tables.sessionExpiresAt"), {
                                expiresAt: formatDateTime(table.activeSession.expiresAt),
                              })}
                            </p>
                            <p>
                              {formatText(t(dict, "tables.remainingTime"), {
                                remainingTime: formatRemainingTime(remainingMilliseconds, dict),
                              })}
                            </p>
                          </>
                        ) : null}
                        {table.activeSession.customerCount ? (
                          <p>
                            {formatText(t(dict, "tables.sessionCustomerCount"), {
                              count: table.activeSession.customerCount,
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

                      <p className="z-table-mode-hint">
                        {t(dict, `tables.sessionHint.${restaurantType}`)}
                      </p>

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

                  {isBuffetRestaurant ? (
                    <button
                      type="button"
                      className="z-btn z-btn-primary"
                      disabled={!table.isActive || pendingTableCode === table.code}
                      onClick={() => handleOpenNewSession(table.code)}
                    >
                      {pendingTableCode === table.code
                        ? t(dict, "tables.openingSession")
                        : t(dict, "tables.openDiningSession")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
