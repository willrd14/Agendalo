# PRD: Agendalo - Sistema de Reservas SaaS

## Información General
- **Nombre del Proyecto:** Agendalo
- **Dominio:** agendalo.com
- **Fecha:** 31 de agosto de 2026
- **Versión:** 1.0
- **Estado:** Aprobado
- **Timeline:** 1 mes

---

## 1. Descripción General
Agendalo es un SaaS de sistema de reservas/agendamiento online para negocios generales. Permite a los clientes reservar citas/cupos de manera online, mientras los administradores gestionan servicios, horarios, clientes y pagos desde un dashboard completo.

**Público objetivo:** Negocios de servicios en general (belleza, salud, gastronomía, fitness, etc.)

---

## 2. Objetivos
- **Objetivo Principal:** Permitir a negocios gestionar sus reservas de forma online y profesional
- **Objetivos Secundarios:**
  - Reducir no-shows con notificaciones
  - Aumentar ingresos con pagos online
  - Dar visibilidad a negocios con páginas públicas
  - Escalar con modelo de suscripción

---

## 3. Stack Tecnológico
- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Base de datos:** PostgreSQL (Supabase) + Redis (cache futuro)
- **Auth:** Supabase Auth (Email/password)
- **Storage:** Supabase Storage (imágenes)
- **Email:** Resend
- **SMS:** Twilio
- **Pagos:** PayPal + Transferencia bancaria
- **Deploy:** Vercel
- **Cloud:** Cloudflare (DNS, CDN)
- **Calendar:** Google Calendar API

---

## 4. Arquitectura
```
src/
├── app/                    # App Router (Next.js 14+)
│   ├── (auth)/             # Rutas de autenticación
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/        # Dashboard del admin
│   │   ├── overview/
│   │   ├── services/
│   │   ├── appointments/
│   │   ├── clients/
│   │   ├── calendar/
│   │   ├── payments/
│   │   ├── settings/
│   │   └── billing/
│   ├── (public)/           # Páginas públicas
│   │   ├── [business]/
│   │   └── book/
│   ├── api/                # API routes
│   └── layout.tsx
├── components/             # Componentes reutilizables
│   ├── ui/                 # UI components (shadcn)
│   ├── forms/              # Formularios
│   ├── calendar/           # Calendario
│   └── booking/            # Flow de reserva
├── lib/                    # Utilidades
│   ├── supabase/           # Config Supabase
│   ├── resend/             # Email service
│   ├── twilio/             # SMS service
│   ├── paypal/             # Pagos
│   └── google-calendar/    # Integración GC
├── types/                  # TypeScript types
└── styles/                 # Estilos globales
```

---

## 5. Funcionalidades Principales

### 5.1 Autenticación
- Registro de negocio (onboarding)
- Login email/password
- Recuperación de contraseña
- Confirmación de email
- Sesiones persistentes

### 5.2 Dashboard Admin
- **Overview:** Resumen del día, citas próximas, métricas rápidas
- **Services:** CRUD de servicios (nombre, descripción, duración, precio, imagen)
- **Appointments:** Listado y gestión de citas (confirmar, cancelar, reprogramar)
- **Clients:** Listado de clientes que han reservado
- **Calendar:** Vista calendario de disponibilidad
- **Payments:** Historial de pagos, facturas
- **Settings:** Configuración del negocio
- **Billing:** Gestión de suscripción

### 5.3 Modelo de negocio y precios (Suscripción mensual)
Los negocios se suscriben a uno de dos planes para usar Agendalo. Incluye **prueba
gratuita de 14 días** y **no se cobra comisión extra** de Agendalo por transacción
(solo la tarifa estándar del proveedor de pago).

| Plan | Precio mensual | Facturación | Límite Citas/mes | Empleados |
|---|---|---|---|---|
| **Basic** | RD$ 5,000 | Mensual | 50 | 1 |
| **Pro** | RD$ 10,000 | Mensual | Ilimitadas | Hasta 5 |

#### 5.3.1 Características Exclusivas Plan Pro
Para justificar el valor premium y aumentar la rentabilidad, el Plan Pro incluye:

**1. Automatización y Retención (Anti-No-Show):**
- **Multi-canal:** Recordatorios vía WhatsApp y SMS (Twilio), además de email.
- **Lista de Espera Inteligente:** Notificación automática a clientes en espera cuando se libera un espacio.
- **Marketing de Recurrencia:** Emails automáticos post-servicio para incentivar nuevas citas.

**2. Gestión de Negocios Escalables:**
- **Soporte Multi-empleado:** Gestión de equipo, asignación de citas por empleado y calendarios independientes.
- **Control de Inventario:** Descuento automático de insumos vinculados a cada servicio realizado.
- **Analítica Avanzada:** Reportes financieros detallados, exportación a PDF/CSV y KPIs de rentabilidad por servicio.

**3. Experiencia Premium del Cliente:**
- **Depósitos de Garantía:** Cobro de un porcentaje del servicio al reservar para asegurar la cita.
- **Dominios Personalizados (White Label):** Capacidad de usar un dominio propio (ej. `reservas.tunegocio.com`).
- **Cupones de Descuento:** Creación de códigos promocionales para campañas de marketing.

- **Moneda:** DOP (pesos dominicanos).
- **Cobro de suscripción:** se procesa vía PayPal (suscripciones recurrentes con los
  planes `PAYPAL_PLAN_BASIC_ID` y `PAYPAL_PLAN_PRO_ID`).
- **Pagos de servicios (dentro del producto):** aparte de la suscripción, los negocios
  pueden cobrar a sus clientes por servicio vía PayPal (en USD, con tasa de conversión
  configurable) y transferencia bancaria.


### 5.4 Sistema de Reservas (Cliente)
- **Flow wizard:**
  1. Seleccionar servicio
  2. Elegir fecha disponible
  3. Seleccionar hora disponible
  4. Confirmar reserva
- Página pública del negocio
- Cancelación con restricción (configurable)
- Historial de citas del cliente

### 5.5 Notificaciones
- Email de confirmación de reserva
- Recordatorios configurables (24h, 2h, 30min antes)
- Email de cancelación
- SMS opcional (Twilio)

### 5.6 Pagos
- Cobro de servicios (PayPal + transferencia)
- Historial de transacciones
- Facturas/basuras
- Configuración de métodos de pago

### 5.7 Integraciones
- Google Calendar (exportar citas)
- Páginas públicas personalizables
- Widget embeddable (futuro)

---

## 6. Base de Datos

### 6.1 Tablas Principales

**users**
- id (uuid, PK)
- email (text, unique)
- password_hash (text)
- full_name (text)
- phone (text, nullable)
- avatar_url (text, nullable)
- timezone (text, default: 'America/Santo_Domingo')
- created_at (timestamp)
- updated_at (timestamp)

**businesses**
- id (uuid, PK)
- owner_id (uuid, FK → users)
- name (text)
- slug (text, unique) - para URL pública
- description (text, nullable)
- logo_url (text, nullable)
- cover_url (text, nullable)
- primary_color (text, default: '#059669')
- secondary_color (text, default: '#3B82F6')
- phone (text)
- email (text)
- address (text, nullable)
- timezone (text)
- currency (text, default: 'DOP')
- cancellation_hours (int, default: 24)
- created_at (timestamp)
- updated_at (timestamp)

**services**
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- name (text)
- description (text, nullable)
- duration_minutes (int)
- price (decimal)
- currency (text)
- image_url (text, nullable)
- is_active (boolean, default: true)
- created_at (timestamp)

**availability**
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- day_of_week (int) - 0=domingo, 6=sábado
- start_time (time)
- end_time (time)
- is_active (boolean)

**appointments**
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- service_id (uuid, FK → services)
- client_id (uuid, FK → users)
- employee_id (uuid, FK → users, nullable)
- date (date)
- start_time (time)
- end_time (time)
- status (enum: pending, confirmed, cancelled, completed)
- notes (text, nullable)
- cancellation_reason (text, nullable)
- google_calendar_event_id (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

**subscriptions**
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- plan (enum: basic, pro)
- status (enum: active, cancelled, past_due)
- paypal_subscription_id (text, nullable)
- current_period_start (timestamp)
- current_period_end (timestamp)
- created_at (timestamp)

**payments**
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- appointment_id (uuid, FK → appointments, nullable)
- amount (decimal)
- currency (text)
- method (enum: paypal, transfer)
- status (enum: pending, completed, failed, refunded)
- paypal_transaction_id (text, nullable)
- created_at (timestamp)

**notifications**
- id (uuid, PK)
- user_id (uuid, FK → users)
- type (enum: email, sms)
- subject (text)
- content (text)
- status (enum: pending, sent, failed)
- sent_at (timestamp, nullable)
- created_at (timestamp)

**reviews** (futuro)
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- client_id (uuid, FK → users)
- appointment_id (uuid, FK → appointments)
- rating (int, 1-5)
- comment (text, nullable)
- created_at (timestamp)

### 6.2 Relaciones
- Un user puede tener múltiples businesses (owner)
- Un business tiene múltiples services
- Un business tiene múltiples availability
- Un business tiene múltiples appointments
- Un service tiene múltiples appointments
- Un user (client) tiene múltiples appointments
- Un business tiene 1 subscription activa
- Un business tiene múltiples payments

---

## 7. APIs Externas

### 7.1 Google Calendar API
- **Uso:** Exportar citas al calendario del admin
- **Auth:** OAuth 2.0
- **Endpoints:** Events (create, update, delete)

### 7.2 Resend (Email)
- **Uso:** Emails transaccionales (confirmaciones, recordatorios)
- **Envío desde:** notifications@agendalo.com

### 7.3 Twilio (SMS)
- **Uso:** SMS de recordatorio opcional
- **Envío:** Solo para usuarios que activen SMS

### 7.4 PayPal
- **Uso:** Cobro de suscripciones y servicios
- **Integración:** PayPal SDK + Webhooks

---

## 8. Autenticación
- **Método:** Email + contraseña (Supabase Auth)
- **Confirmación:** Email de verificación al registrarse
- **Recuperación:** Email para resetear contraseña
- **Reglas contraseña:** Mín 8 caracteres, 1 mayúscula, 1 número
- **Sesiones:** Persistentes (Supabase manages)

---

## 9. Roles de Usuario

### Admin (Dueño del negocio)
- Gestiona servicios, horarios, citas
- Ve estadísticas y pagos
- Configura negocio
- Gestiona suscripción

### Cliente
- Reserva citas
- Ve historial de citas
- Cancela citas (según política)
- Gestiona su perfil

---

## 10. Diseño UI/UX
- **Estilo:** Profesional, limpio, funcional
- **Paleta de colores:**
  - Primary: #059669 (Verde)
  - Secondary: #3B82F6 (Azul)
  - Neutral: Gray scale
  - Success: #10B981
  - Warning: #F59E0B
  - Error: #EF4444
- **Tipografía:** Inter o similar
- **Componentes:** shadcn/ui

---

## 11. Deploy
- **Estado actual:** Local (desarrollo/pruebas)
- **Plataforma futura:** Vercel
- **Dominio:** agendalo.com (pendiente de compra)
- **SSL:** Automático (cuando se deploye)
- **Variables de entorno:** .env.local (local), Vercel Environment Variables (producción)

**Nota:** Deploy en espera hasta comprar el dominio. Por ahora solo desarrollo local.

---

## 12. Variables de Entorno
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=

# App
NEXT_PUBLIC_SITE_URL=https://agendalo.com
NEXT_PUBLIC_APP_NAME=Agendalo

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 13. Testing
- **Tipos:** Unit tests + Integration tests
- **Framework:** Vitest
- **Cobertura objetivo:** 80%+
- **Enfoque:** Components, hooks, utils, API routes

---

## 14. Rendimiento
- **Optimizaciones:**
  - Next.js App Router (RSC, Streaming)
  - Lazy loading de componentes
  - Imágenes optimizadas (next/image)
  - caching de datos públicos
- **Métricas objetivo:**
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

---

## 15. Seguridad
- **Auth:** Supabase RLS (Row Level Security)
- **Validación:** Zod schemas en todas las API routes
- **Sanitización:** DOMPurify para contenido HTML
- **CORS:** Configurar para agendalo.com
- **Rate limiting:** En Edge Functions
- **Secrets:** Nunca en frontend

---

## 16. Accesibilidad
- **WCAG:** Nivel AA
- **Componentes:** Focus management, ARIA labels
- **Testing:** Lighthouse accessibility audit

---

## 17. SEO
- **SSR:** Para páginas públicas
- **Meta tags:** Título, descripción, Open Graph
- **Sitemap:** Generado automáticamente
- **Robots:** Configurado
- **Schema.org:** LocalBusiness para negocios

---

## 18. Monitoreo
- **Logs:** Supabase Logs
- **Analytics:** Custom analytics (próprio)
- **Errores:** Sentry (futuro)
- **Performance:** Web Vitals

---

## 19. Escalabilidad
- **Crecimiento esperado:** 100-1000 negocios en primer año
- **Estrategia:**
  - Supabase escala automáticamente
  - Vercel edge network
  - Redis para cache (futuro)

---

## 20. Presupuesto Mensual
> Costos de infraestructura para operar el SaaS (distintos a lo que se cobra a los
> clientes, ver sección 5.3: Basic RD$ 5,000/mes · Pro RD$ 10,000/mes).

- **Supabase:** $0 (free tier) → $25 (pro)
- **Vercel:** $0 (hobby) → $20 (pro)
- **Resend:** $0 (100 emails/día)
- **Twilio:** Pay per SMS (~$0.01/SMS)
- **PayPal:** Solo comisión por transacción
- **Dominio:** ~$12/año
- **Total estimado:** $0-$50/mes

---

## 21. Timeline (1 mes)

### Fase 1: Core (Semana 1)
- Setup proyecto (Next.js + Supabase)
- Auth (login, registro, onboarding)
- CRUD básico (services, availability)
- Esquema de base de datos

### Fase 2: Features (Semana 2)
- Flow de reserva (wizard completo)
- Dashboard admin (overview, calendar)
- Notificaciones email (Resend)
- Páginas públicas

### Fase 3: Monetización (Semana 3)
- Pagos (PayPal)
- Sistema de suscripciones
- Billing dashboard
- Transferencia bancaria

### Fase 4: Deploy (Semana 4)
- Deploy a Vercel
- Dominio agendalo.com
- Testing completo
- Documentación
- Launch

---

## 22. Equipo
- **Desarrollador:** Williams R. Villavizar Hdez.
- **Responsabilidades:** Todo (full-stack)

---

## 23. Riesgos
- **Sin clientes mitigación:** Marketing en redes, prueba gratuita
- **Experiencia limitada:** Usar stack conocido (Next.js + Supabase)
- **Abandono:** Establecer mini-deadlines semanales
- **Scope creep:** Seguir PRD estrictamente

---

## 24. MVP (Mínimo Viable)
1. ✅ Onboarding de negocio
2. ✅ CRUD de servicios
3. ✅ Configuración de horarios
4. ✅ Flow de reserva simple
5. ✅ Notificaciones por email
6. ✅ Dashboard básico
7. ✅ Página pública

---

## 25. Roadmap (Futuras Mejoras)
- **v1.1:** Pagos online completos
- **v1.2:** App móvil (React Native)
- **v1.3:** Multi-sucursal
- **v1.4:** Reseñas y ratings
- **v1.5:** Integraciones (Google Calendar completa)
- **v2.0:** IA para sugerencias, Marketplace

---

## 26. Criterios de Éxito
1. Negocio puede registrarse y configurar servicios
2. Cliente puede reservar cita online
3. Admin ve todas las citas en dashboard
4. Notificaciones se envían correctamente
5. Pagos se procesan
6. Página pública funciona
7. Deploy exitoso en Vercel

---
*PRD creado el 31 de agosto de 2026*
*Estado: Aprobado para desarrollo*