"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("demo@zento.dev");
  const [password, setPassword] = useState("demo1234");

  function handleLogin() {
    setErrorMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          setErrorMessage(getApiErrorMessage(payload, "Unable to login right now."));
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } catch {
        setErrorMessage("Unable to login right now.");
      }
    });
  }

  return (
    <main className="z-login-page">
      <section className="z-login-card">
        <h1>Login</h1>
        <p>เข้าสู่ระบบ Zento Dashboard</p>

        <form
          className="z-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {errorMessage ? <p className="z-customer-error">{errorMessage}</p> : null}
          <button type="submit" disabled={isPending}>
            {isPending ? "Signing In..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
