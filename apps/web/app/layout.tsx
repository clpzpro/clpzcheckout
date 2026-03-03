import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cpay",
  description: "Plataforma SaaS para checkout customizavel"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
