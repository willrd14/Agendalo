# Landing Page de Agendalo — Guía de Contenido y Estructura

> **Estado (31/08/2026):** implementada en código en el proyecto hermano
> `C:\Users\willi\Code\Proyects\SaaS\Agendalo-Landing` (Next.js 16 + Tailwind v4),
> a partir del diseño generado por **Google Stitch**. Esta guía describe el diseño y
> la estrategia de contenido de referencia. Ver `Agendalo-Landing/CHANGELOG-Agendalo-Landing.md`.

**Propósito:** Convertir visitantes (dueños de negocios de servicios) en **registros de
prueba gratuita**. El landing es la puerta de entrada de ventas de Agendalo.

> Región objetivo: República Dominicana / LATAM. Idioma: Español. Tono: cercano, claro y
> orientado a beneficios (no a features técnicas).

---

## 1. Objetivo principal

Que el visitante entienda en < 5 segundos qué hace Agendalo y **se registre para la
prueba gratuita de 14 días** (o pida más información). Cada sección debe empujar hacia un
único CTA (call-to-action): **"Empieza gratis"**.

## 2. CTA principal (repetido en todas las secciones)

- **Botón:** "Empieza gratis" (verde, color primario `#059669`).
- **Subtexto bajo el botón:** "14 días de prueba · Sin tarjeta · Cancela cuando quieras".
- Alternativa secundaria: "Ver una demo" o "Agenda una llamada".

---

## 3. Estructura de secciones (de arriba a abajo)

### A. Navbar (fija)
- Logo **Agendalo** (izquierda).
- Enlaces: Funciones · Precios · Preguntas frecuentes (anclar a secciones).
- Botón "Entrar" (login) + botón "Empieza gratis" (derecha).
- Fondo blanco/translúcido, se vuelve sólido al hacer scroll.

### B. Hero (primera impresión)
- **Título (H1):** "Recibe, gestiona y cobra tus reservas online — sin complicarte".
- **Subtítulo:** "Agendalo es la plataforma para que tus clientes reserven por internet
  en tu propia página, con tus colores y tu logo. Menos llamadas, menos no-shows y más
  control."
- **CTA:** "Empieza gratis" + subtexto de la prueba de 14 días.
- **Imagen/demo:** captura del flujo de reserva o del panel de control (placeholder).
- **Prueba social (opcional):** logos de sectores o "Miles de reservas gestionadas".

### C. Problema (conexión con el dolor)
- **Título:** "El teléfono no para, las citas se pierden y nadie aparece".
- Bullets del dolor que Agendalo resuelve:
  - Llamadas y mensajes a cualquier hora que no alcanzas a atender.
  - Clientes que reservan y no aparecen (no-shows).
  - Planillas y papel, con errores y malos entendidos.
  - Sin forma de cobrar por adelantado ni llevar control de pagos.

### D. Solución (cómo funciona, en 3 pasos)
- **Título:** "Reservar contigo es tan fácil como 1, 2, 3".
  1. **Tu cliente entra** a tu página pública con tu marca.
  2. **Elige servicio, fecha y hora** disponibles (solo ve cupos reales).
  3. **Confirma y paga** en línea o por transferencia; le llega el email al instante.
- En paralelo: "Tú lo ves todo al instante en tu panel de control".

### E. Funciones (beneficios, no tecnicismos)
Tarjetas con icono + título + 1–2 líneas:

| Icono | Título | Texto |
|---|---|---|
| 📅 | Reservas online | Tus clientes reservan solos, 24/7, sin llamadas. |
| 🗂️ | Panel de control | Citas de hoy, próximas, clientes y filtros en un solo lugar. |
| ⏰ | Horarios y disponibilidad | Define tu agenda y el sistema calcula los cupos según la duración de cada servicio. |
| 🔔 | Recordatorios automáticos | Emails que avisan a tus clientes para reducir no-shows. |
| 💳 | Pagos online | Cobra con PayPal (USD) y muestra tus datos de transferencia. |
| 📊 | Control de ingresos | Historial de pagos y métricas de tu negocio. |
| 🎨 | Tu marca | Página pública con tu logo y tus colores (marca blanca). |
| 🔒 | Seguro y privado | Tus datos y los de tus clientes protegidos, cada negocio aislado. |

### F. Cómo funciona por sector (opcional, genera identificación)
- **Belleza y estética:** salones, barberías y spas llenan su agenda mejor.
- **Salud y bienestar:** clínicas y consultorios que reducen citas olvidadas.
- **Fitness:** gimnasios y coaches con clases de cupo limitado.
- **Gastronomía:** restaurantes que reciben reservas de mesa puntuales.
- **Profesionales:** consultores y coaches que cobran por adelantado.

### G. Testimonios (opcional — añadir cuando se tengan)
- Cita + nombre + tipo de negocio + resultado (ej. "Redujimos las citas perdidas en un
  40%"). Dejar espacio para 2–3 tarjetas.

### H. Planes y precios
- **Título:** "Planes claros, sin sorpresas".
- Tabla comparativa:

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
| Prueba gratuita | 14 días | 14 días |

- Nota: "Sin comisión extra de Agendalo por transacción".
- CTA bajo la tabla: "Empieza gratis".

### I. Preguntas frecuentes (FAQ)
Acordeón con preguntas:
1. ¿Necesito conocimientos técnicos? — No, todo es visual y guiado.
2. ¿Mis clientes necesitan crear cuenta? — No, reservan con su email.
3. ¿Puedo probar antes de pagar? — Sí, 14 días de prueba gratuita.
4. ¿Cómo cobro? — PayPal (online) y/o mostrando tus datos de transferencia.
5. ¿Qué pasa si un cliente cancela? — Recibes aviso y llevas control; defines la
   antelación mínima.
6. ¿Puedo cambiar de plan más adelante? — Sí.

### J. CTA final
- **Título:** "¿Listo para dejar de perder reservas?"
- **Botón:** "Empieza gratis" + subtexto "14 días de prueba · Sin tarjeta".
- Alternativa: "O escríbenos por WhatsApp / email".

### K. Pie de página (footer)
- Logo Agendalo.
- Enlaces: Funciones · Precios · FAQ · Contacto · Política de privacidad · Términos.
- "© 2026 Agendalo · Hecho para negocios de República Dominicana y LATAM".
- Redes sociales (si existen).

---

## 4. Guía visual (diseño)

| Elemento | Valor |
|---|---|
| Color primario | `#059669` (verde) — botones y acentos |
| Color secundario | `#3B82F6` (azul) — enlaces/detalles |
| Fondo | Blanco y grises claros |
| Tipografía | Inter (o similar, limpia y legible) |
| Forma | Cards con bordes redondeados, sombras suaves |
| Idioma | Español (RD) |
| Responsive | Móvil primero (la mayoría visita desde el celular) |

## 5. SEO básico del landing

- **Title:** "Agendalo — Reservas online para tu negocio".
- **Description:** "Gestiona y cobra tus reservas online con tu propia página. Prueba
  gratis 14 días. Hecho para negocios de República Dominicana y LATAM."
- **URL principal:** `https://agendalo.com` (o el dominio que se adquiera).
- **Open Graph / imagen de preview:** captura del producto.

---

## 6. Notas de implementación (técnica)

> Sección para el equipo de desarrollo al construir el landing.

- **Stack sugerido:** Reutilizar el stack de Agendalo (Next.js App Router + Tailwind +
  shadcn/ui) para mantener consistencia de diseño y componentes.
- **Colores/estilos:** usar las variables de tema existentes (`primary: #059669`,
  `secondary: #3B82F6`).
- **CTA de registro:** enlazar al registro real de Agendalo (`/register`) para que el
  visitante complete el onboarding directamente.
- **Botones de anclaje:** navegación suave a `#funciones`, `#precios`, `#faq`.
- **Lazy load:** las imágenes de demo/fondos deben cargarse de forma perezosa.
- **Renderizado:** secciones públicas en modo server-side (SSR) para SEO.
- **Métricas:** instalar analítica para medir clics en CTA y tasa de registro.
- **Archivo propuesto:** `src/app/(marketing)/page.tsx` (o la ruta raíz pública del
  landing), con componentes por sección en `src/components/marketing/`.

---

## 7. Checklist de lanzamiento
- [ ] Copiar/ajustar textos de cada sección (adaptar testimonios reales).
- [ ] Definir imágenes de hero y demo del producto.
- [ ] Configurar dominio (Cloudflare) y redirigir a la raíz.
- [ ] Enlazar "Empieza gratis" al registro real.
- [ ] Validar responsividad móvil y velocidad.
- [ ] Revisar SEO básico (title, description, OG).
- [ ] Medir con analítica tras el lanzamiento.

---

*Guía de landing page — Agendalo · Creado el 31 de agosto de 2026.*
