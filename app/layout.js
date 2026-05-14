import "@/styles/css/main.css";

export const metadata = {
  title: "Zento",
  description: "QR Ordering SaaS for restaurants",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
