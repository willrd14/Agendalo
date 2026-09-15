import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PaypalCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  void params.session;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
            ↩️
          </div>
          <CardTitle className="text-2xl">Pago cancelado</CardTitle>
          <CardDescription>
            No se realizó ningún cobro. Puedes intentar reservar de nuevo
            cuando quieras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className="block w-full">
            <Button className="w-full">Volver al inicio</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
