import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIVIQ | Urban Intelligence Layer",
  description: "Turn citizen reports into live, prioritized problem zones and connect them with organizations ready to act.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
