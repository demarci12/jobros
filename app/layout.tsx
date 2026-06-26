import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobro",
  description: "HVAC field service management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
