import { z } from "zod";

export const ContratoSchema = z.object({
  cliente_id: z.string().uuid("ID do cliente inválido"),
  valor: z.number().positive("Valor deve ser positivo"),
  taxa: z.number().min(0).max(1, "Taxa deve estar entre 0 e 1"),
  parcelas: z.number().int().positive("Número de parcelas deve ser positivo"),
  tipo_juros: z.enum(["simples", "composto"]),
});

export type ContratoInput = z.infer<typeof ContratoSchema>;

export const ContratoResponseSchema = z.object({
  id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  valor_total: z.number(),
  created_at: z.string().datetime(),
});

export type ContratoResponse = z.infer<typeof ContratoResponseSchema>;

export const ParcelaSchema = z.object({
  id: z.string().uuid(),
  contrato_id: z.string().uuid(),
  numero: z.number().int().positive(),
  valor: z.number(),
  data_vencimento: z.string(),
  status: z.enum(["pendente", "pago", "atrasado"]),
});

export type Parcela = z.infer<typeof ParcelaSchema>;