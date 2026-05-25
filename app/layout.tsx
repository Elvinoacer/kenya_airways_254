import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./ClientProviders";

export const metadata: Metadata = {
  title: "Kenya Airways - Ticketing & passenger Portal",
  description:
    "Secure passenger ticketing portal for Kenya Airways. Manage passenger identity details, active sessions, and secure Two-Factor Authentication credentials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-slate-50">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
