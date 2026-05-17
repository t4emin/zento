import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { DashboardSessionProvider } from "@/components/providers/DashboardSessionProvider";

export default function DashboardShell({ children, session }) {
  return (
    <DashboardSessionProvider session={session}>
      <div className="z-dashboard">
        <AppSidebar />

        <div className="z-dashboard-main">
          <AppHeader />

          <main className="z-dashboard-content">
            {children}
          </main>
        </div>
      </div>
    </DashboardSessionProvider>
  );
}
