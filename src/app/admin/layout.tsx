import { getOfficer } from "@/lib/supabase/auth";
import Sidebar from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

// Middleware guarantees: unauthenticated requests to any /admin page except
// /admin/login are redirected to login. So when there's no officer here, the
// child being rendered is the login page — render it bare (no sidebar).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOfficer();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar email={user.email ?? null} />
      <div className="flex-1 min-w-0">
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
