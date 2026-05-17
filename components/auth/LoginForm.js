"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/components/providers/I18nProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import { t } from "@/lib/i18n";

export default function LoginForm({ hasRegistered = false, registeredEmail = "" }) {
  const { dict } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [email, setEmail] = useState(registeredEmail || "demo@zento.dev");
  const [password, setPassword] = useState(registeredEmail ? "" : "demo1234");
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  function validateForm() {
    const nextFieldErrors = {};

    if (!email.trim()) {
      nextFieldErrors.email = t(dict, "auth.validation.emailRequired");
    }

    if (!password) {
      nextFieldErrors.password = t(dict, "auth.validation.passwordRequired");
    }

    setFieldErrors(nextFieldErrors);

    const firstInvalidField = Object.keys(nextFieldErrors)[0];
    const fieldRefMap = {
      email: emailRef,
      password: passwordRef,
    };

    if (firstInvalidField && fieldRefMap[firstInvalidField]?.current) {
      fieldRefMap[firstInvalidField].current.focus();
      fieldRefMap[firstInvalidField].current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return false;
    }

    return true;
  }

  function handleLogin() {
    setErrorMessage("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

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
          setErrorMessage(getApiErrorMessage(payload, t(dict, "errors.loginFailed")));
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } catch {
        setErrorMessage(t(dict, "errors.loginFailed"));
      }
    });
  }

  return (
    <main className="z-login-page">
      <section className="z-login-card">
        <h1>{t(dict, "auth.title")}</h1>
        <p>{t(dict, "auth.subtitle")}</p>
        {hasRegistered ? <p className="z-form-message">{t(dict, "auth.signupSuccess")}</p> : null}

        <form
          className="z-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}
        >
          <label className="z-field">
            <span>
              {t(dict, "auth.fields.email")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={emailRef}
              type="email"
              placeholder={t(dict, "auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldErrors.email ? "z-input-error" : ""}
            />
            {fieldErrors.email ? <p className="z-field-error-text">{fieldErrors.email}</p> : null}
          </label>
          <label className="z-field">
            <span>
              {t(dict, "auth.fields.password")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={passwordRef}
              type="password"
              placeholder={t(dict, "auth.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldErrors.password ? "z-input-error" : ""}
            />
            {fieldErrors.password ? <p className="z-field-error-text">{fieldErrors.password}</p> : null}
          </label>
          {errorMessage ? <p className="z-customer-error">{errorMessage}</p> : null}
          <button type="submit" disabled={isPending}>
            {isPending ? t(dict, "auth.signingIn") : t(dict, "common.login")}
          </button>
        </form>

        <p className="z-auth-switch">
          {t(dict, "auth.noAccount")} <Link href="/signup">{t(dict, "common.signup")}</Link>
        </p>
      </section>
    </main>
  );
}
