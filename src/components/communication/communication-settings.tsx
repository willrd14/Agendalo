"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Lock, MessageCircle } from "lucide-react";
import { DEFAULT_REMINDER_TEMPLATE, renderReminderTemplate } from "@/lib/twilio/send-message";
import type { BusinessPlan } from "@/lib/plans";

interface Props {
  businessId: string;
  plan: BusinessPlan;
  initialSmsEnabled: boolean;
  initialTemplate: string | null;
}

export default function CommunicationSettings({
  businessId,
  plan,
  initialSmsEnabled,
  initialTemplate,
}: Props) {
  const supabase = useSupabaseBrowser();
  const isPro = plan === "pro";

  const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled);
  const [template, setTemplate] = useState(initialTemplate ?? DEFAULT_REMINDER_TEMPLATE);
  const [loading, setLoading] = useState(false);

  const preview = renderReminderTemplate(template, {
    clientName: "María",
    businessName: "Tu Negocio",
    serviceName: "Corte de cabello",
    date: "jueves, 12 de septiembre",
    startTime: "3:00 PM",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          sms_reminders_enabled: smsEnabled,
          reminder_message_template: template,
        })
        .eq("id", businessId);

      if (error) throw error;
      toast.success("Preferencias de comunicación guardadas");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Recordatorios por SMS
            </CardTitle>
            <CardDescription>
              Además del email, avisa a tus clientes 24h antes de su cita por mensaje de texto.
            </CardDescription>
          </div>
          {!isPro && (
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
              <Lock className="h-3 w-3" /> Plan Pro
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isPro && (
          <div className="rounded-md border border-accent bg-accent/40 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-accent-foreground">
              Los recordatorios por SMS son una función del <span className="font-medium">plan Pro</span>.
            </p>
            <Link href="/billing">
              <Button size="sm" variant="secondary">Ver plan Pro</Button>
            </Link>
          </div>
        )}

        <div className={`space-y-4 ${!isPro ? "opacity-50 pointer-events-none select-none" : ""}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="sms-toggle">Recordatorio por SMS</Label>
              <p className="text-sm text-muted-foreground">Se envía al número del cliente registrado en la cita.</p>
            </div>
            <Switch id="sms-toggle" checked={smsEnabled} onCheckedChange={setSmsEnabled} disabled={!isPro} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-template">Mensaje personalizado</Label>
            <Textarea
              id="msg-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              disabled={!isPro}
              placeholder={DEFAULT_REMINDER_TEMPLATE}
            />
            <p className="text-xs text-muted-foreground">
              Variables disponibles: <code className="bg-muted px-1 rounded">{"{{cliente}}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{{negocio}}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{{servicio}}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{{fecha}}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{{hora}}"}</code>
            </p>
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-foreground/80">
              <span className="text-xs text-muted-foreground block mb-1">Vista previa</span>
              {preview}
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading || !isPro}>
            <Save className="mr-1.5 h-4 w-4" />
            {loading ? "Guardando..." : "Guardar preferencias"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
