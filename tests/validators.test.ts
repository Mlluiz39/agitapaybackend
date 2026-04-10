import { describe, it, expect } from "vitest";
import { validarCPF, formatCPF } from "../src/utils/validators.js";

describe("validarCPF", () => {
  it("should accept valid CPF", () => {
    expect(validarCPF("11144477735")).toBe(true);
    expect(validarCPF("00000000000")).toBe(false);
    expect(validarCPF("11111111111")).toBe(false);
  });

  it("should reject CPF with invalid format", () => {
    expect(validarCPF("123")).toBe(false);
    expect(validarCPF("abc")).toBe(false);
    expect(validarCPF("")).toBe(false);
  });

  it("should reject CPF with invalid check digits", () => {
    expect(validarCPF("12345678900")).toBe(false);
    expect(validarCPF("00000000001")).toBe(false);
  });
});

describe("formatCPF", () => {
  it("should format CPF correctly", () => {
    expect(formatCPF("12345678901")).toBe("123.456.789-01");
    expect(formatCPF("00000000000")).toBe("000.000.000-00");
  });

  it("should clean non-numeric characters", () => {
    expect(formatCPF("123.456.789-01")).toBe("123.456.789-01");
    expect(formatCPF("123-456-789-01")).toBe("123.456.789-01");
  });
});