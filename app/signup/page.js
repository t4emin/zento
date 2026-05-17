"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

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
  const [fieldErrors, setFieldErrors] = useState({});
  const fieldRefs = {
    restaurantName: useRef(null),
    restaurantSlug: useRef(null),
    ownerName: useRef(null),
    ownerEmail: useRef(null),
    password: useRef(null),
    tableCount: useRef(null),
  };

  function updateField(name, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function validateForm() {
    const nextFieldErrors = {};

    if (!form.restaurantName.trim()) {
      nextFieldErrors.restaurantName = t(dict, "signup.validation.restaurantNameRequired");
    }

    if (!form.restaurantSlug.trim()) {
      nextFieldErrors.restaurantSlug = t(dict, "signup.validation.restaurantSlugRequired");
    }

    if (!form.ownerName.trim()) {
      nextFieldErrors.ownerName = t(dict, "signup.validation.ownerNameRequired");
    }

    if (!form.ownerEmail.trim()) {
      nextFieldErrors.ownerEmail = t(dict, "signup.validation.ownerEmailRequired");
    }

    if (!form.password) {
      nextFieldErrors.password = t(dict, "signup.validation.passwordRequired");
    }

    const parsedTableCount = Number.parseInt(form.tableCount, 10);
    if (!Number.isInteger(parsedTableCount) || parsedTableCount < 1 || parsedTableCount > 100) {
      nextFieldErrors.tableCount = t(dict, "signup.validation.tableCountInvalid");
    }

    setFieldErrors(nextFieldErrors);

    const firstInvalidField = Object.keys(nextFieldErrors)[0];

    if (firstInvalidField && fieldRefs[firstInvalidField]?.current) {
      fieldRefs[firstInvalidField].current.focus();
      fieldRefs[firstInvalidField].current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return false;
    }

    return true;
  }

  function handleSignup() {
    setErrorMessage("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

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
            <span>
              {t(dict, "signup.fields.restaurantName")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={fieldRefs.restaurantName}
              type="text"
              placeholder={t(dict, "signup.placeholders.restaurantName")}
              value={form.restaurantName}
              onChange={(event) => updateField("restaurantName", event.target.value)}
              className={fieldErrors.restaurantName ? "z-input-error" : ""}
            />
            {fieldErrors.restaurantName ? (
              <p className="z-field-error-text">{fieldErrors.restaurantName}</p>
            ) : null}
          </div>

          <div className="z-field">
            <span>
              {t(dict, "signup.fields.restaurantSlug")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={fieldRefs.restaurantSlug}
              type="text"
              placeholder={t(dict, "signup.placeholders.restaurantSlug")}
              value={form.restaurantSlug}
              onChange={(event) => updateField("restaurantSlug", event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className={fieldErrors.restaurantSlug ? "z-input-error" : ""}
            />
            {fieldErrors.restaurantSlug ? (
              <p className="z-field-error-text">{fieldErrors.restaurantSlug}</p>
            ) : null}
          </div>

          <div className="z-field">
            <span>
              {t(dict, "signup.fields.ownerName")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={fieldRefs.ownerName}
              type="text"
              placeholder={t(dict, "signup.placeholders.ownerName")}
              value={form.ownerName}
              onChange={(event) => updateField("ownerName", event.target.value)}
              className={fieldErrors.ownerName ? "z-input-error" : ""}
            />
            {fieldErrors.ownerName ? <p className="z-field-error-text">{fieldErrors.ownerName}</p> : null}
          </div>

          <div className="z-field">
            <span>
              {t(dict, "signup.fields.ownerEmail")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={fieldRefs.ownerEmail}
              type="email"
              placeholder={t(dict, "signup.placeholders.ownerEmail")}
              value={form.ownerEmail}
              onChange={(event) => updateField("ownerEmail", event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className={fieldErrors.ownerEmail ? "z-input-error" : ""}
            />
            {fieldErrors.ownerEmail ? (
              <p className="z-field-error-text">{fieldErrors.ownerEmail}</p>
            ) : null}
          </div>

          <div className="z-field">
            <span>
              {t(dict, "signup.fields.password")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={fieldRefs.password}
              type="password"
              placeholder={t(dict, "signup.placeholders.password")}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              className={fieldErrors.password ? "z-input-error" : ""}
            />
            {fieldErrors.password ? <p className="z-field-error-text">{fieldErrors.password}</p> : null}
          </div>

          <div className="z-field">
            <span>
              {t(dict, "signup.fields.tableCount")}
              <span className="z-field-required"> *</span>
            </span>
            <input
              ref={fieldRefs.tableCount}
              type="number"
              min="1"
              max="100"
              placeholder={t(dict, "signup.placeholders.tableCount")}
              value={form.tableCount}
              onChange={(event) => updateField("tableCount", event.target.value)}
              className={fieldErrors.tableCount ? "z-input-error" : ""}
            />
            {fieldErrors.tableCount ? (
              <p className="z-field-error-text">{fieldErrors.tableCount}</p>
            ) : null}
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
