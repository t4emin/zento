import ForbiddenState from "@/components/dashboard/ForbiddenState";
import TableQrPrintSheet from "@/components/dashboard/TableQrPrintSheet";
import { getStaffSession } from "@/lib/auth";
import { expireOrderSessionIfNeeded } from "@/lib/order-sessions";
import { can, PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  createCustomerSessionUrl,
  createCustomerTableUrl,
  getConfiguredPublicAppUrl,
} from "@/lib/public-url";
import { createCustomerSessionPath, createCustomerTablePath } from "@/lib/restaurants";

export default async function DashboardTablesPrintPage({ searchParams }) {
  const session = await getStaffSession();

  if (!session || !can(session.user.role, PERMISSIONS.TABLES_READ)) {
    return <ForbiddenState descriptionKey="forbidden.tables" />;
  }

  const resolvedSearchParams = await searchParams;
  const restaurant = session.restaurant;
  const requestedType =
    resolvedSearchParams?.type === "session"
      ? "session"
      : restaurant.type === "buffet"
        ? "session"
        : "table";
  const publicAppUrl = getConfiguredPublicAppUrl();
  let settings = null;

  try {
    settings = await prisma.restaurantSettings.findUnique({
      where: {
        restaurantId: restaurant.id,
      },
      select: {
        buffetDurationMinutes: true,
        currency: true,
        timezone: true,
      },
    });
  } catch {
    settings = null;
  }
  const tables = await prisma.table.findMany({
    where: {
      restaurantId: restaurant.id,
    },
    orderBy: [{ code: "asc" }],
    select: {
      id: true,
      code: true,
      label: true,
      isActive: true,
      orderSessions: {
        where: {
          status: "active",
        },
        orderBy: [{ startedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          code: true,
          status: true,
          customerCount: true,
          note: true,
          startedAt: true,
          expiresAt: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const normalizedTables = await Promise.all(
    tables.map(async (table) => {
      const [candidateSession] = table.orderSessions;
      const activeSession = candidateSession
        ? await expireOrderSessionIfNeeded(prisma, candidateSession)
        : null;

      return {
        id: table.id,
        code: table.code,
        label: table.label,
        isActive: table.isActive,
        customerPath: createCustomerTablePath(restaurant.slug, table.code),
        customerUrl: createCustomerTableUrl(restaurant.slug, table.code, publicAppUrl),
        activeSession:
          activeSession?.status === "active"
            ? {
                ...activeSession,
                customerPath: createCustomerSessionPath(restaurant.slug, activeSession.code),
                customerUrl: createCustomerSessionUrl(
                  restaurant.slug,
                  activeSession.code,
                  publicAppUrl
                ),
              }
            : null,
      };
    })
  );

  return (
    <TableQrPrintSheet
      restaurant={restaurant}
      settings={settings}
      tables={normalizedTables}
      printType={requestedType}
    />
  );
}
