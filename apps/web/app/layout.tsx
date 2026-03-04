import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "clpzcheckout",
  description: "Painel de checkout"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
