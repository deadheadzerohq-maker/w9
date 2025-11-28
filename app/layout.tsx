import "./globals.css";
import type { Metadata } from "next";
import React from "react";

const portalUrl = process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL ?? "#";

export const metadata: Metadata = {
  title: "Deadhead Zero Reefer Whisper",
  description:
    "One reefer text every morning. The lane edge before the herd wakes up.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>

        <footer className="text-center text-xs opacity-60 py-8 space-y-2">
          <p>
            Technology platform only, not a broker or load board. We never hold
            freight dollars.
          </p>
          <p>Operated by Deadhead Zero Logistics LLC</p>

          <div className="flex items-center justify-center gap-4">
            <a
              href="/terms"
              className="underline underline-offset-4 hover:opacity-100"
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:opacity-100"
            >
              Privacy Policy
            </a>
            <a
              href={portalUrl}
              className="underline underline-offset-4 hover:opacity-100"
            >
              Manage Billing
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
