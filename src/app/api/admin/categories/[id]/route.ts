import { NextResponse } from "next/server";
import { withOfficer, readJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// Rename, reorder, or archive/restore a category.
export const PATCH = withOfficer(async (_userId, req: Request, ctx: Ctx) => {
  const body = await readJson<{
    name?: string;
    display_order?: number;
    is_archived?: boolean;
  }>(req);

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.display_order === "number")
    patch.display_order = body.display_order;
  if (typeof body.is_archived === "boolean")
    patch.is_archived = body.is_archived;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No changes." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("categories")
    .update(patch)
    .eq("id", ctx.params.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return NextResponse.json({ category: data });
});

// Delete a category (procedures/documents keep null category on delete).
export const DELETE = withOfficer(async (_userId, _req: Request, ctx: Ctx) => {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("categories")
    .delete()
    .eq("id", ctx.params.id);
  if (error) throw new Error(error.message);
  return NextResponse.json({ ok: true });
});
