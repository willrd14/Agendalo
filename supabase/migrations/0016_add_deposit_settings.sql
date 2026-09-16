-- Depósito para garantizar la cita (Módulo Financiero Pro).
-- Añade la configuración de depósito a nivel de negocio (no es un método de
-- pago en sí, sino una política que se aplica sobre el método de pago online
-- ya configurado, por ahora solo PayPal) y distingue en payment_sessions si
-- la sesión de pago es por el servicio completo o solo por el depósito.

alter table public.businesses
  add column if not exists deposit_required boolean not null default false,
  add column if not exists deposit_type text not null default 'percentage'
    check (deposit_type in ('percentage', 'fixed')),
  add column if not exists deposit_percentage numeric not null default 20,
  add column if not exists deposit_fixed_amount numeric not null default 0;

alter table public.payment_sessions
  add column if not exists session_type text not null default 'full'
    check (session_type in ('full', 'deposit'));
