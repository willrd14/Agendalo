# Testing de Agendalo — Resultados y Descubrimientos

Fecha: 31 de agosto de 2026
Estado: 30/30 tests pasando, lint 0 errores, build + type-check OK.

## Resumen

Se implementó una **suite completa de testing** (unit + componentes + integración) con
Vitest 4 + React Testing Library 16 + jsdom + @vitejs/plugin-react-swc + @vitest/coverage-v8.
Toda la lógica crítica del proyecto (especialmente el nuevo flujo de pago PayPal por
servicio) queda cubierta con pruebas automatizadas.

Scripts disponibles:

| Comando | Descripción |
|---|---|
| `npm test` | Ejecuta la suite una vez |
| `npm run test:watch` | Modo watch (desarrollo) |
| `npm run test:coverage` | Ejecuta con reporte de cobertura |
| `npm run lint` | ESLint (debe dar 0 errores) |
| `npm run build` | Build de Next.js + type-check |

## Configuración

- **`vitest.config.ts`**: usa `@vitejs/plugin-react-swc`, entorno `jsdom`, `globals: true`,
  alias `@/*` → `src/*`, `setupFiles: vitest.setup.ts`. Cobertura con provider `v8`
  (excluye `src/app/**`, `src/components/ui/**`, `lib/supabase/**`).
- **`vitest.setup.ts`**: carga los matchers de `@testing-library/jest-dom/vitest`, hace
  `cleanup` tras cada test, y mockea globalmente `sonner` (toast), `next/navigation`
  (router/params) y `window.matchMedia` (no existe en jsdom).
- **`package.json`**: se añadieron los scripts `test`, `test:watch`, `test:coverage` y las
  devDependencies de testing.
- **`eslint.config.mjs`**: se añadió el override para permitir `any` en archivos de test
  (convención estándar) y se excluyó el directorio generado `coverage/**`.

## Archivos de test (30 tests en 5 archivos)

### 1. `src/lib/currency.test.ts` — 11 tests (unitarios)
Lógica pura extraída a `src/lib/currency.ts`:
- `toUsd()`: conversión DOP→USD, redondeo a 2 decimales, errores con monto/tasa inválidos.
- `computeEndTime()`: hora de fin = inicio + duración, errores con hora inválida.
- `generateTimeSlots()`: generación de bloques según duración dentro del rango de
  disponibilidad, caso de slot que quedaría cortado, lista vacía y error con rango inválido.
- **Cobertura: 100%.**

### 2. `src/lib/paypal.test.ts` — 4 tests (integración del cliente PayPal real)
Se mockea únicamente `global.fetch`; se importa el módulo real (se resetea el módulo entre
tests con `vi.resetModules()` para limpiar la caché de token):
- `createPaypalOrder()`: construye la orden con `intent: CAPTURE`, monto en **USD**,
  `custom_id`/`reference_id`, URL de sandbox, y devuelve id + `approveUrl`.
- Error descriptivo si PayPal responde con error (422 `CURRENCY_NOT_SUPPORTED`).
- `capturePaypalOrder()`: extrae `captureId`, status y monto de la respuesta.
- Error si el capture no es OK (422 `ORDER_NOT_APPROVED`).

### 3. `src/lib/service-payment.test.ts` — 6 tests (integración de `finalizePaypalPayment`)
Se mockean `@/lib/supabase/server` (query builder encadenable) y `@/lib/paypal`:
- Sesión inexistente → error "Sesión de pago no encontrada".
- **Idempotencia**: si la sesión ya está `completed`, no repite nada.
- Mismatch de `orderId` vs sesión → rechazo.
- Error de captura → error propagado.
- Flujo completo: cliente existente → inserta cita, inserta pago `USD/paypal`, marca sesión
  `completed` y dispara el fetch del email de confirmación.
- Cliente inexistente → crea el usuario vía `supabase.auth.admin.createUser` (el trigger
  `on_auth_user_created` crea la fila `public.users`).
- **Cobertura: 93.93%.**

### 4. `src/components/settings/payment-methods-manager.test.tsx` — 5 tests (componente)
Se mockea `@/lib/use-supabase-browser`:
- Renderiza los 2 métodos (PayPal + Transferencia).
- Muestra el panel de conversión de moneda cuando PayPal está habilitado.
- Guarda llamando a `upsert` por cada tipo.
- Muestra error de toast si `upsert` falla (RLS).
- Guarda la tasa de conversión (`paypal_conversion_rate`) ingresada.
- **Cobertura: 85.29%.**

### 5. `src/components/booking/booking-flow.test.tsx` — 4 tests (componente, flujo multi-paso)
Se mockean `@/lib/use-supabase-browser` y `next/navigation` (con `service` en la query para
arrancar en step 2), y se `Object.defineProperty(window, "location")` para interceptar la
redirección de PayPal:
- Botón "Pagar ahora con PayPal (USD)" visible en step 3 si `paypalEnabled`.
- **No** se muestra si `paypalEnabled` es false.
- Al pulsar → llama a `POST /api/payments/paypal/create` con el payload correcto
  (businessId, serviceId, price, currency DOP, conversionRate) y redirige a `approveUrl`.
- Botón deshabilitado si falta el email o el nombre.

## Hallazgos / Descubrimientos de la sesión

1. **La lógica de horarios y conversión estaba inline en `booking-flow.tsx`**. Se extrajo a
   `src/lib/currency.ts` (`toUsd`, `computeEndTime`, `generateTimeSlots`) para hacerla
   testeable y reutilizable. `booking-flow.tsx` ahora importa estas funciones (menos código
   duplicado).

2. **El botón PayPal se deshabilita si falta email o nombre** (`disabled={loading || !clientName
   || !clientEmail}`), por lo que el check interno de `handlePaypalPayment`
   ("Ingresa tu email") solo aplica si el botón fuera habilitado por otra vía. Es el
   comportamiento correcto; el test lo verifica como "botón deshabilitado".

3. **jsdom no implementa `window.location` de forma espiable** (propiedad no redefinible).
   Para interceptar la redirección de PayPal en los tests se usa
   `Object.defineProperty(window, "location", { value: { assign }, configurable: true })`.
   `vi.spyOn(Location.prototype, "assign")` no funciona en esta versión de jsdom.

4. **`vi.mock` con constructor requiere `vi.hoisted()`**: las variables referenciadas dentro
   de una fábrica de mock (ej. `mockCapture`, `mockUpsert`) deben declararse con
   `vi.hoisted()` porque Vitest eleva las fábricas al inicio del archivo.

5. **La caché de token de PayPal** (`getPaypalAccessToken`) persiste a nivel de módulo; si no
   se resetea entre tests, la secuencia de `fetch` se desfasa (un solo `fetch` en vez de dos:
   token + orden). Solución: `vi.resetModules()` + import dinámico del módulo en cada test.

6. **Cobertura:** 58% global. La lógica crítica de monetización está muy bien cubierta:
   `currency.ts` 100%, `service-payment.ts` 93.93%, `payment-methods-manager.tsx` 85.29%,
   `utils.ts` 100%. El archivo `ics.ts` (generación de archivos .ics para el calendario) está
   al 0% — candidato a testear a futuro.

## Verificación final

- `npm test` → **5 archivos / 30 tests pasando**.
- `npm run lint` → **0 errores, 0 warnings**.
- `npm run build` → **compila + TypeScript type-check OK**.

## Pendientes / recomendaciones

- Cubrir `src/lib/ics.ts` (0% cobertura) con tests de generación de archivos `.ics`.
- Añadir tests para el resto de managers del dashboard (`appointments-manager`,
  `services-manager`, `payments-list`) cuando sea relevante.
- El deploy se hará a futuro (Cloudflare, cuando el usuario adquiera el dominio); el testing
  queda listo para correr en CI.
