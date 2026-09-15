"use client";

import { useState } from "react";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, Trash2, Plus, User, Lock } from "lucide-react";
import Link from "next/link";
import type { BusinessPlan } from "@/lib/plans";

interface Employee {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  is_active: boolean;
}

interface EmployeeForm {
  name: string;
  email: string;
  phone: string;
  specialty: string;
}

const initialForm: EmployeeForm = {
  name: "",
  email: "",
  phone: "",
  specialty: "",
};

/** Límite de empleados por plan. Básico permite solo el dueño (1); Pro hasta 5. */
export const EMPLOYEE_LIMITS: Record<"basic" | "pro", number> = {
  basic: 1,
  pro: 5,
};

export default function EmployeesManager({
  businessId,
  initialEmployees,
  plan,
}: {
  businessId: string;
  initialEmployees: Employee[];
  /** Plan activo del negocio (null = sin suscripción activa / fuera de prueba). */
  plan: BusinessPlan;
}) {
  const supabase = useSupabaseBrowser();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [loading, setLoading] = useState(false);

  const limit = EMPLOYEE_LIMITS[plan === "pro" ? "pro" : "basic"];
  const atLimit = employees.length >= limit && !editing;

  const openCreate = () => {
    if (atLimit) {
      toast.error(
        plan === "pro"
          ? `Alcanzaste el límite de ${limit} empleados del plan Pro.`
          : `El plan Básico permite ${limit} empleado. Actualiza a Pro para gestionar hasta ${EMPLOYEE_LIMITS.pro}.`
      );
      return;
    }
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setForm({
      name: employee.name,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      specialty: employee.specialty ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("employees")
          .update({
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            specialty: form.specialty || null,
          })
          .eq("id", editing.id);

        if (error) throw error;
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === editing.id
              ? {
                  ...e,
                  name: form.name,
                  email: form.email || null,
                  phone: form.phone || null,
                  specialty: form.specialty || null,
                }
              : e
          )
        );
        toast.success("Empleado actualizado");
      } else {
        if (employees.length >= limit) {
          toast.error(
            plan === "pro"
              ? `Alcanzaste el límite de ${limit} empleados del plan Pro.`
              : `El plan Básico permite ${limit} empleado. Actualiza a Pro para gestionar hasta ${EMPLOYEE_LIMITS.pro}.`
          );
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("employees")
          .insert({
            business_id: businessId,
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            specialty: form.specialty || null,
          })
          .select()
          .single();

        if (error) throw error;
        setEmployees((prev) => [...prev, data]);
        toast.success("Empleado creado");
      }
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar empleado";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    const confirmed = window.confirm(`¿Eliminar al empleado "${employee.name}"?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id);

      if (error) throw error;
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
      toast.success("Empleado eliminado");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar empleado";
      toast.error(message);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    const next = !employee.is_active;
    try {
      const { error } = await supabase
        .from("employees")
        .update({ is_active: next })
        .eq("id", employee.id);

      if (error) throw error;
      setEmployees((prev) =>
        prev.map((e) => (e.id === employee.id ? { ...e, is_active: next } : e))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar empleado";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tu equipo</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employees.length} de {limit} empleado{limit === 1 ? "" : "s"} disponibles
            {plan !== "pro" && (
              <span className="text-muted-foreground"> · plan {plan === "basic" ? "Básico" : "de prueba"}</span>
            )}
          </p>
        </div>
        <Button onClick={openCreate} disabled={atLimit} className="shrink-0">
          {atLimit ? <Lock className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Nuevo empleado
        </Button>
      </div>

      {plan !== "pro" && employees.length >= limit && (
        <Card className="border-accent bg-accent/40">
          <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-accent-foreground">
              Actualiza a <span className="font-medium">Pro</span> para gestionar hasta {EMPLOYEE_LIMITS.pro} empleados,
              con horarios y disponibilidad independientes por persona.
            </p>
            <Link href="/billing">
              <Button size="sm" variant="secondary">Ver plan Pro</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-4">
            <p className="text-muted-foreground">
              Aún no tienes empleados registrados.
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="mr-1.5 h-4 w-4" /> Crear empleado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((employee) => (
            <Card key={employee.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent rounded-full">
                      <User className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {employee.specialty || employee.email || "Sin especialidad"}
                      </p>
                    </div>
                  </div>
                  {!employee.is_active && (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Teléfono: </span>
                    <span className="font-medium text-foreground">{employee.phone || "No asignado"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={employee.is_active ? "Desactivar" : "Activar"}
                      onClick={() => handleToggleActive(employee)}
                    >
                      {employee.is_active ? "✅" : "❌"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => openEdit(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      onClick={() => handleDelete(employee)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
              {editing ? "Editar empleado" : "Nuevo empleado"}
            </DialogTitle>
            <DialogDescription>
              Completa la información del empleado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Nombre completo *</Label>
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-specialty">Especialidad</Label>
              <Input
                id="emp-specialty"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="Ej: Estilista, Barbero, Manicurista"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="juan@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">Teléfono</Label>
              <Input
                id="emp-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="809-000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !form.name}
            >
              {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
