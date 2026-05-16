import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const registeredEmail = String(resolvedSearchParams?.email || "").trim();
  const hasRegistered = resolvedSearchParams?.registered === "1";

  return <LoginForm hasRegistered={hasRegistered} registeredEmail={registeredEmail} />;
}
