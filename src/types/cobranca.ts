import { z } from "zod";

export const CobrancaSchema = z.object({
  telefone: z.string().min(10, "Telefone inválido"),
  nome: z.string().min(1, "Nome é obrigatório"),
  valor: z.number().positive("Valor deve ser positivo"),
});

export type CobrancaInput = z.infer<typeof CobrancaSchema>;