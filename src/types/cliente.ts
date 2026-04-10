import { z } from "zod";
import { validarCPF } from "../utils/validators.js";

const cpfValidator = z.string().refine(
  (val) => validarCPF(val),
  { message: "CPF inválido" }
);

export const ClienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: cpfValidator,
  rg: z.string().optional(),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional(),
  endereco: z.string().optional(),
});

export type ClienteInput = z.infer<typeof ClienteSchema>;

export const ClienteResponseSchema = ClienteSchema.extend({
  id: z.string().uuid(),
  documento: z.string().optional(),
  created_at: z.string().datetime(),
});

export type ClienteResponse = z.infer<typeof ClienteResponseSchema>;