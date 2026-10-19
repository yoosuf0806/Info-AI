import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function counts() {
  const admin = createSupabaseAdminClient();
  const [published, drafts, docs, downVotes, unanswered] = await Promise.all([
    admin
      .from("procedures")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    admin
      .from("procedures")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    admin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false),
    admin
      .from("queries")
      .select("id", { count: "exact", head: true })
      .eq("feedback", "down"),
    admin
      .from("queries")
      .select("id", { count: "exact", head: true })
      .eq("answered", false),
  ]);
  return {
    published: published.count ?? 0,
    drafts: drafts.count ?? 0,
    docs: docs.count ?? 0,
    downVotes: downVotes.count ?? 0,
    unanswered: unanswered.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const c = await counts();
  const cards = [
    { label: "Published procedures", value: c.published, href: "/admin/procedures" },
    { label: "Drafts", value: c.drafts, href: "/admin/procedures" },
    { label: "Active documents", value: c.docs, href: "/admin/documents" },
    { label: "👎 answers to review", value: c.downVotes, href: "/admin/feedback" },
    { label: "Unanswered questions", value: c.unanswered, href: "/admin/feedback" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
      <p className="text-ink-500 mt-1">
        Manage official content that powers citizen answers.
      </p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-600"
          >
            <div className="text-3xl font-bold text-brand-700">{card.value}</div>
            <div className="mt-1 text-sm text-ink-500">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/admin/procedures/new"
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
        >
          + New procedure
        </Link>
        <Link
          href="/admin/documents"
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-ink-700 hover:bg-white"
        >
          Upload a document
        </Link>
      </div>
    </div>
  );
}
