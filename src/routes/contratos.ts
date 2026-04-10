import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import { gerarParcelas } from "../utils/gerarParcelas.js";
import { calcularJuros } from "../services/juros.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";

const ContratoInputSchema = z.object({
  cliente_id: z.string().uuid(),
  valor: z.number().positive(),
  taxa: z.number().min(0).max(1),
  parcelas: z.number().int().positive(),
  tipo_juros: z.enum(["simples", "composto"]),
});

interface ContratoInput {
  cliente_id: string;
  valor: number;
  taxa: number;
  parcelas: number;
  tipo_juros: "simples" | "composto";
}

export default async function contratosRoutes(app: FastifyInstance) {
  app.post(
    "/contratos",
    async (req: FastifyRequest<{ Body: ContratoInput }>, reply: FastifyReply) => {
      const validation = ContratoInputSchema.safeParse(req.body);
      
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { cliente_id, valor, taxa, parcelas, tipo_juros } = validation.data;

      const { data: clienteExistente } = await supabase
        .from("clientes")
        .select("id")
        .eq("id", cliente_id)
        .single();

      if (!clienteExistente) {
        return reply.status(404).send({
          success: false,
          message: "Cliente não encontrado",
        });
      }

      const valorTotal = calcularJuros(valor, taxa, parcelas, tipo_juros);

      const { data: contrato, error } = await supabase
        .from("contratos")
        .insert([{
          cliente_id,
          valor_total: valorTotal,
        }])
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      const listaParcelas = gerarParcelas(valorTotal, parcelas, new Date());

      const parcelasComId = listaParcelas.map((p) => ({
        ...p,
        contrato_id: contrato.id,
      }));

      const { error: parcelasError } = await supabase
        .from("parcelas")
        .insert(parcelasComId);

      if (parcelasError) {
        return reply.status(500).send({
          success: false,
          message: "Erro ao criar parcelas: " + parcelasError.message,
        });
      }

      await createAuditLog({
        action: "create_contrato",
        entity_type: "contrato",
        entity_id: contrato.id,
        details: { cliente_id, valor_total: valorTotal, parcelas },
      });

      return reply.status(201).send({
        success: true,
        data: { contrato, parcelas: listaParcelas },
      });
    }
  );

  app.get("/contratos", async (req: FastifyRequest, reply: FastifyReply) => {
    const { data, error } = await supabase
      .from("contratos")
      .select("*");

    if (error) {
      return reply.status(500).send({
        success: false,
        message: error.message,
      });
    }

    return reply.send({
      success: true,
      data,
    });
  });

  app.get(
    "/contratos/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return reply.status(404).send({
          success: false,
          message: "Contrato não encontrado",
        });
      }

      return reply.send({
        success: true,
        data,
      });
    }
  );
}