"use client";

import { useState } from "react";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Link as LinkIcon } from "lucide-react";
import ImageUpload from "@/components/ui/image-upload";

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string;
  address: string | null;
  email: string;
  primary_color: string;
  secondary_color: string;
  cancellation_hours: number;
  logo_url: string | null;
}

export default function BusinessSettings({
  business,
}: {
  business: Business;
}) {
  const supabase = useSupabaseBrowser();

  const [form, setForm] = useState({
    name: business.name,
    description: business.description ?? "",
    phone: business.phone,
    address: business.address ?? "",
    primary_color: business.primary_color,
    secondary_color: business.secondary_color,
    cancellation_hours: business.cancellation_hours,
    logo_url: business.logo_url,
  });
  const [loading, setLoading] = useState(false);
  const [publicPage, setPublicPage] = useState(
    `${typeof window !== "undefined" ? window.location.origin : ""}/${business.slug}`
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: form.name,
          description: form.description || null,
          phone: form.phone,
          address: form.address || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          cancellation_hours: form.cancellation_hours,
          logo_url: form.logo_url,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Configuración guardada");
      setPublicPage(
        `${window.location.origin}/${business.slug}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al guardar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Public page info */}
      <Card>
        <CardHeader>
          <CardTitle>Tu página pública</CardTitle>
          <CardDescription>
            Comparte esta URL con tus clientes para que reserven.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <a
              href={publicPage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 font-medium hover:underline"
            >
              {publicPage}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Business info form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del negocio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload
            businessId={business.id}
            value={form.logo_url}
            label="Logo del negocio"
            aspect="aspect-square"
            onChange={(url) => setForm({ ...form, logo_url: url })}
          />
          <div className="space-y-2">
            <Label htmlFor="b-name">Nombre</Label>
            <Input
              id="b-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-desc">Descripción</Label>
            <Textarea
              id="b-desc"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-phone">Teléfono</Label>
            <Input
              id="b-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-address">Dirección</Label>
            <Input
              id="b-address"
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="b-primary">Color principal</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm({ ...form, primary_color: e.target.value })
                  }
                  className="h-9 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm({ ...form, primary_color: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-secondary">Color secundario</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) =>
                    setForm({ ...form, secondary_color: e.target.value })
                  }
                  className="h-9 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={form.secondary_color}
                  onChange={(e) =>
                    setForm({ ...form, secondary_color: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-cancel">
              Horas mínimas para cancelar una cita
            </Label>
            <Input
              id="b-cancel"
              type="number"
              min={0}
              value={form.cancellation_hours}
              onChange={(e) =>
                setForm({
                  ...form,
                  cancellation_hours: Number(e.target.value),
                })
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Los clientes solo podrán cancelar dentro de este período.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
