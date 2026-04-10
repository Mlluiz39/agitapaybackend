import { describe, it, expect } from "vitest";
import { ClienteSchema, ContratoSchema, CobrancaSchema } from "../src/types/index.js";

describe("ClienteSchema", () => {
  it("deve validar dados corretos do cliente", () => {
    const cliente = {
      nome: "João Silva",
      cpf: "11144477735",
      rg: "123456789",
      telefone: "11999999999",
      email: "joao@email.com",
      endereco: "Rua ABC, 123",
    };
    expect(() => ClienteSchema.parse(cliente)).not.toThrow();
  });

  it("deve rejeitar CPF inválido", () => {
    const cliente = {
      nome: "João Silva",
      cpf: "123",
      telefone: "11999999999",
    };
    expect(() => ClienteSchema.parse(cliente)).toThrow();
  });

  it("deve rejeitar email inválido", () => {
    const cliente = {
      nome: "João Silva",
      cpf: "11144477735",
      telefone: "11999999999",
      email: "email-invalido",
    };
    expect(() => ClienteSchema.parse(cliente)).toThrow();
  });

  it("deve aceitar campos opcionais vazios", () => {
    const cliente = {
      nome: "João Silva",
      cpf: "11144477735",
      telefone: "11999999999",
    };
    const result = ClienteSchema.parse(cliente);
    expect(result.rg).toBeUndefined();
    expect(result.email).toBeUndefined();
  });
});

describe("ContratoSchema", () => {
  it("deve validar contrato com dados corretos", () => {
    const contrato = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: 1000,
      taxa: 0.05,
      parcelas: 12,
      tipo_juros: "simples",
    };
    expect(() => ContratoSchema.parse(contrato)).not.toThrow();
  });

  it("deve rejeitar valor negativo", () => {
    const contrato = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: -100,
      taxa: 0.05,
      parcelas: 12,
      tipo_juros: "simples",
    };
    expect(() => ContratoSchema.parse(contrato)).toThrow();
  });

  it("deve rejeitar taxa maior que 1", () => {
    const contrato = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: 1000,
      taxa: 2,
      parcelas: 12,
      tipo_juros: "simples",
    };
    expect(() => ContratoSchema.parse(contrato)).toThrow();
  });

  it("deve rejeitar tipo de juros inválido", () => {
    const contrato = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: 1000,
      taxa: 0.05,
      parcelas: 12,
      tipo_juros: "invalid",
    };
    expect(() => ContratoSchema.parse(contrato)).toThrow();
  });
});

describe("CobrancaSchema", () => {
  it("deve validar dados de cobrança", () => {
    const cobranca = {
      telefone: "11999999999",
      nome: "João Silva",
      valor: 100.5,
    };
    expect(() => CobrancaSchema.parse(cobranca)).not.toThrow();
  });

  it("deve rejeitar valor negativo", () => {
    const cobranca = {
      telefone: "11999999999",
      nome: "João Silva",
      valor: -10,
    };
    expect(() => CobrancaSchema.parse(cobranca)).toThrow();
  });
});