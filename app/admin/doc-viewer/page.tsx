"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function AdminDocViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const url = searchParams.get("url");
  const name = searchParams.get("name") || "Document";

  if (!url) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-xs text-slate-400">
          Missing document URL. Close this tab and try again.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => router.back()}
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
            // remove this next line if you want it to fit instead of be big:
            width: "900px",
            height: "auto",
          }}
        />
      </div>
    </main>
  );
}
