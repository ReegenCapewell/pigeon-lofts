import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./AuthProvider";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "Pigeon Lofts Manager",
  description: "Racing pigeon loft & bird manager for Dad",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
