import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const businessId = formData.get("businessId");

    if (!(file instanceof File) || !file.type) {
      return NextResponse.json(
        { error: "Archivo no válido" },
        { status: 400 }
      );
    }
    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json(
        { error: "Falta el id del negocio" },
        { status: 400 }
      );
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de imagen no permitido" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "La imagen supera los 5 MB" },
        { status: 400 }
      );
    }

    // Verify business ownership
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json(
        { error: "No tienes permiso sobre este negocio" },
        { status: 403 }
      );
    }

    const ext = file.type.split("/")[1];
    const filename = `${randomUUID()}.${ext}`;
    const path = `businesses/${businessId}/${filename}`;

    const serviceClient = createServiceClient();
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await serviceClient.storage
      .from("business-assets")
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error al subir: ${uploadError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl(path) });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al subir imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
