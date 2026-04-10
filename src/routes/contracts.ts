import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import { generateInstallments } from "../utils/generateInstallments.js";
import { calculateInterest } from "../services/fees.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";

const ContractInputSchema = z.object({
  cliente_id: z.string().uuid(),
  valor: z.number().positive(),
  taxa: z.number().min(0).max(1),
  parcelas: z.number().int().positive(),
  tipo_juros: z.enum(["simples", "composto"]),
});

interface ContractInput {
  cliente_id: string;
  valor: number;
  taxa: number;
  parcelas: number;
  tipo_juros: "simples" | "composto";
}

export default async function contractsRoutes(app: FastifyInstance) {
  app.post(
    "/contracts",
    async (req: FastifyRequest<{ Body: ContractInput }>, reply: FastifyReply) => {
      const validation = ContractInputSchema.safeParse(req.body);
      
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
          message: "Customer not found",
        });
      }

      const totalValue = calculateInterest(valor, taxa, parcelas, tipo_juros);

      const { data: contract, error } = await supabase
        .from("contratos")
        .insert([{
          cliente_id,
          valor_total: totalValue,
        }])
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      const installmentList = generateInstallments(totalValue, parcelas, new Date());

      const installmentsWithId = installmentList.map((p) => ({
        ...p,
        contrato_id: contract.id,
      }));

      const { error: parcelasError } = await supabase
        .from("parcelas")
        .insert(installmentsWithId);

      if (parcelasError) {
        return reply.status(500).send({
          success: false,
          message: "Error creating installments: " + parcelasError.message,
        });
      }

      await createAuditLog({
        action: "create_contrato",
        entity_type: "contrato",
        entity_id: contract.id,
        details: { cliente_id, valor_total: totalValue, parcelas },
      });

      return reply.status(201).send({
        success: true,
        data: { contract, installments: installmentList },
      });
    }
  );

  app.get("/contracts", async (req: FastifyRequest, reply: FastifyReply) => {
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
    "/contracts/:id",
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
          message: "Contract not found",
        });
      }

      return reply.send({
        success: true,
        data,
      });
    }
  );
}