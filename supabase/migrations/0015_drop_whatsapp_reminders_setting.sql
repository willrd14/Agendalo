-- Se descartó WhatsApp Business API del alcance del Módulo de Comunicación
-- Pro; el negocio solo gestiona recordatorios por SMS (además de email).
alter table public.businesses drop column if exists whatsapp_reminders_enabled;
