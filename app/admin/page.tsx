// app/admin/page.tsx

"use client";

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Deadhead Zero – Admin Portal
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Master control for loads, documents, fraud review, and platform
            tools. Only visible to you as the admin.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Load Operations */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Load Operations
            </h2>
            <div className="space-y-3 text-sm">
              <AdminLink
                href="/admin/loads/new"
                title="Create New Load"
                description="Generate a new load, auto-create a token, and email the carrier a secure upload link for BOL / POD."
              />
              <AdminLink
                href="/admin/loads"
                title="All Loads"
                description="View all loads, filter by status, search by reference or carrier, and drill into docs for any lane."
              />
              <AdminLink
                href="/admin/docs"
                title="Document Review Queue"
                description="Review all uploaded documents from carriers, see Grok fraud scores, approve/reject, and promote into load_documents."
              />
            </div>
          </section>

          {/* Documents & Fraud Ops */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Documents &amp; Fraud
            </h2>
            <div className="space-y-3 text-sm">
              <AdminLink
                href="/admin/docs?status=pending"
                title="Pending Docs (High Attention)"
                description="Jump straight to the pending document queue and clear uploads waiting for approval."
              />
              <AdminLink
                href="/admin/docs?status=all"
                title="All Docs (Audit Trail)"
                description="View all documents regardless of status, along with Grok fraud labels and scores."
              />
            </div>
          </section>

          {/* Carrier / Upload Tools */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Carrier / Upload Tools
            </h2>
            <div className="space-y-3 text-sm">
              <AdminLink
                href="/admin/loads/new"
                title="Generate Upload Link"
                description="Use the new load form to generate a fresh token + carrier upload portal for any lane."
              />
              <div className="text-xs text-slate-400 border border-slate-800 rounded-xl px-3 py-2">
                <div className="font-semibold text-slate-200 mb-1">
                  Carrier upload URL pattern
                </div>
                <code className="font-mono text-[11px] break-all">
                  https://your-domain.com/carrier/load-docs/
                  {"{token}"}
                </code>
                <p className="mt-1">
                  This is the link emailed to carriers. Use the load creation
                  form instead of hand-building these.
                </p>
              </div>
            </div>
          </section>

          {/* 🧮 Revenue & Margin */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Revenue &amp; Margin
            </h2>
            <div className="space-y-3 text-sm">
              <AdminLink
                href="/admin/reports/margin"
                title="Margin Overview"
                description="See monthly totals for shipper billed, carrier pay, and margin across paid loads."
              />
              <AdminLink
                href="/admin/loads?paid_status=unpaid"
                title="Unpaid / Outstanding Loads"
                description="Filter your loads board down to work that hasn't been marked paid yet."
              />
            </div>
          </section>

          {/* Platform Tools */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Platform Tools
            </h2>
            <div className="space-y-3 text-sm">
              <ExternalLink
                href="https://app.supabase.com"
                title="Supabase Dashboard"
                description="Inspect tables (loads, pending_documents, load_documents), run SQL, and view logs."
              />
              <ExternalLink
                href="https://vercel.com"
                title="Vercel Dashboard"
                description="Manage deployments, environment variables, and domains for Deadhead Zero."
              />
              <ExternalLink
                href="https://dashboard.stripe.com"
                title="Stripe Dashboard"
                description="View subscriptions, invoices, and payments for Reefer Whisper and future products."
              />
              <ExternalLink
                href="https://resend.com/dashboard"
                title="Resend Dashboard"
                description="Monitor outbound emails, deliverability, and any carrier/upload messages."
              />
            </div>
          </section>
        </div>

        <p className="mt-8 text-[11px] text-slate-500">
          All admin routes under <code className="font-mono">/admin</code> are
          protected by HTTP Basic Auth using{" "}
          <code className="font-mono">ADMIN_USERNAME</code> and{" "}
          <code className="font-mono">ADMIN_PASSWORD</code> environment
          variables. Update these in Vercel to rotate your master admin login.
        </p>
      </div>
    </div>
  );
}

type CardProps = {
  href: string;
  title: string;
  description: string;
};

function AdminLink({ href, title, description }: CardProps) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 hover:border-emerald-400/70 hover:bg-slate-900 transition"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-slate-100 text-sm font-medium">{title}</div>
          <p className="text-[11px] text-slate-400 mt-1">{description}</p>
        </div>
        <span className="text-[11px] text-emerald-300">Go →</span>
      </div>
    </Link>
  );
}

function ExternalLink({ href, title, description }: CardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 hover:border-emerald-400/70 hover:bg-slate-900 transition"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-slate-100 text-sm font-medium">{title}</div>
          <p className="text-[11px] text-slate-400 mt-1">{description}</p>
        </div>
        <span className="text-[11px] text-emerald-300">Open ↗</span>
      </div>
    </a>
  );
}
