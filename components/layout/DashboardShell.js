import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";

export default function DashboardShell({ children }) {
  return (
    <div className="z-dashboard">
      <AppSidebar />

      <div className="z-dashboard-main">
        <AppHeader />

        <main className="z-dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}