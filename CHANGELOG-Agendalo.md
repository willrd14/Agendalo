# CHANGELOG - Agendalo

Sistema de Reservas SaaS (Next.js 16 + Supabase + Tailwind + shadcn/ui + TypeScript).

## 16 de septiembre de 2026

### Hardening de seguridad — QA + Pentest del Módulo Financiero Pro
Antes de dar el módulo por listo para producción, se hizo una revisión de calidad (QA) y un pentest dedicados por subagentes independientes. Resumen de lo encontrado y corregido:

**Críticos:**
- **Escalada de plan gratis:** la política RLS de `subscriptions` (desde `0005_add_subscriptions_insert_update_policies.sql`) permitía a cualquier dueño de negocio autenticado insertarse/actualizarse a plan Pro sin pagar. Revocadas las políticas de INSERT/UPDATE públicas; todas las escrituras a `subscriptions` (`/api/billing/start`, `/sync`, `/cancel`) migradas a `createServiceClient()`. Preexistente, no introducido por el módulo nuevo, pero descubierto al auditarlo.
- **Manipulación de montos del depósito desde el cliente:** `create-deposit`/`create` confiaban en `price`/`conversionRate` enviados por el navegador. Ahora se recalculan siempre server-side contra `services.price` y `business_payment_methods.paypal_conversion_rate` reales, validando que el servicio pertenezca al negocio, con `zod` y un mínimo de cobro de US$1.
- **Webhook de PayPal sin verificar firma:** `/api/billing/webhook` aceptaba cualquier evento falsificado (podía activar suscripciones gratis o envenenar los reportes financieros con pagos falsos). Ahora verifica la firma contra la API de PayPal (`PAYPAL_WEBHOOK_ID` + cabeceras `paypal-*`) antes de procesar, y falla cerrado si no está configurado.
- **Relay de email abierto + inyección HTML:** rutas `/api/emails/*` públicas sin auth, con datos de usuario interpolados sin escapar en el HTML de los correos. Se añadió `escapeHtml()` en todas las plantillas; `appointment-cancelled`/`appointment-reminder` (sin caller legítimo fuera del propio backend) se protegieron con un secreto interno (`EMAIL_INTERNAL_SECRET`); `appointment-confirmation` (con caller público legítimo) se dejó abierta pero con validación estricta + rate limiting.

**Altos:**
- **Datos bancarios de todos los negocios expuestos:** `business_payment_methods` tenía `SELECT USING (true)`, exponiendo cuentas bancarias de todos los tenants con la anon key. La página pública de reserva ahora carga esos datos server-side (service role) solo para el negocio consultado; se eliminó el SELECT público a nivel de RLS.
- **Config de depósito sin límites reales:** se guardaba con un `update` directo del cliente (bypasseaba el gating a Pro y no tenía tope de porcentaje). Nueva ruta `/api/settings/deposit` que valida plan Pro y rangos (1-100%) server-side, más `CHECK` constraints en la base de datos.
- **Sin rate limiting:** se agregó throttling propio (sin servicios externos) por IP en `create`/`create-deposit` (máx. 5 sesiones/10 min) y en las rutas de email sin secreto interno, vía nueva tabla `rate_limit_log` y columna `payment_sessions.client_ip`.

**Medios:** validación de `orderId` en captura ya no deja pasar `NULL` sin chequear; se valida que la cita no sea en el pasado ni se solape con otra antes de crear; se rechaza capturar sesiones de pago ya expiradas (`expires_at`); los errores internos (Postgres/PayPal) ya no se filtran al cliente, solo un `errorId` genérico para soporte.

**Hallazgos de QA corregidos:** fallback de reserva manual cuando el depósito calculado es inválido/0 (antes bloqueaba la reserva sin salida); acción manual "Marcar depósito como reembolsado" en Citas (antes ese estado era inalcanzable); columna `payments.is_deposit` para distinguir depósitos de pagos completos en los reportes CSV/PDF; `appointments.deposit_status` convertido de `text` al enum `deposit_status` real (constraint de base de datos).

**Diferido a propósito (documentado, no implementado):** eliminar la creación automática de cuentas de invitado en el flujo de pago (requiere `appointments.client_id` nullable, cambio de esquema mayor — decisión pendiente de Williams); reembolso automático vía API de PayPal ante fallos parciales (se dejó un manejo best-effort: la sesión queda marcada `failed` y logueada para reconciliación manual); rediseño de `/paypal-return` de GET a POST (riesgo bajo aceptado); gating de exportación CSV/PDF sigue siendo solo visual (riesgo bajo aceptado, no expone datos adicionales a los ya visibles en pantalla).

**Migraciones:** `0017_security_fixes.sql` (RLS de `subscriptions`, constraints de depósito, `rate_limit_log`, `payments.is_deposit`, enum `deposit_status` aplicado) y `0018_restrict_payment_methods_read.sql` (RLS de `business_payment_methods`) — ambas aplicadas contra Supabase (`qjrnhcexzbrqntappvga`) y verificadas sin nuevas alertas de seguridad (`get_advisors`).

**Verificado:** `npx tsc --noEmit` ✓, `npm run lint` ✓, `npx vitest run` ✓ (35/35, incluye tests nuevos de idempotencia/expiración/solapamiento), `npm run build` ✓.

**Pendiente antes de producción:** configurar `PAYPAL_WEBHOOK_ID` y `EMAIL_INTERNAL_SECRET` en el entorno real (ver `.env.example`).

### Fase Pro — Módulo 3: Financiero (depósitos + reportes) — completado (código + migración aplicada)
Implementado con dos subagentes en paralelo (uno para el flujo de pago de depósito, otro para reportes + badge de citas), luego integrado y verificado en conjunto.

- **Configuración de depósito** (`payment-methods-manager.tsx`, dentro de Facturación): nuevo bloque "Depósito para garantizar citas" — toggle, tipo (porcentaje/monto fijo) y monto. Gateado a plan Pro real (sin período de prueba), mismo patrón visual que Comunicación (banner + bloque deshabilitado + CTA a `/billing`). Se guarda en `businesses`.
- **Cobro del depósito vía PayPal:** nuevo endpoint `POST /api/payments/paypal/create-deposit`; la captura reutiliza `/api/payments/paypal/capture` — `finalizePaypalPayment()` ahora ramifica por el nuevo campo `payment_sessions.session_type` (`full`/`deposit`) en vez de duplicar la lógica de captura/creación de cliente/email. Al pagar el depósito, la cita queda `confirmed` con `deposit_amount`/`deposit_status: 'paid'` (monto en la moneda local del negocio); el pago queda registrado en `payments` en USD, igual que el flujo de pago completo.
- **Flujo de reserva pública** (`book/page.tsx` + `booking-flow.tsx`): si el negocio es Pro, requiere depósito y tiene PayPal configurado, el botón de confirmación manual se oculta y solo se muestra "Pagar depósito con PayPal (USD)". Si no hay PayPal habilitado, el requisito de depósito no se aplica (no bloquea la reserva).
- **`/paypal-return`:** distingue el mensaje de éxito ("¡Depósito pagado!" vs "¡Pago exitoso!") según el tipo de sesión.
- **Reportes financieros (CSV/PDF):** en el dashboard de Pagos, botones "Exportar CSV"/"Exportar PDF" (librerías nuevas `jspdf` + `jspdf-autotable`) que exportan los pagos ya filtrados (estado + búsqueda) con las mismas columnas de la tabla. Gateado a plan Pro (botones deshabilitados + banner con CTA a `/billing` en Básico/trial).
- **Badge de depósito en Citas:** cada tarjeta de cita muestra "Depósito pagado" / "Depósito pendiente" / "Depósito reembolsado" junto al estado de la cita, solo cuando la cita tiene un depósito asociado (`deposit_amount > 0`).
- **Migración `supabase/migrations/0016_add_deposit_settings.sql`:** añade a `businesses` (`deposit_required`, `deposit_type`, `deposit_percentage`, `deposit_fixed_amount`) y a `payment_sessions` (`session_type`). **Aplicada contra Supabase** (proyecto `qjrnhcexzbrqntappvga`, vía MCP) y verificada con `list_tables`.
- **Verificado:** `npx tsc --noEmit` ✓, `npm run lint` ✓ (0 errores/warnings), `npx vitest run` ✓ (30/30, incluye 5 tests actualizados de `payment-methods-manager`), `npm run build` ✓ (Next.js 16 Turbopack, incluye la nueva ruta `/api/payments/paypal/create-deposit`).
- **Pendiente:** probar el flujo completo con datos reales (configurar depósito → reservar → pagar → verificar cita/badge/reporte).

## 9 de septiembre de 2026

### Fase Pro — Módulo 2: Comunicación (solo SMS vía Twilio) — en progreso
- **Se descartó WhatsApp Business API** del alcance a pedido de Williams: se quitó el toggle, la función `sendWhatsApp`, la columna `businesses.whatsapp_reminders_enabled` (migración `0015_drop_whatsapp_reminders_setting.sql`) y las referencias en la Edge Function y en `.env.local`/`.env.example`. El módulo ahora es SMS + email únicamente.
- **Credenciales:** se guardó el API Key (SID/Secret) y el Account SID de Twilio en `.env.local` (no expuestos en el chat). Aún faltan el número SMS y el número/sandbox de WhatsApp — Williams los está gestionando en la consola de Twilio.
- **Cliente Twilio sin dependencia npm:** `src/lib/twilio/send-message.ts` — envío de SMS y WhatsApp vía la API REST de Twilio con `fetch` (autenticación con API Key), normalización de teléfono, y motor de plantillas de mensaje (`{{cliente}}`, `{{negocio}}`, `{{servicio}}`, `{{fecha}}`, `{{hora}}`).
- **Edge Function `appointment-reminders` extendida:** además del email diario ya existente, ahora envía SMS y/o WhatsApp 24h antes de la cita cuando el negocio está en plan **Pro** y tiene el canal activado — usando la misma plantilla personalizable. Si Twilio no está configurado (`TWILIO_ACCOUNT_SID`/`TWILIO_API_KEY_SID`/`TWILIO_API_KEY_SECRET` ausentes), simplemente se omite ese canal sin afectar el email. Desplegada a Supabase (versión 5, `verify_jwt=false` para no romper el cron existente).
- **`sent_reminders` ahora es multi-canal:** se agregó la columna `channel` (email/sms/whatsapp) con clave primaria compuesta `(appointment_id, channel)` — antes solo permitía un recordatorio por cita (email).
- **Preferencias por negocio:** nuevas columnas en `businesses` (`sms_reminders_enabled`, `whatsapp_reminders_enabled`, `reminder_message_template`).
- **Panel de configuración:** `CommunicationSettings` en Configuración — toggles de SMS/WhatsApp y editor de plantilla con vista previa en vivo, bloqueado visualmente (con CTA a Facturación) si el negocio no es Pro.
- **Pendiente para activar en producción:** (1) configurar los secretos `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER` en Supabase (Project Settings → Edge Functions → Secrets — son independientes del `.env.local` de Next.js), (2) comprar el número SMS y activar WhatsApp (sandbox o producción) en Twilio.

### Fase Pro — Módulo 1: Multi-empleado (completado)
- **Especialidad de empleado:** se agregó la columna `employees.specialty` (migración `0012_add_employee_specialty.sql`, aplicada en Supabase).
- **Esquema Pro versionado:** se documentó en el repo, como migración idempotente (`0011_pro_phase_tables_baseline.sql`), el esquema Pro que ya estaba ejecutado manualmente en Supabase (`employees`, `inventory_items`, `service_inventory`, `inventory_transactions`, `waiting_list`, `coupons`, y las columnas `deposit_amount`/`deposit_status`/`employee_id`).
- **Tipos TypeScript:** `src/types/database.ts` ahora incluye todas las tablas de la Fase Pro y los campos nuevos de `appointments`/`availability`.
- **Límite de empleados por plan:** `EmployeesManager` valida el límite (Básico: 1, Pro: 5) contra la suscripción activa (`getActiveBusinessPlan`), con aviso y CTA a Billing al alcanzar el tope.
- **Fix:** se corrigieron tipos faltantes (`BusinessProps`, `Employee`) en `booking-flow.tsx` que impedían compilar en modo estricto; se actualizó el test correspondiente.

### Rediseño de interfaz (Claude Design / manual)
- **Segunda pasada (encabezados + limpieza final):** se estandarizaron los encabezados de página (Servicios, Empleados, Citas, Calendario, Clientes, Configuración) con el mismo patrón título + subtítulo (`text-2xl font-semibold tracking-tight` + descripción en `text-muted-foreground`); se eliminaron los últimos residuos de `gray-*` literales en `payments-list`, `clients-list`, `calendar-view`, `appointments-manager` y `payment-methods-manager`.
- **Sistema de diseño unificado:** el dashboard ahora comparte paleta con `Agendalo-Landing` (esmeralda `#059669` + azul `#3B82F6`) vía tokens CSS en `globals.css`, tipografía Inter (`next/font/google`), y radios más suaves (`0.75rem`).
- **Sidebar rediseñado:** navegación agrupada por secciones (General / Negocio / Cuenta), iconos `lucide-react`, estados activos con tokens de marca.
- **Tokens en vez de colores fijos:** reemplazo sistemático de `gray-*`/`white`/`green-*` por `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`, `bg-primary` en dashboard y componentes compartidos (deja el sistema listo para modo oscuro).
- **Empleados:** tarjeta de aviso de límite de plan + CTA a Facturación.
- **Verificado:** `tsc --noEmit` ✓, `eslint` ✓. (`npm run build`/`vitest` no pudieron correr en este entorno por falta de red/binarios nativos disponibles en la sesión remota; recomendable correrlos localmente antes de desplegar).

## 31 de agosto de 2026

### Presentación comercial y precios
- **Material de venta:** se creó `PRESENTACION-Agendalo.md`, un documento de presentación comercial reutilizable (B2B, RD/LATAM, en español) para potenciales clientes de negocios de servicios (belleza, salud, gastronomía, fitness, etc.). Incluye: propuesta de valor, público objetivo, problema/solución, funcionalidades, marca blanca, stack tecnológico, planes/precios, ROI, onboarding, FAQ, casos de uso y contacto.
- **Precios definidos:** Plan **Basic RD$ 5,000/mes** · Plan **Pro RD$ 10,000/mes** (facturación mensual), con prueba gratuita de 14 días y sin comisión extra de Agendalo por transacción (solo la tarifa estándar del proveedor de pago).
- **PRD actualizado:** nueva sección 5.3 "Modelo de negocio y precios" (planes monthly en DOP), nota en la sección 20 de presupuesto, y re-numeración de subsecciones 5.4–5.7.
- **Landing page (guía):** se creó `LANDING-Agendalo.md`, blueprint del landing de ventas del producto: objetivo y CTAs, estructura de secciones (hero, problema, solución, funciones, sectores, testimonios, precios, FAQ, CTA final, footer), guía visual, SEO y notas de implementación técnica.

### Landing page construida (proyecto hermano)
- **Proyecto nuevo `Agendalo-Landing`** bajo `C:\Users\willi\Code\Proyects\SaaS\Agendalo-Landing`, a partir del diseño generado en **Google Stitch** (proyecto "Document Landing Page Generator", design system "Agendalo Design System": esmeralda `#059669` + azul `#3B82F6`, Inter, light).
- **Stack:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4 + lucide-react.
- **Secciones:** navbar, hero con mockup, problema (3 cards), bento de funciones, precios Basic RD$ 5,000 / Pro RD$ 10,000, FAQ (acordeón), CTA final y footer. Tokens del DS en `globals.css`.
- **Verificado:** `npm run build` ✓, `npm run lint` ✓, servidor dev responde 200 con el contenido completo.
- **Documentación:** `Agendalo-Landing/README.md` y `Agendalo-Landing/CHANGELOG-Agendalo-Landing.md`.
- **Nota:** los CTAs `/register`, `/login`, `/register?plan=*` se conectarán al onboarding/suscripción real del SaaS al desplegar.

### Testing (suite completa)
- **Framework:** Vitest 4 + React Testing Library 16 + jsdom + @vitejs/plugin-react-swc + @vitest/coverage-v8.
- **Config:** `vitest.config.ts` (alias `@/*`, entorno jsdom, globals, setup `vitest.setup.ts` que mockea `sonner`/`next/navigation` y `window.matchMedia`). Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`.
- **Refactor de lógica pura a libs testables:** se extrajeron `src/lib/currency.ts` (`toUsd`, `computeEndTime`, `generateTimeSlots`) y `booking-flow.tsx` ahora las usa (se eliminó código inline duplicado).
- **Tests (30 tests, 5 archivos):**
  - `src/lib/currency.test.ts` (11): conversión DOP→USD, fin de cita, generación de slots, casos de error.
  - `src/lib/paypal.test.ts` (4): `createPaypalOrder`/`capturePaypalOrder` con fetch mockeado — verifica monto USD, URL sandbox, idempotencia y manejo de errores PayPal (CURRENCY_NOT_SUPPORTED, ORDER_NOT_APPROVED).
  - `src/lib/service-payment.test.ts` (6): `finalizePaypalPayment` con Supabase + PayPal mockeados — sesión inexistente, idempotencia, mismatch de orderId, error de capture, flujo completo (cita + pago + email) y creación de usuario cliente por admin.
  - `src/components/settings/payment-methods-manager.test.tsx` (5): render de métodos, panel de conversión, upsert, error, tasa guardada.
  - `src/components/booking/booking-flow.test.tsx` (4): botón PayPal visible/sólo si habilitado, llamada a `/api/payments/paypal/create` + redirección a approveUrl, botón deshabilitado sin email/nombre.
- **ESLint:** se añadió override para permitir `any` en archivos de test (`**/*.test.{ts,tsx}`).
- **Cobertura:** 58% global; lógica crítica bien cubierta (currency 100%, service-payment 93.9%, payment-methods-manager 85.3%, utils 100%).
- **Verificado:** `npm test` (30/30), `npm run lint` (0 errores), `npm run build` (✓ + type-check OK).

### Pago online por servicio con PayPal (redirección)
- **Flujo:** en la confirmación del booking, si el negocio tiene PayPal habilitado + tasa de conversión, se muestra "Pagar ahora con PayPal (USD)".
- **Conversión:** PayPal no soporta DOP (verificado: `CURRENCY_NOT_SUPPORTED`), así que los pagos online se cobran en USD. Se agrega `paypal_conversion_rate` a `business_payment_methods` (migración `0010`) configurable en `/settings`.
- **Tabla `payment_sessions`** (migración `0010`): guarda el contexto de checkout (datos de cita, montos DOP/USD, orden PayPal) mientras se aprueba. RLS: dueños leen/actualizan; create/capture pasan por ruta server con service role.
- **API:**
  - `POST /api/payments/paypal/create` — verifica PayPal habilitado, crea sesión + orden PayPal (Orders v2), devuelve `approveUrl`. Redirige al cliente a PayPal.
  - `POST /api/payments/paypal/capture` — captura la orden (idempotente), crea la cita (status `confirmed`), inserta el pago completado (USD, `method=paypal`), marca la sesión `completed` y envía email de confirmación.
- **Refactor a lib compartido:** `src/lib/service-payment.ts` → `finalizePaypalPayment()` usado por el API de capture y la página de retorno.
- **PayPal lib:** `createPaypalOrder()` y `capturePaypalOrder()` agregados a `src/lib/paypal.ts`.
- **Páginas públicas:** `/paypal-return` (confirma y muestra resultado) y `/paypal-cancel` (pago cancelado).
- **UI booking:** botón PayPal en step 3 de `booking-flow.tsx`; `book/page.tsx` pasa `paypalEnabled` y `paypalConversionRate`.
- **Config:** `payment-methods-manager.tsx` ahora permite configurar la tasa de conversión DOP→USD.
- **Verificado end-to-end:** create genera orden PayPal real (`5PW87242M8510872P`, 1000 DOP → 16.67 USD @ tasa 60) y sesión `pending` en DB; capture maneja correctamente una orden no aprobada (error limpio, sin crash).

### Migración Middleware → Proxy (Next.js 16)
- `src/middleware.ts` → `src/proxy.ts` (export `middleware` → `proxy`).
- Helper `src/lib/supabase/middleware.ts` → `src/lib/supabase/proxy.ts` (export `updateSession` intacto).
- El matcher y la lógica de protección de rutas (`protectedRoutes`) se mantienen iguales.
- Verificado: el dev server arranca sin warning de deprecación de `middleware`.

### Configuración de métodos de pago (/settings)
- Nueva tabla `business_payment_methods` (migración `0009_create_business_payment_methods.sql`): `business_id`, `type` (`paypal`|`transfer`), `is_enabled`, `bank_name`, `account_holder`, `account_number`, `transfer_notes`, timestamps, `UNIQUE(business_id, type)`.
- RLS: dueños gestionan sus métodos (`FOR ALL` con check de owner); lectura pública para que la página de reserva muestre los datos de transferencia.
- Componente `src/components/settings/payment-methods-manager.tsx`: toggles para PayPal y Transferencia, y formulario de datos bancarios para transferencia (banco, titular, número de cuenta, instrucciones). Guarda vía `upsert` en `business_payment_methods`.
- Página `/settings` actualizada para cargar los métodos existentes.
- Página pública `/book` muestra los datos de transferencia en la pantalla de confirmación si el negocio tiene el método de transferencia habilitado y configurado.

### Estados
- Lint 100% limpio (0 errors, 0 warnings).
- Build de producción compila y TypeScript pasa.
- Dev server arranca sin warning de middleware deprecado.
- Advisors de seguridad sin nuevas alertas (los 3 existentes se mantienen sin cambios).

### Verificación
- `npm run lint` → limpio.
- `npm run build` → compila y TypeScript pasa.
- Arranque de dev server: sin deprecación de middleware, ruta proxy activa.
- Advisors: sin alertas nuevas (tabla nueva con RLS correcto).

## Funcionalidades completadas esta sesión (pagos e imágenes)

#### Dashboard de Pagos (`/payments`)
- Nueva página `src/app/(dashboard)/payments/page.tsx` (server) + componente `src/components/payments/payments-list.tsx`.
- Tarjetas de métricas: ingresos totales, pagos completados, pendientes y total de registros.
- Tabla de historial con columna servicio/fecha/monto/método/estado/referencia, filtros por estado y búsqueda.
- Ítem "Pagos" (💰) agregado al sidebar del dashboard y a `protectedRoutes` en `middleware.ts`.

#### Registro de pago manual
- Acción "Registrar pago" en `appointments-manager.tsx` para citas con estado `completed`.
- Pide el monto (prefill = precio del servicio) e inserta un pago `method=transfer` / `status=completed`.
- Select de appointments ampliado para incluir `business_id`, `services(name, price, currency)`.

#### Upload de imágenes (Supabase Storage)
- Bucket público `business-assets` (límite 5 MB, tipos PNG/JPEG/WebP/GIF) — migración `0008_create_business_assets_bucket.sql`.
- Sin políticas de escritura públicas (`storage.objects` sin policies) → sube solo vía service role.
- Ruta server `src/app/api/upload/route.ts`: valida mime/tamaño y ownership del negocio (RLS), sube a `businesses/{businessId}/{uuid}.{ext}` y devuelve la URL pública.
- Helper `src/lib/storage.ts` (`getBucketUrl`, `publicUrl`).
- Componente reutilizable `src/components/ui/image-upload.tsx` (preview + quitar).
- Logo del negocio: campo `logo_url` añadido a `BusinessSettings` (form + update); la página pública ya lo mostraba.
- Imagen de servicio: campo `image_url` añadido al form de `ServicesManager` (create/update).

#### Recuperación de contraseña
- Páginas `/forgot-password` y `/reset-password` (grupo `(auth)`).
- Navegación interna corregida (`useRouter().push` en vez de `window.location.href`).

### Estados
- Lint 100% limpio (0 errors, 0 warnings).
- Build de producción pasa y registra las rutas nuevas (`/payments`, `/api/upload`, `/forgot-password`, `/reset-password`).
- Advisors de seguridad sin nuevas alertas (los existentes: `sent_reminders` sin policy, `pg_net` en public, leaked-password protection — pre-existentes).

### Verificación
- `npm run lint` → limpio.
- `npm run build` → compila y TypeScript pasa.
- Policies de payments verificadas (INSERT + SELECT para dueños) y storage sin writes públicos.

## Trabajo previo (resumen, Fase 1 Core)
- Booking público `/[business]` + `/[business]/book` (wizard servicio → fecha → datos del cliente).
- Onboarding de negocio (wizard 3 pasos), CRUD de servicios, settings del negocio + horarios.
- Dashboard: `/overview`, `/appointments`, `/clients`, `/calendar`, `/history`.
- Notificaciones por email (Resend), recordatorios 24h (Edge Function + pg_cron), cancelación por token.
- Billing PayPal completo (suscripciones Basic/Pro en USD), RLS, recuperación de contraseña.
- Migraciones locales `0001`–`0008` reconciliadas con la DB remota.
