"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AdminDocViewerPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>("Document");

  // Read query params on the client only
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const u = params.get("url");
    const n = params.get("name");
    if (u) setUrl(u);
    if (n) setName(n);
  }, []);

  const goBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  // While we don't have a URL yet (SSR / initial render), show a simple message
  if (!url) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-xs text-slate-400">
          Loading document viewer… If this message stays, close this tab and try
          again.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 text-xs">
        <button
          type="button"
          onClick={goBack}
          className="text-slate-400 hover:text-emerald-300"
        >
          ← Back
        </button>
        <div className="mx-4 truncate text-slate-300">{name}</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-emerald-300"
        >
          Open raw
        </a>
      </header>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <img
          src={url}
          alt={name}
          className="shadow-2xl rounded-lg"
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            width: "900px", // large by default
            height: "auto",
          }}
        />
      </div>
    </main>
  );
}
