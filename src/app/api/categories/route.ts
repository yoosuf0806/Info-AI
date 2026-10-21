import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: active service categories for the "Browse by service" tiles.
// Falls back to a static starter set when none are configured.
const DEFAULT_CATEGORIES = [
  { id: "national-id", name: "National ID", slug: "national-id" },
  { id: "passport", name: "Passport", slug: "passport" },
  { id: "driving-licence", name: "Driving licence", slug: "driving-licence" },
  { id: "birth-certificate", name: "Birth certificate", slug: "birth-certificate" },
  { id: "land-property", name: "Land & property", slug: "land-property" },
  { id: "tax", name: "Tax", slug: "tax" },
];

export async function GET() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select("id, name, slug, display_order")
    .eq("is_archived", false)
    .order("display_order", { ascending: true })
    .limit(12);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ categories: DEFAULT_CATEGORIES });
  }
  return NextResponse.json({
    categories: (data as Array<{ id: string; name: string; slug: string | null }>).map(
      (c) => ({ id: c.id, name: c.name, slug: c.slug }),
    ),
  });
}
