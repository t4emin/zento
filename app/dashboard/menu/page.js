import MenuManager from "@/components/dashboard/MenuManager";
import ForbiddenState from "@/components/dashboard/ForbiddenState";
import { getStaffSession } from "@/lib/auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export default async function DashboardMenuPage() {
  const session = await getStaffSession();

  if (!session || !can(session.user.role, PERMISSIONS.MENU_READ)) {
    return (
      <ForbiddenState
        descriptionKey="forbidden.menu"
      />
    );
  }

  return <MenuManager />;
}
