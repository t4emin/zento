import CustomerMenu from "@/components/customer/CustomerMenu";

export default async function CustomerTablePage({ params }) {
  const { restaurantSlug, tableCode } = await params;

  return (
    <CustomerMenu restaurantSlug={restaurantSlug} tableCode={tableCode} />
  );
}
