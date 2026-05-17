"use client";

import { t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ReceiptPrintButton() {
  const { dict } = useI18n();

  return (
    <button
      type="button"
      className="z-btn z-btn-primary"
      onClick={() => window.print()}
    >
      {t(dict, "receipt.print")}
    </button>
  );
}
