import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "FiscalFlow - POS Journal to Excel Converter",
  description: "Turn your monthly receipt export into a clean Excel spreadsheet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-ink font-body antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
