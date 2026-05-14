import Link from "next/link";

export default function DashboardPage() {
  return (
    <section className="z-dashboard-home">
      <div className="z-dashboard-home-hero z-card">
        <p className="z-dashboard-kicker">Admin Dashboard</p>
        <h1>Zento Demo Control Center</h1>
        <p className="z-dashboard-copy">
          Use this dashboard to manage the demo menu, open table links, and review
          incoming orders once the next MVP slices are connected.
        </p>
      </div>

      <div className="z-dashboard-card-grid">
        <Link href="/dashboard/menu" className="z-dashboard-link-card z-card">
          <p className="z-dashboard-card-label">Menu Management</p>
          <h2>Manage menu items</h2>
          <p>Create, update, and remove menu items for the customer demo flow.</p>
        </Link>

        <Link href="/dashboard/tables" className="z-dashboard-link-card z-card">
          <p className="z-dashboard-card-label">Tables</p>
          <h2>Open demo tables</h2>
          <p>Review table links such as `/r/demo/table/T01` for testing.</p>
        </Link>

        <Link href="/dashboard/orders" className="z-dashboard-link-card z-card">
          <p className="z-dashboard-card-label">Orders</p>
          <h2>Check submitted orders</h2>
          <p>Monitor the demo order queue as customer ordering is added.</p>
        </Link>
      </div>
    </section>
  );
}
