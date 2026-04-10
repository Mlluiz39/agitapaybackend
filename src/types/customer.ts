import { z } from "zod";
import { validarCPF } from "../utils/validators.js";

const cpfValidator = z.string().refine(
  (val) => validarCPF(val),
  { message: "Invalid CPF" }
);

export const CustomerSchema = z.object({
  nome: z.string().min(1, "Name is required"),
  cpf: cpfValidator,
  rg: z.string().optional(),
  telefone: z.string().min(10, "Invalid phone"),
  email: z.string().email("Invalid email").optional(),
  endereco: z.string().optional(),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

export const CustomerResponseSchema = CustomerSchema.extend({
  id: z.string().uuid(),
  documento: z.string().optional(),
  created_at: z.string().datetime(),
});

export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;