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

## 3. Módulo Financiero Pro (Prioridad Media) — Pendiente
- **Objetivo:** Gestión de depósitos y reportes avanzados.
- **Acciones:**
    - Implementar flujo de pago de depósito para garantizar citas (columnas `deposit_amount`/`deposit_status` ya existen en `appointments` y ya están tipadas).
    - Crear generador de reportes financieros en PDF/CSV.
    - Integración de estados de depósito en la tabla de citas (UI).

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
