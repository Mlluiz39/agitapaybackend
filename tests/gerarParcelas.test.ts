import { describe, it, expect } from "vitest";
import { gerarParcelas } from "../src/utils/gerarParcelas.js";

describe("gerarParcelas", () => {
  it("deve gerar o número correto de parcelas", () => {
    const parcelas = gerarParcelas(1200, 12, new Date());
    expect(parcelas).toHaveLength(12);
  });

  it("deve calcular valor correto por parcela", () => {
    const parcelas = gerarParcelas(1200, 12, new Date());
    expect(parcelas[0].valor).toBe(100);
  });

  it("deve definir status pendente para todas as parcelas", () => {
    const parcelas = gerarParcelas(1200, 12, new Date());
    parcelas.forEach((p) => {
      expect(p.status).toBe("pendente");
    });
  });

  it("deve gerar datas de vencimento progressivas", () => {
    const parcelas = gerarParcelas(1200, 3, new Date("2024-01-01"));
    expect(parcelas.length).toBe(3);
    expect(new Date(parcelas[1].data_vencimento).getTime()).toBeGreaterThan(
      new Date(parcelas[0].data_vencimento).getTime()
    );
    expect(new Date(parcelas[2].data_vencimento).getTime()).toBeGreaterThan(
      new Date(parcelas[1].data_vencimento).getTime()
    );
  });
});