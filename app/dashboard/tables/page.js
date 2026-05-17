import TablesLauncher from "@/components/dashboard/TablesLauncher";
import ForbiddenState from "@/components/dashboard/ForbiddenState";
import { getStaffSession } from "@/lib/auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export default async function DashboardTablesPage() {
  const session = await getStaffSession();

  if (!session || !can(session.user.role, PERMISSIONS.TABLES_READ)) {
    return (
      <ForbiddenState
        descriptionKey="forbidden.tables"
      />
    );
  }

  return <TablesLauncher />;
}
