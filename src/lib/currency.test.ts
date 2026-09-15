import { describe, it, expect } from "vitest";
import { toUsd, computeEndTime, generateTimeSlots } from "@/lib/currency";

describe("toUsd", () => {
  it("convierte DOP a USD usando la tasa configurada", () => {
    expect(toUsd(1000, 60)).toBe(16.67);
    expect(toUsd(500, 50)).toBe(10);
    expect(toUsd(1, 60)).toBe(0.02);
  });

  it("redondea a 2 decimales", () => {
    expect(toUsd(333, 60)).toBe(5.55);
    expect(toUsd(100, 3)).toBe(33.33);
  });

  it("lanza error si el monto es inválido", () => {
    expect(() => toUsd(-5, 60)).toThrow("Monto inválido");
    expect(() => toUsd(NaN, 60)).toThrow("Monto inválido");
    expect(() => toUsd(Infinity, 60)).toThrow("Monto inválido");
  });

  it("lanza error si la tasa no está configurada", () => {
    expect(() => toUsd(100, 0)).toThrow("Tipo de cambio");
    expect(() => toUsd(100, -10)).toThrow("Tipo de cambio");
    expect(() => toUsd(100, NaN)).toThrow("Tipo de cambio");
  });
});

describe("computeEndTime", () => {
  it("calcula la hora de fin sumando la duración", () => {
    expect(computeEndTime("10:00", 60)).toBe("11:00");
    expect(computeEndTime("09:30", 45)).toBe("10:15");
    expect(computeEndTime("23:00", 60)).toBe("24:00");
  });

  it("lanza error con hora inválida", () => {
    expect(() => computeEndTime("10", 60)).toThrow("Hora de inicio inválida");
    expect(() => computeEndTime("abc", 60)).toThrow("Hora de inicio inválida");
  });
});

describe("generateTimeSlots", () => {
  it("genera slots cada X minutos dentro del rango disponible", () => {
    expect(generateTimeSlots("09:00", "12:00", 60)).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });

  it("respeta duraciones de 30 minutos", () => {
    expect(generateTimeSlots("09:00", "10:30", 30)).toEqual([
      "09:00",
      "09:30",
      "10:00",
    ]);
  });

  it("no genera un slot que quedaría cortado al final del rango", () => {
    // 11:15 + 60 = 12:15 > 12:00, no se incluye
    expect(generateTimeSlots("09:00", "12:00", 60)).not.toContain("11:15");
  });

  it("devuelve lista vacía si la duración supera el rango", () => {
    expect(generateTimeSlots("09:00", "09:30", 60)).toEqual([]);
  });

  it("lanza error con rango inválido", () => {
    expect(() => generateTimeSlots("nope", "12:00", 60)).toThrow(
      "Horario de disponibilidad inválido"
    );
  });
});
