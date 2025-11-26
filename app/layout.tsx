import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Deadhead Zero Reefer Whisper",
  description: "One reefer text every morning. The lane edge before the herd wakes up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="text-center text-xs opacity-60 py-8">
          Technology platform only, not a broker or load board. We never hold freight dollars.
          <br />
          Operated by Deadhead Zero Logistics LLC
        </footer>
      </body>
    </html>
  );
}
