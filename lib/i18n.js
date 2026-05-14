import { en } from "@/locales/en";
import { th } from "@/locales/th";

export const DEFAULT_LOCALE = "th";
export const SUPPORTED_LOCALES = ["th", "en"];
export const LOCALE_STORAGE_KEY = "zento_locale";
export const LOCALE_CHANGE_EVENT = "zento:locale-change";

const DICTIONARIES = {
  th,
  en,
};

export function getDictionary(locale = DEFAULT_LOCALE) {
  return DICTIONARIES[SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE];
}

export function getStoredLocale() {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_LOCALE;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);

  return SUPPORTED_LOCALES.includes(storedLocale) ? storedLocale : DEFAULT_LOCALE;
}

export function setStoredLocale(locale) {
  const nextLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

  if (typeof window === "undefined" || !window.localStorage) {
    return nextLocale;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent(LOCALE_CHANGE_EVENT, {
        detail: { locale: nextLocale },
      })
    );
  }

  return nextLocale;
}

export function getCurrentLocale() {
  return getStoredLocale();
}

export function t(dictionary, path, fallback = path) {
  const value = path.split(".").reduce((currentValue, key) => {
    if (currentValue && typeof currentValue === "object" && key in currentValue) {
      return currentValue[key];
    }

    return undefined;
  }, dictionary);

  return typeof value === "string" ? value : fallback;
}

export function formatText(template, values = {}) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
