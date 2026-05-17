import Link from "next/link";

import ForbiddenState from "@/components/dashboard/ForbiddenState";
import ReceiptPrintButton from "@/components/dashboard/ReceiptPrintButton";
import { getStaffSession } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { can, PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { en } from "@/locales/en";
import { th } from "@/locales/th";

function formatPrice(price) {
  return `฿${price}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDictionary(locale) {
  return locale === "en" ? en : th;
}

function getLocaleFromSearchParams(searchParams) {
  if (searchParams?.lang === "en") {
    return "en";
  }

  return "th";
}

export default async function DashboardOrderReceiptPage({ params, searchParams }) {
  const session = await getStaffSession();

  if (!session || !can(session.user.role, PERMISSIONS.ORDERS_READ)) {
    return <ForbiddenState descriptionKey="forbidden.orders" />;
  }

  const { id } = await params;
  const locale = getLocaleFromSearchParams(await searchParams);
  const dict = getDictionary(locale);

  const order = await prisma.order.findFirst({
    where: {
      id,
      restaurantId: session.user.restaurantId,
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      table: {
        select: {
          id: true,
          code: true,
          label: true,
        },
      },
      orderSession: {
        select: {
          id: true,
          code: true,
          status: true,
        },
      },
      orderItems: {
        orderBy: [{ id: "asc" }],
        select: {
          id: true,
          itemNameSnapshot: true,
          unitPriceSnapshot: true,
          quantity: true,
          lineTotal: true,
          selectedOptionsSnapshot: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="z-dashboard-home z-receipt-page">
      <div className="z-receipt-actions z-card">
        <div>
          <p className="z-dashboard-kicker">{t(dict, "receipt.kicker")}</p>
          <h1>{t(dict, "receipt.title")}</h1>
          <p className="z-dashboard-copy">{t(dict, "receipt.description")}</p>
        </div>
        <div className="z-receipt-action-row">
          <Link href="/dashboard/orders" className="z-btn z-btn-secondary">
            {t(dict, "receipt.backToOrders")}
          </Link>
          <ReceiptPrintButton />
        </div>
      </div>

      <article className="z-receipt-card z-card">
        <header className="z-receipt-header">
          <div>
            <h2>{order.restaurant.name}</h2>
            <p>{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="z-receipt-meta">
            <p>{t(dict, "receipt.orderId")}: {order.id}</p>
            <p>{t(dict, "receipt.table")}: {order.table.label || order.table.code}</p>
            {order.orderSession?.code ? (
              <p>{t(dict, "receipt.session")}: {order.orderSession.code}</p>
            ) : null}
            <p>{t(dict, "receipt.paymentStatus")}: {t(dict, `orders.paymentStatuses.${order.paymentStatus}`)}</p>
          </div>
        </header>

        <section className="z-receipt-items">
          {order.orderItems.map((item) => (
            <div key={item.id} className="z-receipt-item">
              <div className="z-receipt-item-head">
                <div>
                  <strong>{item.itemNameSnapshot}</strong>
                  <p>{t(dict, "receipt.quantity")}: {item.quantity}</p>
                </div>
                <strong>{formatPrice(item.lineTotal)}</strong>
              </div>
              {Array.isArray(item.selectedOptionsSnapshot)
                ? item.selectedOptionsSnapshot.map((group) => (
                    <p key={`${item.id}-${group.groupName}`} className="z-receipt-option-line">
                      {group.groupName}: {group.items.map((optionItem) => optionItem.name).join(", ")}
                    </p>
                  ))
                : null}
            </div>
          ))}
        </section>

        {order.note ? (
          <section className="z-receipt-note">
            <h3>{t(dict, "receipt.customerNote")}</h3>
            <p>{order.note}</p>
          </section>
        ) : null}

        <footer className="z-receipt-footer">
          <div className="z-receipt-total-line">
            <span>{t(dict, "common.total")}</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </div>
          <p>{t(dict, "receipt.generatedFromDashboard")}</p>
        </footer>
      </article>
    </main>
  );
}
