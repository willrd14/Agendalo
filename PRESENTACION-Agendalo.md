# Agendalo — Presentación del Producto

**Sistema de reservas online para negocios de servicios**
*Material de venta — República Dominicana / LATAM*

> **Nota interna:** Precios de planes configurados (Basic RD$ 5,000/mes · Pro RD$ 10,000/mes).

---

## 1. Agendalo en una frase

**Agendalo** es la forma más sencilla de que tu negocio reciba, gestione y cobre
**reservas online** sin necesidad de llamadas, mensajes ni planillas manuales.

Tus clientes reservan por internet en **tu propia página**, eligiendo servicio, fecha y
hora desde su teléfono, y tú lo ves al instante en un panel de control fácil de usar.

---

## 2. Para quién es

Agendalo está pensado para **negocios de servicios** que venden tiempo y atención:

| Sector | Ejemplos |
|---|---|
| Belleza y estética | Salones, barberías, spas, uñas, cejas |
| Salud y bienestar | Clínicas, consultorios, fisioterapia, nutrición |
| Gastronomía | Restaurantes con reserva de mesa, cafeterías |
| Fitness | Gimnasios, academias, entrenadores personales |
| Servicios profesionales | Consultorías, coaching, reparaciones |
| Educación | Academias, tutorías, talleres |

---

## 3. El problema que resolvemos

- **Pérdida de llamadas y mensajes:** El teléfono suena a cualquier hora y las reservas
  se pierden o se anotan mal.
- **No-shows:** Los clientes reservan y no aparecen, sin ningún cobro ni recordatorio.
- **Gestión manual:** Planillas, papel, WhatsApp con muchos mensajes y errores.
- **Sin presencia digital:** El cliente no puede ver horarios ni reservar sin contactar.
- **Cobros complicados:** Difícil cobrar por adelantado o llevar control de lo que deben.

---

## 4. La solución: cómo funciona Agendalo

### Para el cliente (reserva en línea)
1. Abre **tu página pública** (ej. `tu-negocio.agendalo.app`).
2. Ve tus **servicios** con precio, duración y fotos.
3. Elige la **fecha** y **hora** disponibles (solo ve cupos reales).
4. Llena sus datos y **confirma**.
5. Recibe al instante un **email de confirmación** con su cita.
6. Puede **cancelar** fácilmente con un enlace seguro (respetando tu política de
   antelación) y ver su **historial de citas**.

### Para ti (dueño del negocio)
1. Creas tu cuenta y **configuras** tu negocio en minutos.
2. Registras tus **servicios** (nombre, duración, precio, foto).
3. Defines tus **horarios de disponibilidad** por día de la semana.
4. Ves **todas las citas** en un panel claro, con filtros y resumen diario.
5. **Cobras** online (PayPal) o registras transferencias.
6. **Recibes** confirmaciones, cancelaciones y recordatorios automáticos.

---

## 5. Funcionalidades principales

### 5.1 Reservas online (para tus clientes)
- Página pública **con tu marca**: tu nombre, logo y colores.
- Selección de servicio → fecha → hora en un asistente de 3 pasos.
- Solo se muestran **horarios realmente disponibles** (evita dobles reservas).
- Confirmación y cancelación por email.
- Historial de citas del cliente.

### 5.2 Panel de control (admin)
- **Resumen:** citas de hoy, próximas citas y métricas rápidas.
- **Servicios:** administra lo que ofreces (duración, precio, imagen, activo/inactivo).
- **Citas:** listado con estado (pendiente, confirmada, cancelada, completada),
  confirmar, reprogramar y marcar como pagadas.
- **Clientes:** todos los que han reservado contigo.
- **Calendario:** vista de tu disponibilidad y ocupación.
- **Pagos:** historial, ingresos totales, filtros y búsqueda.
- **Configuración:** datos de tu negocio, métodos de pago y marcas.

### 5.3 Horarios y disponibilidad
- Define tu horario de atención por día (apertura y cierre).
- El sistema calcula automáticamente los cupos según la **duración de cada servicio**.
- Tú decides los días de trabajo y las horas de atención.

### 5.4 Notificaciones automáticas
- **Email de confirmación** al reservar.
- **Recordatorios** configurables (ej. 24 h antes) para reducir no-shows.
- **Email de cancelación**.
- Notificaciones a ti como dueño del negocio.

### 5.5 Pagos
- **Pago online** de servicios con **PayPal** (conversión automática a USD según tu
  tasa configurable).
- **Transferencia bancaria**: muestras tus datos de cuenta al cliente en la reserva.
- **Registro manual** de pagos por transferencia.
- **Historial de ingresos** y control de cobros.
- Métodos de pago configurables (PayPal y/o transferencia).

### 5.6 Seguridad y confianza
- Cada negocio y cliente tienen **su cuenta protegida**.
- **Cifrado y control de acceso** a nivel de fila en la base de datos (RLS).
- Recuperación de contraseña por email.
- Datos aislados: cada negocio solo ve lo suyo.

---

## 6. Tu marca, no la nuestra (marca blanca)

- Tu **página pública** se ve como **tuya**: tu logo, tu nombre y tus colores.
- Sin publicidad de terceros ni de Agendalo en tu página.
- Tú compartes el enlace de tu página para que tus clientes reserven directo.

---

## 7. Stack tecnológico (para tu confianza)

Agendalo está construido sobre una base **moderna, rápida y segura**:

| Capa | Tecnología |
|---|---|
| Aplicación web | Next.js 16 (React) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | PostgreSQL (Supabase) con copias y respaldo gestionado |
| Autenticación | Supabase Auth (email y contraseña) |
| Almacenamiento | Supabase Storage (logos e imágenes de servicios) |
| Emails | Resend (confirmaciones y recordatorios) |
| Pagos | PayPal (Checkout) + Transferencia bancaria |
| Servidores | Edge network global (Cloudflare / Vercel) |
| Calidad | Suite de pruebas automatizadas (30 tests) |

Beneficios para ti:
- Rápido: las páginas se cargan en milisegundos.
- Escalable: funciona con 1 o con miles de reservas.
- Seguro: tu información está protegida.
- Siempre disponible: sin mantenimiento de tu parte.

---

## 8. Planes y precios

Todos los planes incluyen **prueba gratuita** y no cobramos comisión extra por
transacción (solo la tarifa estándar que cobra el proveedor de pago).

| | **Basic** | **Pro** |
|---|---|---|
| Página pública con tu marca | ✅ | ✅ |
| Reservas online ilimitadas | ✅ | ✅ |
| Gestión de servicios | ✅ | ✅ |
| Horarios y disponibilidad | ✅ | ✅ |
| Panel de control (citas, clientes) | ✅ | ✅ |
| Notificaciones por email | ✅ | ✅ |
| Pagos (PayPal + transferencia) | ✅ | ✅ |
| **Precio mensual** | **RD$ 5,000** | **RD$ 10,000** |
| Prueba gratuita | **14 días** | **14 días** |

> Precios en pesos dominicanos (DOP), facturación mensual por suscripción.

**Nota comercial:** con solo **2–4 reservas pagadas extra al mes gracias a la reserva
online y los recordatorios**, Agendalo se paga solo. El objetivo es reducir no-shows y
perder menos clientes, no gastar en herramientas complicadas.

---

## 9. Costos y reducción de pérdidas (para el negocio)

- **Menos no-shows:** los recordatorios automáticos reducen las citas que no se presentan.
  Una cita perdida de un servicio de RD$1,000 ya justifica una buena parte del plan.
- **Menos llamadas:** tus clientes reservan solos; tú dedicas tu tiempo a atender.
- **Cobros por adelantado:** el pago online evita clientes que no pagan.
- **Imagen profesional:** tener reservas online transmite confianza y orden.

---

## 10. Cómo empezar (onboarding en minutos)

1. **Crea tu cuenta** gratis (prueba de 14 días).
2. **Configura tu negocio** (nombre, logo, colores).
3. **Agrega tus servicios** y horarios.
4. **Comparte tu enlace** público con tus clientes.
5. Empieza a recibir reservas y pagos online.

---

## 11. Preguntas frecuentes

- **¿Necesito conocimientos técnicos?** No. Todo es visual y guiado.
- **¿Mis clientes necesitan crearse una cuenta?** No. Reservan con su email.
- **¿Puedo probar antes de pagar?** Sí, con la prueba gratuita de 14 días.
- **¿Cómo cobro?** Por PayPal (online) y/o mostrando tus datos de transferencia.
- **¿Qué pasa si cancelan?** Recibes aviso y llevas control; tú defines la política de
  antelación.
- **¿Puedo cambiar de plan después?** Sí, según disponibilidad del producto.

---

## 12. Empresas que se benefician (ejemplos de uso)

- **Salón de belleza:** reduce las llamadas y llena huecos de agenda con recordatorios.
- **Clínica:** permite a pacientes pedir hora 24/7 y reduce citas olvidadas.
- **Gimnasio:** gestiona evaluaciones y clases con cupos limitados.
- **Restaurante:** reserva de mesas en horarios puntuales.
- **Consultor/coach:** cobra por adelantado y agenda sesiones sin intermediarios.

---

## 13. Garantías y soporte

- **Prueba gratuita** sin compromiso.
- **Emails transaccionales** automáticos (confirmación y recordatorios).
- Actualizaciones del producto incluidas.
- Canal de contacto para resolver dudas y recibir sugerencias.

---

## 14. Contacto

- **Producto:** Agendalo
- **Desarrollado por:** Williams R. Villavizar Hdez.
- **Región:** República Dominicana / LATAM
- **Idioma:** Español

---

*Documento de presentación comercial — Agendalo.*
*Creado el 31 de agosto de 2026.*
