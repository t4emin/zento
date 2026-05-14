"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-client";

const ORDER_STATUSES = ["new", "preparing", "served", "cancelled"];
const DEMO_RESTAURANT_NAME = "Zento Demo Restaurant";

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

function mapBackendOrder(order, restaurantSlug) {
  return {
    id: order.id,
    restaurantSlug,
    tableCode: order.table.code,
    items: order.orderItems.map((item) => ({
      id: item.menuItemId || item.id,
      name: item.itemNameSnapshot,
      price: item.unitPriceSnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    total: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt,
  };
}

export default function OrdersQueue() {
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
        const response = await fetch("/api/orders?restaurantSlug=demo", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load orders API"));
        }

        const apiOrders = payload.orders.map((order) =>
          mapBackendOrder(order, payload.restaurant.slug)
        );

        if (!isMounted) {
          return;
        }

        setOrders(sortOrdersNewestFirst(apiOrders));
        setLoadMessage("Loaded orders from the backend API.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOrders([]);
        setLoadMessage(error.message || "Unable to load orders from the backend API.");
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
  }, []);

  async function handleStatusChange(orderId, nextStatus) {
    setStatusMessage("");
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, "Unable to update order status."));
        return;
      }

      const nextOrders = sortOrdersNewestFirst(
        orders.map((order) =>
          order.id === orderId ? mapBackendOrder(payload.order, order.restaurantSlug) : order
        )
      );

      setOrders(nextOrders);
      setStatusMessage(`Order ${orderId} updated to ${nextStatus}.`);
    } catch {
      setStatusMessage("Unable to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <section className="z-dashboard-home">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">Orders</p>
        <h1>Staff Orders Queue</h1>
        <p className="z-dashboard-copy">
          Review submitted customer orders, track their status, and verify the end-to-end
          demo flow for {DEMO_RESTAURANT_NAME}.
        </p>
      </div>

      {isLoading ? <p className="z-dashboard-notice">Loading orders...</p> : null}
      {!isLoading && loadMessage ? (
        <p className="z-dashboard-notice">{loadMessage}</p>
      ) : null}

      {!isLoading && orders.length === 0 ? (
        <div className="z-orders-empty z-card">
          <h2>No orders yet</h2>
          <p>
            Submit an order from a demo customer table first, then come back here to
            review it.
          </p>
          <Link href="/dashboard/tables" className="z-btn z-btn-primary">
            Open Demo Tables
          </Link>
        </div>
      ) : !isLoading ? (
        <div className="z-orders-queue">
          {statusMessage ? <p className="z-form-message">{statusMessage}</p> : null}

          {orders.map((order) => (
            <article key={order.id} className="z-order-card z-card">
              <div className="z-order-card-head">
                <div>
                  <p className="z-dashboard-card-label">Table {order.tableCode}</p>
                  <h2>{order.restaurantSlug}</h2>
                  <p className="z-order-meta">{formatCreatedAt(order.createdAt)}</p>
                </div>

                <div className="z-order-summary">
                  <span
                    className={`z-status-pill ${`z-status-${order.status}`}`}
                  >
                    {order.status}
                  </span>
                  <strong>{formatPrice(order.total)}</strong>
                </div>
              </div>

              <div className="z-order-items">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.id}`} className="z-order-item-row">
                    <div>
                      <strong>{item.name}</strong>
                      <p>Qty {item.quantity}</p>
                    </div>
                    <span>{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="z-order-footer">
                <div className="z-order-total-line">
                  <span>Total</span>
                  <strong>{formatPrice(order.total)}</strong>
                </div>

                <label className="z-order-status-control">
                  <span>Status</span>
                  <select
                    value={order.status}
                    disabled={updatingOrderId === order.id}
                    onChange={(event) =>
                      handleStatusChange(order.id, event.target.value)
                    }
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
