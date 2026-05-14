import "@/styles/css/main.css";

import { I18nProvider } from "@/components/providers/I18nProvider";

export const metadata = {
  title: "Zento",
  description: "QR Ordering SaaS for restaurants",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
