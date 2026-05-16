"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useI18n } from "@/components/providers/I18nProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import { t } from "@/lib/i18n";

const INITIAL_FORM = {
  restaurantName: "",
  restaurantSlug: "",
  ownerName: "",
  ownerEmail: "",
  password: "",
  tableCount: "10",
};

export default function SignupPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(name, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleSignup() {
    setErrorMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });
        const payload = await response.json();

        if (!response.ok) {
          setErrorMessage(getApiErrorMessage(payload, t(dict, "errors.signupFailed")));
          return;
        }

        router.push(payload.redirectTo || "/login");
        router.refresh();
      } catch {
        setErrorMessage(t(dict, "errors.signupFailed"));
      }
    });
  }

  return (
    <main className="z-login-page z-signup-page">
      <section className="z-login-card z-signup-card">
        <h1>{t(dict, "signup.title")}</h1>
        <p>{t(dict, "signup.subtitle")}</p>

        <form
          className="z-login-form z-signup-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSignup();
          }}
        >
          <div className="z-field">
            <span>{t(dict, "signup.fields.restaurantName")}</span>
            <input
              type="text"
              placeholder={t(dict, "signup.placeholders.restaurantName")}
              value={form.restaurantName}
              onChange={(event) => updateField("restaurantName", event.target.value)}
            />
          </div>

          <div className="z-field">
            <span>{t(dict, "signup.fields.restaurantSlug")}</span>
            <input
              type="text"
              placeholder={t(dict, "signup.placeholders.restaurantSlug")}
              value={form.restaurantSlug}
              onChange={(event) => updateField("restaurantSlug", event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="z-field">
            <span>{t(dict, "signup.fields.ownerName")}</span>
            <input
              type="text"
              placeholder={t(dict, "signup.placeholders.ownerName")}
              value={form.ownerName}
              onChange={(event) => updateField("ownerName", event.target.value)}
            />
          </div>

          <div className="z-field">
            <span>{t(dict, "signup.fields.ownerEmail")}</span>
            <input
              type="email"
              placeholder={t(dict, "signup.placeholders.ownerEmail")}
              value={form.ownerEmail}
              onChange={(event) => updateField("ownerEmail", event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="z-field">
            <span>{t(dict, "signup.fields.password")}</span>
            <input
              type="password"
              placeholder={t(dict, "signup.placeholders.password")}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
          </div>

          <div className="z-field">
            <span>{t(dict, "signup.fields.tableCount")}</span>
            <input
              type="number"
              min="1"
              max="100"
              placeholder={t(dict, "signup.placeholders.tableCount")}
              value={form.tableCount}
              onChange={(event) => updateField("tableCount", event.target.value)}
            />
          </div>

          <p className="z-signup-note">{t(dict, "signup.note")}</p>
          {errorMessage ? <p className="z-customer-error">{errorMessage}</p> : null}

          <button type="submit" disabled={isPending}>
            {isPending ? t(dict, "signup.submitting") : t(dict, "signup.submit")}
          </button>
        </form>

        <p className="z-auth-switch">
          {t(dict, "signup.haveAccount")}{" "}
          <Link href="/login">{t(dict, "common.login")}</Link>
        </p>
      </section>
    </main>
  );
}
