import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Deadhead Zero Reefer Whisper",
  description: "One reefer text every morning. The lane edge before the herd wakes up."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased min-h-screen flex flex-col">

        <header className="flex flex-col items-center text-center pt-24 pb-12 px-4 space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight">Deadhead Zero Reefer Whisper</h1>
          <p className="text-xl opacity-80">
            One reefer text every morning.
            <br/>
            <span className="text-base opacity-70 font-mono">
              Reefer Alert: California northbound tightening fast Thu/Fri – lettuce and strawberry volume +18% and carrier count down. Expect $4.50+ easy. – Deadhead Zero
            </span>
          </p>
        </header>

        <main className="flex-1 w-full">
          {children}
        </main>

        <footer className="text-center text-xs opacity-60 py-10">
          Technology platform only, not a broker or load board. We never hold freight dollars.
        </footer>

      </body>
    </html>
  );
}
