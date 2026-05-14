"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_LOCALE,
  getDictionary,
  getStoredLocale,
  LOCALE_CHANGE_EVENT,
  LOCALE_STORAGE_KEY,
  setStoredLocale,
} from "@/lib/i18n";

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  dict: getDictionary(DEFAULT_LOCALE),
  setLocale: () => {},
});

export function I18nProvider({ children }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getStoredLocale,
    () => DEFAULT_LOCALE
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo(() => {
    function setLocale(nextLocale) {
      setStoredLocale(nextLocale);
    }

    return {
      locale,
      dict: getDictionary(locale),
      setLocale,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

function subscribeToLocale(onLocaleChange) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event) {
    if (!event.key || event.key === LOCALE_STORAGE_KEY) {
      onLocaleChange();
    }
  }

  function handleLocaleChange() {
    onLocaleChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  };
}
