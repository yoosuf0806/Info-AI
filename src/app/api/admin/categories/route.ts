import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// List all categories (including archived) for officers.
export const GET = withOfficer(async () => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return NextResponse.json({ categories: data });
});

// Create a category.
export const POST = withOfficer(async (_userId, req: Request) => {
  const body = await readJson<{ name?: string; display_order?: number }>(req);
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("categories")
    .insert({
      name: body.name.trim(),
      slug: slugify(body.name),
      display_order: body.display_order ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return NextResponse.json({ category: data }, { status: 201 });
});
