import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ business: string }>;
}) {
  const { business } = await params;
  const supabase = await createClient();

  const { data: businessData } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", business)
    .single();

  if (!businessData) {
    notFound();
  }

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessData.id)
    .eq("is_active", true);

  const primary = businessData.primary_color || "#059669";

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${primary}15 0%, #f9fafb 50%)`,
      }}
    >
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {businessData.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessData.logo_url}
                alt={businessData.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: primary }}
              >
                {businessData.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{businessData.name}</h1>
              {businessData.description && (
                <p className="text-sm text-gray-600 line-clamp-1">{businessData.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <section className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Reserva tu cita con {businessData.name}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Selecciona un servicio y elige el horario que mejor te convenga.
            Te confirmaremos por email.
          </p>
        </section>

        {/* Services grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services && services.length > 0 ? (
            services.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                {service.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription>
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Duración</p>
                    <p className="font-medium">{service.duration_minutes} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Precio</p>
                    <p className="font-bold text-lg" style={{ color: primary }}>
                      ${Number(service.price).toLocaleString("es-DO")}{" "}
                      {businessData.currency}
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/${businessData.slug}/book?service=${service.id}`} className="w-full">
                    <Button className="w-full" style={{ backgroundColor: primary }}>
                      Reservar ahora
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  Este negocio aún no ha publicado servicios.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <footer className="text-center py-8 text-sm text-gray-500">
        <p>
          Powered by <span className="font-semibold" style={{ color: primary }}>Agendalo</span>
        </p>
      </footer>
    </div>
  );
}
