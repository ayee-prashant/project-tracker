import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Development Status Portal",
  description: "Manage delivery tickets, owners, status, ETA and team progress.",
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
