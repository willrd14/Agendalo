/**
 * Converts an amount from a business currency to USD using the configured
 * conversion rate. Used for PayPal online payments (PayPal doesn't accept DOP).
 */
export function toUsd(
  amount: number,
  conversionRate: number
): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Monto inválido");
  }
  if (!Number.isFinite(conversionRate) || conversionRate <= 0) {
    throw new Error("Tipo de cambio no configurado");
  }
  return Number((amount / conversionRate).toFixed(2));
}

/**
 * Computes the end time (HH:MM) of an appointment given its start time and
 * duration in minutes.
 */
export function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error("Hora de inicio inválida");
  }
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

/**
 * Generates the list of available start times for a given availability window
 * and service duration, using fixed increments.
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): string[] {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  if (
    !Number.isFinite(startH) ||
    !Number.isFinite(startM) ||
    !Number.isFinite(endH) ||
    !Number.isFinite(endM)
  ) {
    throw new Error("Horario de disponibilidad inválido");
  }
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const slots: string[] = [];
  for (let t = startMin; t + durationMinutes <= endMin; t += durationMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}
