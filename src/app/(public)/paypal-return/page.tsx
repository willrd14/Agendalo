import Link from "next/link";
import { finalizePaypalPayment } from "@/lib/service-payment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PaypalReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; business?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session;
  const businessSlug = params.business;

  let title = "Procesando el pago...";
  let description =
    "Estamos confirmando tu reserva. Si esta página no se actualiza, vuelve a intentarlo.";
  let success = false;

  if (sessionId) {
    try {
      // We don't have the order id in the query param; look it up is done in
      // finalize using the session. But finalize needs the order id. We
      // store order id on the session, so pass the session's own order id.
      const result = await finalizeSessionWithStoredOrder(sessionId);
      if (result.success) {
        success = true;
        if (result.isDeposit) {
          title = "¡Depósito pagado!";
          description =
            "Tu reserva ha sido confirmada con el depósito de garantía. El resto se paga en el negocio.";
        } else {
          title = "¡Pago exitoso!";
          description = "Tu reserva ha sido confirmada y tu pago procesado.";
        }
      } else {
        title = "No se pudo completar la reserva";
        description = result.error ?? "Ocurrió un error al procesar el pago.";
      }
    } catch {
      title = "No se pudo completar la reserva";
      description = "Ocurrió un error al procesar el pago.";
    }
  } else {
    title = "Reserva incompleta";
    description = "No se recibió una referencia de pago válida.";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div
            className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl ${
              success ? "bg-emerald-100" : "bg-red-100"
            }`}
          >
            {success ? "✅" : "⚠️"}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {success ? (
            <Link
              href={businessSlug ? `/${businessSlug}` : "/history"}
              className="block w-full"
            >
              <Button className="w-full">Ver mis citas</Button>
            </Link>
          ) : (
            <Link href={businessSlug ? `/${businessSlug}` : "/"} className="block w-full">
              <Button variant="outline" className="w-full">
                Volver a reservar
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function finalizeSessionWithStoredOrder(sessionId: string) {
  // Read the stored order id from the session, then finalize.
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = createServiceClient();
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("paypal_order_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session?.paypal_order_id) {
    return { success: false, error: "No se encontró la orden de pago." };
  }

  return finalizePaypalPayment(sessionId, session.paypal_order_id);
}
