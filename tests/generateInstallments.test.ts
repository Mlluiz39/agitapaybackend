import { describe, it, expect } from "vitest";
import { generateInstallments } from "../src/utils/generateInstallments.js";

describe("generateInstallments", () => {
  it("should generate the correct number of installments", () => {
    const installments = generateInstallments(1200, 12, new Date());
    expect(installments).toHaveLength(12);
  });

  it("should calculate correct value per installment", () => {
    const installments = generateInstallments(1200, 12, new Date());
    expect(installments[0].valor).toBe(100);
  });

  it("should set pendente status for all installments", () => {
    const installments = generateInstallments(1200, 12, new Date());
    installments.forEach((p) => {
      expect(p.status).toBe("pendente");
    });
  });

  it("should generate progressive due dates", () => {
    const installments = generateInstallments(1200, 3, new Date("2024-01-01"));
    expect(installments.length).toBe(3);
    expect(new Date(installments[1].data_vencimento).getTime()).toBeGreaterThan(
      new Date(installments[0].data_vencimento).getTime()
    );
    expect(new Date(installments[2].data_vencimento).getTime()).toBeGreaterThan(
      new Date(installments[1].data_vencimento).getTime()
    );
  });
});