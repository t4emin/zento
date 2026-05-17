"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useDashboardSession } from "@/components/providers/DashboardSessionProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

const ORDER_STATUSES = ["new", "preparing", "served", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "pending_review", "paid"];

function formatPrice(price) {
  return `฿${price}`;
}

function formatCreatedAt(createdAt) {
  const date = new Date(createdAt);

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sortOrdersNewestFirst(orders) {
  return [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function mapBackendOrder(order, restaurant) {
  return {
    id: order.id,
    restaurantName: restaurant?.name || "",
    tableCode: order.table.code,
    tableLabel: order.table.label || order.table.code,
    sessionCode: order.orderSession?.code || "",
    note: order.note || "",
    paymentStatus: order.paymentStatus || "unpaid",
    items: order.orderItems.map((item) => ({
      lineId: item.id,
      id: item.menuItemId || item.id,
      name: item.itemNameSnapshot,
      price: item.unitPriceSnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      selectedOptionsSnapshot: Array.isArray(item.selectedOptionsSnapshot)
        ? item.selectedOptionsSnapshot
        : [],
    })),
    total: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt,
  };
}

export default function OrdersQueue() {
  const { dict } = useI18n();
  const { session } = useDashboardSession();
  const [orders, setOrders] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);
      setLoadMessage("");

      try {
        const response = await fetch("/api/orders", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load orders API"));
        }

        const apiOrders = payload.orders.map((order) =>
          mapBackendOrder(order, payload.restaurant)
        );

        if (!isMounted) {
          return;
        }

        setOrders(sortOrdersNewestFirst(apiOrders));
        setLoadMessage(t(dict, "orders.loaded"));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOrders([]);
        setLoadMessage(error.message || t(dict, "orders.loadFailed"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [dict]);

  async function updateOrder(orderId, nextPayload) {
    setStatusMessage("");
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextPayload),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, t(dict, "orders.updateFailed")));
        return;
      }

      const nextOrders = sortOrdersNewestFirst(
        orders.map((order) =>
          order.id === orderId ? mapBackendOrder(payload.order, { name: order.restaurantName }) : order
        )
      );

      setOrders(nextOrders);
      setStatusMessage(
        nextPayload.paymentStatus
          ? formatText(t(dict, "orders.paymentUpdated"), {
              orderId,
              paymentStatus: t(
                dict,
                `orders.paymentStatuses.${nextPayload.paymentStatus}`,
                nextPayload.paymentStatus
              ),
            })
          : formatText(t(dict, "orders.updated"), {
              orderId,
              status: t(dict, `orders.statuses.${nextPayload.status}`, nextPayload.status),
            })
      );
    } catch {
      setStatusMessage(
        nextPayload.paymentStatus ? t(dict, "orders.paymentUpdateFailed") : t(dict, "orders.updateFailed")
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleStatusChange(orderId, nextStatus) {
    await updateOrder(orderId, { status: nextStatus });
  }

  async function handlePaymentStatusChange(orderId, nextPaymentStatus) {
    await updateOrder(orderId, { paymentStatus: nextPaymentStatus });
  }

  return (
    <section className="z-dashboard-home">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">{t(dict, "orders.kicker")}</p>
        <h1>{t(dict, "orders.title")}</h1>
        <p className="z-dashboard-copy">
          {formatText(t(dict, "orders.description"), {
            restaurantName: session?.restaurant?.name || t(dict, "common.demoRestaurantName"),
          })}
        </p>
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "orders.loading")}</p> : null}
      {!isLoading && loadMessage ? (
        <p className="z-dashboard-notice">{loadMessage}</p>
      ) : null}

      {!isLoading && orders.length === 0 ? (
        <div className="z-orders-empty z-card">
          <h2>{t(dict, "orders.emptyTitle")}</h2>
          <p>
            {t(dict, "orders.emptyDescription")}
          </p>
          <Link href="/dashboard/tables" className="z-btn z-btn-primary">
            {t(dict, "orders.openTables")}
          </Link>
        </div>
      ) : !isLoading ? (
        <div className="z-orders-queue">
          {statusMessage ? <p className="z-form-message">{statusMessage}</p> : null}

          {orders.map((order) => (
            <article key={order.id} className="z-order-card z-card">
              <div className="z-order-card-head">
                <div>
                  <p className="z-dashboard-card-label">{order.tableLabel}</p>
                  <h2>{order.restaurantName || order.tableCode}</h2>
                  {order.sessionCode ? <p className="z-order-meta">{t(dict, "orders.session")}: {order.sessionCode}</p> : null}
                  <p className="z-order-meta">{formatCreatedAt(order.createdAt)}</p>
                </div>

                <div className="z-order-summary">
                  <span
                    className={`z-status-pill ${`z-status-${order.status}`}`}
                  >
                    {order.status}
                  </span>
                  <span className={`z-status-pill ${`z-payment-${order.paymentStatus}`}`}>
                    {t(dict, `orders.paymentStatuses.${order.paymentStatus}`, order.paymentStatus)}
                  </span>
                  <strong>{formatPrice(order.total)}</strong>
                </div>
              </div>

              {order.note ? (
                <div className="z-order-note">
                  <strong>{t(dict, "orders.customerNote")}</strong>
                  <p>{order.note}</p>
                </div>
              ) : null}

              <div className="z-order-items">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.lineId}`} className="z-order-item-row">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{formatText(t(dict, "orders.qty"), { quantity: item.quantity })}</p>
                      {item.selectedOptionsSnapshot.map((group) => (
                        <p key={`${order.id}-${item.id}-${group.groupName}`}>
                          {group.groupName}: {group.items.map((optionItem) => optionItem.name).join(", ")}
                        </p>
                      ))}
                    </div>
                    <span>{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="z-order-footer">
                <div className="z-order-total-line">
                  <span>{t(dict, "common.total")}</span>
                  <strong>{formatPrice(order.total)}</strong>
                </div>

                <div className="z-order-controls">
                  <label className="z-order-status-control">
                    <span>{t(dict, "orders.statusLabel")}</span>
                    <select
                      value={order.status}
                      disabled={updatingOrderId === order.id}
                      onChange={(event) =>
                        handleStatusChange(order.id, event.target.value)
                      }
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(dict, `orders.statuses.${status}`, status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="z-order-status-control">
                    <span>{t(dict, "orders.paymentStatusLabel")}</span>
                    <select
                      value={order.paymentStatus}
                      disabled={updatingOrderId === order.id}
                      onChange={(event) =>
                        handlePaymentStatusChange(order.id, event.target.value)
                      }
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(dict, `orders.paymentStatuses.${status}`, status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Link
                    href={`/dashboard/orders/${order.id}/receipt`}
                    className="z-btn z-btn-secondary"
                  >
                    {t(dict, "orders.viewReceipt")}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
