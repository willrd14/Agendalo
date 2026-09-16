import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveBusinessPlan, isProPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

// A-2: deposit settings used to be written directly from the client
// (`payment-methods-manager.tsx` -> `supabase.from("businesses").update(...)`),
// where RLS only checks business ownership, not plan or value ranges. A
// Basic-plan user could set deposit_required=true from devtools, and
// deposit_percentage had no upper bound (e.g. 500%). This route enforces
// both server-side, backed by DB CHECK constraints (migration 0017) as a
// second layer of defense.
const bodySchema = z.object({
  deposit_required: z.boolean(),
  deposit_type: z.enum(["percentage", "fixed"]),
  deposit_percentage: z.number().min(1).max(100),
  deposit_fixed_amount: z.number().min(0),
});

function genericError(prefix: string, err: unknown): string {
  const errorId = Date.now().toString(36);
  console.error(`${prefix} [${errorId}]`, err);
  return `No se pudo guardar la configuración, intenta de nuevo. (ref: ${errorId})`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 400 });
    }

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const plan = await getActiveBusinessPlan(supabase, business.id);
    if (!isProPlan(plan)) {
      return NextResponse.json(
        {
          error:
            "El depósito para garantizar citas es una función del plan Pro. Mejora tu plan para activarlo.",
        },
        { status: 403 }
      );
    }

    const serviceSupabase = createServiceClient();
    const { error: updateError } = await serviceSupabase
      .from("businesses")
      .update({
        deposit_required: body.deposit_required,
        deposit_type: body.deposit_type,
        deposit_percentage: body.deposit_percentage,
        deposit_fixed_amount: body.deposit_fixed_amount,
      })
      .eq("id", business.id);

    if (updateError) {
      return NextResponse.json(
        { error: genericError("settings/deposit: update failed", updateError) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: genericError("settings/deposit: unhandled error", err) },
      { status: 500 }
    );
  }
}
