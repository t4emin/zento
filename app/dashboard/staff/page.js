import ForbiddenState from "@/components/dashboard/ForbiddenState";
import StaffManager from "@/components/dashboard/StaffManager";
import { getStaffSession } from "@/lib/auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export default async function DashboardStaffPage() {
  const session = await getStaffSession();

  if (!session || !can(session.user.role, PERMISSIONS.STAFF_READ)) {
    return (
      <ForbiddenState
        descriptionKey="forbidden.staff"
      />
    );
  }

  return <StaffManager />;
}
