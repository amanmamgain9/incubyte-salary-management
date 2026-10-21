import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ACME Salary Management",
  description: "Employee records, salary history and pay reports for HR.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
