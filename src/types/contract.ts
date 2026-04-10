import { z } from "zod";

export const ContractSchema = z.object({
  cliente_id: z.string().uuid("Invalid customer ID"),
  valor: z.number().positive("Value must be positive"),
  taxa: z.number().min(0).max(1, "Rate must be between 0 and 1"),
  parcelas: z.number().int().positive("Number of installments must be positive"),
  tipo_juros: z.enum(["simples", "composto"]),
});

export type ContractInput = z.infer<typeof ContractSchema>;

export const ContractResponseSchema = z.object({
  id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  valor_total: z.number(),
  created_at: z.string().datetime(),
});

export type ContractResponse = z.infer<typeof ContractResponseSchema>;

export const InstallmentSchema = z.object({
  id: z.string().uuid(),
  contrato_id: z.string().uuid(),
  numero: z.number().int().positive(),
  valor: z.number(),
  data_vencimento: z.string(),
  status: z.enum(["pendente", "pago", "atrasado"]),
});

export type Installment = z.infer<typeof InstallmentSchema>;