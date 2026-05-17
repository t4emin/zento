import OrdersQueue from "@/components/orders/OrdersQueue";
import ForbiddenState from "@/components/dashboard/ForbiddenState";
import { getStaffSession } from "@/lib/auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export default async function DashboardOrdersPage() {
  const session = await getStaffSession();

  if (!session || !can(session.user.role, PERMISSIONS.ORDERS_READ)) {
    return (
      <ForbiddenState
        descriptionKey="forbidden.orders"
      />
    );
  }

  return <OrdersQueue />;
}
