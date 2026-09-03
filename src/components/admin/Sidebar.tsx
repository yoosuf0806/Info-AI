"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/procedures", label: "Procedures" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/suggested-questions", label: "Suggested Questions" },
  { href: "/admin/feedback", label: "Feedback & Insights" },
];

export default function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="font-bold text-brand-800">InfoAI.LK</div>
        <div className="text-xs text-ink-500">Officer Admin</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-ink-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        {email && (
          <div className="px-3 pb-2 text-xs text-ink-500 truncate">{email}</div>
        )}
        <button
          onClick={signOut}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-slate-50"
        >
          Sign out
        </button>
        <a
          href="/"
          className="mt-1 block rounded-lg px-3 py-2 text-sm text-ink-500 hover:bg-slate-50"
        >
          View citizen site ↗
        </a>
      </div>
    </aside>
  );
}
