# 📅 Agendalo

**Sistema de reservas en línea (SaaS) para negocios de servicios en República Dominicana y Latinoamérica.**

Agendalo le da a cada negocio (barberías, salones de belleza, consultorios, estudios de fitness, etc.) su propia página pública donde los clientes reservan citas en pocos pasos, y un panel de administración para gestionar servicios, horarios, empleados, citas, clientes y pagos desde un solo lugar.

<!-- 📸 Agrega aquí 2–3 capturas: página pública de reserva, dashboard y vista de citas -->
<!-- ![Página de reserva](docs/screenshots/booking.png) -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

> 🔗 **Demo:** _próximamente_ · 📄 [PRD](PRD-Agendalo.md) · 📝 [Changelog](CHANGELOG-Agendalo.md)

---

## 🎯 El problema que resuelve

Muchos negocios de servicios todavía agendan por WhatsApp, llamadas o una libreta: se pierden citas, hay clientes que no se presentan y no existe un registro claro de ingresos. Agendalo automatiza ese proceso:

- El cliente **reserva solo, 24/7**, viendo únicamente los horarios disponibles.
- El negocio recibe la cita **confirmada y organizada** en su calendario.
- Los **recordatorios automáticos** y los **depósitos de garantía** reducen las ausencias (no-shows).
- Todos los **pagos quedan registrados** y se pueden exportar en reportes.

---

## ✨ Funcionalidades

### Para los clientes del negocio
- **Página pública por negocio** (`/[negocio]`) con logo, servicios, precios y duración.
- **Reserva guiada en pasos:** servicio → fecha → hora disponible → datos del cliente.
- Generación automática de horarios disponibles según la agenda del negocio, **sin solapamientos**.
- **Pago en línea con PayPal** o datos para transferencia bancaria.
- **Correo de confirmación** y enlace para cancelar la cita.

### Para el negocio (dashboard)
- **Onboarding** del negocio en 3 pasos.
- **Resumen del día**, citas próximas y métricas rápidas.
- **Servicios:** crear, editar y desactivar servicios con imagen, precio y duración.
- **Citas:** confirmar, cancelar, reprogramar y registrar pagos manuales.
- **Calendario**, **clientes** e **historial**.
- **Pagos:** historial con filtros y búsqueda, métricas de ingresos y exportación a **CSV y PDF**.
- **Configuración:** horarios, datos del negocio, métodos de pago y tasa de conversión DOP → USD.

### Plan Pro
- **Multi-empleado:** gestión del equipo con especialidad y límite por plan (Basic: 1, Pro: 5).
- **Depósitos de garantía:** el negocio exige un porcentaje o monto fijo al reservar, cobrado vía PayPal.
- **Reportes financieros** exportables.

### Suscripciones
- Planes **Basic** y **Pro** con cobro recurrente mediante **suscripciones de PayPal**.
- Prueba gratuita de 14 días.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 |
| Lenguaje | TypeScript |
| Estilos / UI | Tailwind CSS 4 · shadcn/ui · lucide-react |
| Backend | Supabase: PostgreSQL, Auth, Storage, Edge Functions, `pg_cron` |
| Seguridad de datos | Row Level Security (RLS) multi-tenant |
| Pagos | PayPal (Orders v2 + Subscriptions + Webhooks) |
| Correos | [Resend](https://resend.com) |
| Validación | Zod |
| Reportes | jsPDF + jspdf-autotable |
| Testing | Vitest · React Testing Library · jsdom |

---

## 🧱 Arquitectura

```
src/
├── app/
│   ├── (auth)/         # Login, registro, recuperación de contraseña
│   ├── (dashboard)/    # Panel del negocio: overview, citas, servicios, pagos, etc.
│   ├── (public)/       # Página pública del negocio y flujo de reserva
│   └── api/            # Pagos PayPal, billing, emails, subida de imágenes
├── components/         # UI (shadcn) y componentes por dominio (booking, settings, payments…)
├── lib/                # Lógica pura y clientes: supabase, paypal, moneda, pagos, storage
├── types/              # Tipos de la base de datos
└── proxy.ts            # Protección de rutas y sesión (Next.js 16)

supabase/
├── migrations/         # Esquema versionado (18 migraciones SQL)
└── functions/
    └── appointment-reminders/   # Edge Function de recordatorios (ejecutada por pg_cron)
```

**Decisiones clave:**
- **Multi-tenant con RLS:** cada negocio solo puede leer y modificar sus propios datos, aplicado a nivel de base de datos, no solo en el frontend.
- **Montos calculados en el servidor:** los precios y depósitos se recalculan server-side contra la base de datos; el navegador nunca decide cuánto se cobra.
- **Conversión DOP → USD:** PayPal no admite pesos dominicanos, así que los pagos en línea se cobran en USD con una tasa configurable por negocio.

---

## 🔒 Seguridad

El módulo de pagos pasó por una revisión de QA y pentest, y se corrigieron vulnerabilidades reales antes de darlo por terminado:

- Políticas RLS que permitían a un negocio **activarse el plan Pro sin pagar**.
- Montos de depósito que se podían **manipular desde el navegador**.
- Webhook de PayPal **sin verificación de firma**; ahora se valida contra la API de PayPal y falla cerrado.
- Rutas de correo abiertas con riesgo de **inyección HTML**: se añadió escapado, secreto interno y rate limiting.
- Datos bancarios de los negocios **expuestos por una política de lectura pública**.

El detalle completo está en el [Changelog](CHANGELOG-Agendalo.md).

---

## 🧪 Testing

```bash
npm test               # corre la suite (Vitest)
npm run test:coverage  # reporte de cobertura
```

Cubre la conversión de moneda y generación de horarios, el cliente de PayPal (idempotencia y manejo de errores), la finalización de pagos, el flujo de reserva y la configuración de métodos de pago, además de casos de expiración y solapamiento de citas.

---

## 🚀 Cómo correrlo localmente

**Requisitos:** Node.js 20+, una cuenta de [Supabase](https://supabase.com) y credenciales sandbox de [PayPal Developer](https://developer.paypal.com).

```bash
# 1. Clonar e instalar
git clone https://github.com/willrd14/Agendalo.git
cd Agendalo
npm install

# 2. Variables de entorno
cp .env.example .env.local
# completa .env.local con tus propias credenciales

# 3. Base de datos: aplica las migraciones en tu proyecto de Supabase
npx supabase link --project-ref <tu-project-ref>
npx supabase db push

# 4. Levantar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests con Vitest |

> ⚠️ Nunca subas `.env.local` al repositorio. Las claves `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_SECRET` y `RESEND_API_KEY` solo deben existir en el servidor.

---

## 🗺️ Roadmap

- [x] Reservas públicas, dashboard, correos y recordatorios
- [x] Suscripciones Basic / Pro con PayPal
- [x] Pagos por servicio y depósitos de garantía
- [x] Multi-empleado
- [x] Reportes CSV / PDF
- [ ] Recordatorios por SMS (Twilio), en progreso
- [ ] Lista de espera inteligente
- [ ] Control de inventario por servicio
- [ ] Cupones de descuento
- [ ] Integración con Google Calendar
- [ ] Despliegue en producción

---

## 👤 Autor

**Williams Villavizar**: desarrollador web · Santo Domingo, República Dominicana

[Portafolio](https://portafolio.w-tech.uk) · [GitHub](https://github.com/willrd14) · [LinkedIn](https://www.linkedin.com/in/williams-rafael)
