"use client";

import { useState } from "react";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import ImageUpload from "@/components/ui/image-upload";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  is_active: boolean;
  image_url: string | null;
}

interface ServiceForm {
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  image_url: string | null;
}

const initialForm: ServiceForm = {
  name: "",
  description: "",
  duration_minutes: 30,
  price: 0,
  image_url: null,
};

export default function ServicesManager({
  businessId,
  businessCurrency,
  initialServices,
}: {
  businessId: string;
  businessCurrency: string;
  initialServices: Service[];
}) {
  const supabase = useSupabaseBrowser();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(initialForm);
  const [loading, setLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: service.duration_minutes,
      price: Number(service.price),
      image_url: service.image_url,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("services")
          .update({
            name: form.name,
            description: form.description || null,
            duration_minutes: form.duration_minutes,
            price: form.price,
            image_url: form.image_url,
          })
          .eq("id", editing.id);

        if (error) throw error;
        setServices((prev) =>
          prev.map((s) =>
            s.id === editing.id
              ? {
                  ...s,
                  name: form.name,
                  description: form.description || null,
                  duration_minutes: form.duration_minutes,
                  price: form.price,
                }
              : s
          )
        );
        toast.success("Servicio actualizado");
      } else {
        const { data, error } = await supabase
          .from("services")
          .insert({
            business_id: businessId,
            name: form.name,
            description: form.description || null,
            duration_minutes: form.duration_minutes,
            price: form.price,
            currency: businessCurrency,
            image_url: form.image_url,
          })
          .select()
          .single();

        if (error) throw error;
        setServices((prev) => [...prev, data]);
        toast.success("Servicio creado");
      }
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al guardar servicio";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (service: Service) => {
    const confirmed = window.confirm(
      `¿Eliminar el servicio "${service.name}"?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id);

      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      toast.success("Servicio eliminado");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al eliminar servicio";
      toast.error(message);
    }
  };

  const handleToggleActive = async (service: Service) => {
    const next = !service.is_active;
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: next })
        .eq("id", service.id);

      if (error) throw error;
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: next } : s))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar servicio";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Tus servicios</h2>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nuevo servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Aún no tienes servicios. Crea el primero para que tus clientes
              puedan reservar.
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Crear servicio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-foreground">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>
                  {!service.is_active && (
                    <Badge variant="secondary">Oculto</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Duración: </span>
                    <span className="font-medium">
                      {service.duration_minutes} min
                    </span>
                    <br />
                    <span className="text-muted-foreground">Precio: </span>
                    <span className="font-bold text-emerald-600">
                      ${Number(service.price).toLocaleString("es-DO")}{" "}
                      {service.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={service.is_active ? "Ocultar" : "Mostrar"}
                      onClick={() => handleToggleActive(service)}
                    >
                      {service.is_active ? "👁️" : "🚫"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => openEdit(service)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      onClick={() => handleDelete(service)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar servicio" : "Nuevo servicio"}
            </DialogTitle>
            <DialogDescription>
              Completa la información del servicio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUpload
              businessId={businessId}
              value={form.image_url}
              label="Imagen del servicio"
              onChange={(url) => setForm({ ...form, image_url: url })}
            />
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nombre *</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Corte de cabello"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-desc">Descripción</Label>
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe el servicio"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="svc-duration">Duración (min) *</Label>
                <Input
                  id="svc-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration_minutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-price">Precio ({businessCurrency}) *</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !form.name || form.price < 0 || form.duration_minutes < 5}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
