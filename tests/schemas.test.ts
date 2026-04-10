import { describe, it, expect } from "vitest";
import { CustomerSchema, ContractSchema, CollectionSchema } from "../src/types/index.js";

describe("CustomerSchema", () => {
  it("should validate correct customer data", () => {
    const customer = {
      nome: "João Silva",
      cpf: "11144477735",
      rg: "123456789",
      telefone: "11999999999",
      email: "joao@email.com",
      endereco: "Rua ABC, 123",
    };
    expect(() => CustomerSchema.parse(customer)).not.toThrow();
  });

  it("should reject invalid CPF", () => {
    const customer = {
      nome: "João Silva",
      cpf: "123",
      telefone: "11999999999",
    };
    expect(() => CustomerSchema.parse(customer)).toThrow();
  });

  it("should reject invalid email", () => {
    const customer = {
      nome: "João Silva",
      cpf: "11144477735",
      telefone: "11999999999",
      email: "invalid-email",
    };
    expect(() => CustomerSchema.parse(customer)).toThrow();
  });

  it("should accept optional fields as empty", () => {
    const customer = {
      nome: "João Silva",
      cpf: "11144477735",
      telefone: "11999999999",
    };
    const result = CustomerSchema.parse(customer);
    expect(result.rg).toBeUndefined();
    expect(result.email).toBeUndefined();
  });
});

describe("ContractSchema", () => {
  it("should validate contract with correct data", () => {
    const contract = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: 1000,
      taxa: 0.05,
      parcelas: 12,
      tipo_juros: "simples",
    };
    expect(() => ContractSchema.parse(contract)).not.toThrow();
  });

  it("should reject negative value", () => {
    const contract = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: -100,
      taxa: 0.05,
      parcelas: 12,
      tipo_juros: "simples",
    };
    expect(() => ContractSchema.parse(contract)).toThrow();
  });

  it("should reject rate greater than 1", () => {
    const contract = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: 1000,
      taxa: 2,
      parcelas: 12,
      tipo_juros: "simples",
    };
    expect(() => ContractSchema.parse(contract)).toThrow();
  });

  it("should reject invalid interest type", () => {
    const contract = {
      cliente_id: "123e4567-e89b-12d3-a456-426614174000",
      valor: 1000,
      taxa: 0.05,
      parcelas: 12,
      tipo_juros: "invalid",
    };
    expect(() => ContractSchema.parse(contract)).toThrow();
  });
});

describe("CollectionSchema", () => {
  it("should validate collection data", () => {
    const collection = {
      telefone: "11999999999",
      nome: "João Silva",
      valor: 100.5,
    };
    expect(() => CollectionSchema.parse(collection)).not.toThrow();
  });

  it("should reject negative value", () => {
    const collection = {
      telefone: "11999999999",
      nome: "João Silva",
      valor: -10,
    };
    expect(() => CollectionSchema.parse(collection)).toThrow();
  });
});