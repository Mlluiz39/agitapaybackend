import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { gerarPix } from "../services/pix.js";
import { supabase } from "../services/supabase.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";

const GeneratePixSchema = z.object({
  parcela_id: z.string().uuid(),
});

interface GeneratePixBody {
  parcela_id: string;
}

export default async function paymentsRoutes(app: FastifyInstance) {
  app.post(
    "/api/payments/generate-pix",
    async (req: FastifyRequest<{ Body: GeneratePixBody }>, reply: FastifyReply) => {
      const validation = GeneratePixSchema.safeParse(req.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { parcela_id } = validation.data;

      const { data: parcela } = await supabase
        .from("parcelas")
        .select("*, contratos(*)")
        .eq("id", parcela_id)
        .single();

      if (!parcela) {
        return reply.status(404).send({
          success: false,
          message: "Parcela não encontrada",
        });
      }

      const valor = parcela.valor_atualizado || parcela.valor;
      const qrCode = await gerarPix(valor, `Parcela ${parcela.numero}`);

      await createAuditLog({
        action: "generate_pix",
        entity_type: "parcela",
        entity_id: parcela_id,
        details: { valor },
      });

      return reply.send({
        success: true,
        data: {
          valor,
          qrCode,
          vencimento: parcela.data_vencimento,
          numero: parcela.numero,
        },
      });
    }
  );

  app.post(
    "/api/payments/confirm",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { parcela_id, valor_pago } = req.body as { parcela_id: string; valor_pago: number };

      if (!parcela_id || !valor_pago) {
        return reply.status(400).send({
          success: false,
          message: "parcela_id e valor_pago são obrigatórios",
        });
      }

      const { data: parcela } = await supabase
        .from("parcelas")
        .select("*")
        .eq("id", parcela_id)
        .single();

      if (!parcela) {
        return reply.status(404).send({
          success: false,
          message: "Parcela não encontrada",
        });
      }

      const { error } = await supabase
        .from("parcelas")
        .update({
          status: "pago",
          valor_pago,
          data_pagamento: new Date().toISOString(),
        })
        .eq("id", parcela_id);

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      await createAuditLog({
        action: "confirm_payment",
        entity_type: "parcela",
        entity_id: parcela_id,
        details: { valor_pago },
      });

      return reply.send({
        success: true,
        message: "Pagamento confirmado",
      });
    }
  );
}