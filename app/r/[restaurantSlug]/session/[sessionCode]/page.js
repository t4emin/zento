import CustomerMenu from "@/components/customer/CustomerMenu";

export default async function CustomerSessionPage({ params }) {
  const { restaurantSlug, sessionCode } = await params;

  return (
    <CustomerMenu
      restaurantSlug={restaurantSlug}
      sessionCode={sessionCode}
      orderingMode="session"
    />
  );
}
