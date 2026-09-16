import { NextRequest, NextResponse } from "next/server";
import { finalizePaypalPayment } from "@/lib/service-payment";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body?.sessionId as string | undefined;
    const orderId = body?.orderId as string | undefined;

    if (!sessionId || !orderId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const result = await finalizePaypalPayment(sessionId, orderId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      alreadyCompleted: result.alreadyCompleted,
      appointmentId: result.appointmentId,
      paidAmount: result.paidAmount,
    });
  } catch (err) {
    const errorId = Date.now().toString(36);
    console.error(`capture: unhandled error [${errorId}]`, err);
    return NextResponse.json(
      { error: `No se pudo procesar el pago, intenta de nuevo. (ref: ${errorId})` },
      { status: 500 }
    );
  }
}
