# Plan de Implementación: Fase Pro - Agendalo

Este documento sirve como guía de contexto para la transición a la carpeta del proyecto.

## 1. Módulo Multi-empleado (Prioridad Alta) — ✅ Completado (9 sep 2026)
- **Objetivo:** Permitir que el negocio gestione hasta 5 empleados.
- **Acciones:**
    - [x] Crear UI de gestión de empleados (CRUD: Nombre, Especialidad, Horario).
    - [x] Modificar el flujo de reserva para permitir la selección de empleado (ya existía en `booking-flow.tsx`).
    - [x] Actualizar la lógica de disponibilidad para que sea por empleado y no solo por servicio (ya existía en `availability-manager.tsx`, con `employee_id`).
    - [x] Implementar validación de límite de empleados según el plan (Básico: 1, Pro: 5) — en `EmployeesManager` (UI) usando `getActiveBusinessPlan`.
- **Notas técnicas:**
    - Se agregó la columna `employees.specialty` (migración `0012_add_employee_specialty.sql`).
    - Se documentó el esquema Pro ya ejecutado en Supabase como migración versionada (`0011_pro_phase_tables_baseline.sql`) para que quede en el repo.
    - Se completaron los tipos TypeScript (`src/types/database.ts`) para `employees`, `inventory_items`, `service_inventory`, `inventory_transactions`, `waiting_list`, `coupons`, y los campos `deposit_amount`/`deposit_status`/`employee_id` en `appointments`/`availability`.
    - Límite de empleados por plan definido en `EMPLOYEE_LIMITS` (`employees-manager.tsx`): Básico = 1, Pro = 5. Un negocio en periodo de prueba (sin suscripción activa) se trata como Básico por seguridad.

## 2. Módulo de Comunicación Pro (Prioridad Media) — 🟡 Código listo, falta activar
- **Objetivo:** Recordatorios vía SMS (se descartó WhatsApp Business API del alcance, 9 sep 2026).
- **Acciones:**
    - [x] Integración con API de Twilio (cliente propio sin dependencia npm, vía `fetch` — `src/lib/twilio/send-message.ts`).
    - [x] Configuración de triggers de envío (24h antes de la cita) — extendido en la Edge Function `appointment-reminders`, desplegada.
    - [x] Panel de configuración de mensajes personalizados — `CommunicationSettings` en Configuración, gateado a plan Pro.
- **Credenciales recibidas:** API Key SID/Secret y Account SID de Twilio (guardados en `.env.local`, no expuestos en el chat).
- **Falta para producción:**
    1. Comprar número de Twilio con capacidad SMS — Williams está en eso.
    2. Configurar en **Supabase → Project Settings → Edge Functions → Secrets** (no en `.env.local`, ese archivo solo aplica a Next.js): `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_PHONE_NUMBER`.
    3. Probar el envío real una vez esté el número.

## 3. Módulo Financiero Pro (Prioridad Media) — ✅ Completo + hardening de seguridad (16 sep 2026)
- **Objetivo:** Gestión de depósitos y reportes avanzados.
- **Acciones:**
    - [x] Flujo de pago de depósito para garantizar citas — configuración en Facturación (toggle + porcentaje/monto fijo), cobro vía PayPal reutilizando el flujo de `payment_sessions` (nuevo campo `session_type`), y `finalizePaypalPayment` ramifica para marcar `deposit_amount`/`deposit_status` en la cita. Gateado a plan Pro real (sin trial) tanto en UI como en el endpoint.
    - [x] Generador de reportes financieros en CSV y PDF (`jspdf`/`jspdf-autotable`) en el dashboard de Pagos, exporta los pagos filtrados (estado + búsqueda), gateado a plan Pro.
    - [x] Badge de estado de depósito (pagado/pendiente/reembolsado) en la tarjeta de cada cita, solo cuando `deposit_amount > 0`.
- **Notas técnicas:**
    - Nueva migración `0016_add_deposit_settings.sql`: añade a `businesses` las columnas `deposit_required`, `deposit_type` (`percentage`/`fixed`), `deposit_percentage`, `deposit_fixed_amount`; añade `session_type` (`full`/`deposit`) a `payment_sessions`.
    - Nuevo endpoint `POST /api/payments/paypal/create-deposit`; la captura reutiliza `/api/payments/paypal/capture` y `finalizePaypalPayment()` (ramifica por `session_type`, sin duplicar lógica).
    - `deposit_amount` en la cita se guarda en moneda local del negocio; el registro en `payments` (ledger financiero) sigue en USD capturado por PayPal, igual que el flujo de pago completo.
    - Si el negocio requiere depósito pero no tiene PayPal habilitado, el requisito no se aplica (cae al flujo manual normal) — no bloquea la reserva.
    - Migración `0016_add_deposit_settings.sql` **aplicada contra Supabase** (proyecto `qjrnhcexzbrqntappvga`, vía MCP) el 16 sep 2026 — verificada con `list_tables`: `businesses.deposit_required/deposit_type/deposit_percentage/deposit_fixed_amount` y `payment_sessions.session_type` ya existen en producción.
- **QA + Pentest (16 sep 2026):** se hizo una revisión de calidad y una de seguridad dedicadas antes de dar el módulo por terminado. El pentest encontró 4 vulnerabilidades críticas (una preexistente en `subscriptions` que permitía auto-otorgarse plan Pro gratis, manipulación del monto del depósito desde el cliente, webhook de PayPal sin verificar firma, relay de email abierto con inyección HTML) y varias altas/medias (datos bancarios de todos los negocios expuestos públicamente, config de depósito sin límites reales, sin rate limiting, entre otras). Todo se corrigió — ver detalle en `CHANGELOG-Agendalo.md` (16 sep 2026, sección "Hardening de seguridad").
- **Falta para producción:**
    1. Probar el flujo de depósito de punta a punta (configurar en Facturación → reservar como cliente → pagar depósito con PayPal → verificar cita `confirmed` + badge en `/appointments` + registro en `/payments`).
    2. Probar exportación CSV/PDF con datos reales en plan Pro vs. Basic.
    3. Configurar `PAYPAL_WEBHOOK_ID` (Dashboard de PayPal → Webhooks) y `EMAIL_INTERNAL_SECRET` en producción — ver `.env.example`; sin `PAYPAL_WEBHOOK_ID` el webhook de billing rechaza todos los eventos (falla cerrado, a propósito).
    4. Decisión pendiente de Williams: si vale la pena eliminar la creación automática de cuentas de invitado en el flujo de pago (requiere hacer `appointments.client_id` nullable — cambio de esquema más amplio, se dejó fuera de este hardening a propósito).

## 4. Módulo de Fidelización y Logística (Prioridad Baja) — Pendiente
- **Objetivo:** Cupones y Lista de Espera Inteligente.
- **Acciones:**
    - UI y lógica de validación de cupones de descuento (tabla `coupons` ya existe y está tipada).
    - Sistema de notificaciones automáticas cuando se libera un espacio para usuarios en lista de espera (tabla `waiting_list` ya existe y está tipada).
    - Gestión de inventario vinculada a los servicios prestados (tablas `inventory_items`, `service_inventory`, `inventory_transactions` ya existen y están tipadas).

## Estado de la DB (Ya ejecutado + versionado en repo)
- Tablas: `employees` (+ `specialty`), `inventory_items`, `service_inventory`, `inventory_transactions`, `waiting_list`, `coupons`.
- Columnas añadidas a `appointments`: `deposit_amount`, `deposit_status`, `employee_id`.
- Columna añadida a `availability`: `employee_id`.
- RLS configurado y documentado en `supabase/migrations/0011_pro_phase_tables_baseline.sql`.

## 5. Rediseño de interfaz (paralelo, 9 sep 2026) — ✅ Completado (primera pasada)
- Sistema de diseño unificado entre el dashboard (app) y el landing: paleta esmeralda `#059669` + azul `#3B82F6` vía tokens CSS en `globals.css` (oklch), tipografía Inter, radios más suaves (`--radius: 0.75rem`).
- Sidebar del dashboard rediseñado: agrupación por secciones (General / Negocio / Cuenta), iconografía `lucide-react` consistente, marca "A" en logo, estados activos con tokens `sidebar-*`.
- Reemplazo sistemático de clases de color "hardcodeadas" (`gray-*`, `white`, `green-*`) por tokens semánticos (`text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`, `bg-primary`) en todo el dashboard y componentes compartidos — mantiene minimalismo y prepara el terreno para modo oscuro.
- Página de Empleados rediseñada con estado de límite de plan visible y CTA a Billing cuando se alcanza el tope.
- ✅ Segunda pasada (9 sep 2026): encabezados título + subtítulo estandarizados en Servicios, Empleados, Citas, Calendario, Clientes y Configuración; limpieza final de colores `gray-*` residuales en `payments-list`, `clients-list`, `calendar-view`, `appointments-manager` y `payment-methods-manager`.
- Pendiente (si Williams quiere seguir): rediseño más profundo de la disposición interna de Citas/Calendario/Pagos (no solo colores/encabezados) y modo oscuro real (tokens ya listos).
