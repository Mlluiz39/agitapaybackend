import { describe, it, expect } from "vitest";
import { calcularJuros } from "../src/services/juros.js";

describe("calcularJuros", () => {
  it("deve calcular juros simples corretamente", () => {
    const resultado = calcularJuros(1000, 0.05, 12, "simples");
    expect(resultado).toBe(1600);
  });

  it("deve calcular juros compostos corretamente", () => {
    const resultado = calcularJuros(1000, 0.05, 12, "composto");
    expect(resultado).toBeCloseTo(1795.86, 2);
  });
});