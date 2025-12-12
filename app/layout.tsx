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
            Deadhead Zero Logistics LLC is a technology platform and a licensed
            freight broker (MC 1782185).
          </p>
          <p>
            Reefer Whisper is an informational SMS product only and does not
            arrange freight. Brokerage services are offered separately through
            Deadhead Zero Logistics LLC. Freight payments are processed through
            third-party payment partners; we do not hold freight funds.
          </p>

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
