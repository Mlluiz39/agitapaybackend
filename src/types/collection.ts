import { z } from "zod";

export const CollectionSchema = z.object({
  telefone: z.string().min(10, "Invalid phone"),
  nome: z.string().min(1, "Name is required"),
  valor: z.number().positive("Value must be positive"),
});

export type CollectionInput = z.infer<typeof CollectionSchema>;