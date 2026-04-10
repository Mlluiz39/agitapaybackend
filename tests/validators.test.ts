import { describe, it, expect } from "vitest";
import { validarCPF, formatarCPF } from "../src/utils/validators.js";

describe("validarCPF", () => {
  it("deve aceitar CPF válido", () => {
    expect(validarCPF("11144477735")).toBe(true);
    expect(validarCPF("00000000000")).toBe(false);
    expect(validarCPF("11111111111")).toBe(false);
  });

  it("deve rejeitar CPF com formato inválido", () => {
    expect(validarCPF("123")).toBe(false);
    expect(validarCPF("abc")).toBe(false);
    expect(validarCPF("")).toBe(false);
  });

  it("deve rejeitar CPF com dígitos verificadores inválidos", () => {
    expect(validarCPF("12345678900")).toBe(false);
    expect(validarCPF("00000000001")).toBe(false);
  });
});

describe("formatarCPF", () => {
  it("deve formatar CPF corretamente", () => {
    expect(formatarCPF("12345678901")).toBe("123.456.789-01");
    expect(formatarCPF("00000000000")).toBe("000.000.000-00");
  });

  it("deve limpar caracteres não numéricos", () => {
    expect(formatarCPF("123.456.789-01")).toBe("123.456.789-01");
    expect(formatarCPF("123-456-789-01")).toBe("123.456.789-01");
  });
});