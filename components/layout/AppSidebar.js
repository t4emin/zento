import Link from "next/link";

export default function AppSidebar() {
  return (
    <aside className="z-sidebar">
      <div className="z-sidebar-brand">Zento</div>

      <nav className="z-sidebar-nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/dashboard/menu">Menu</Link>
        <Link href="/dashboard/tables">Tables</Link>
        <Link href="/dashboard/orders">Orders</Link>
      </nav>
    </aside>
  );
}