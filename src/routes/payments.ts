import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { gerarPix } from "../services/pix.js";
import { supabase } from "../services/supabase.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";

const GeneratePixSchema = z.object({
  installment_id: z.string().uuid(),
});

interface GeneratePixBody {
  installment_id: string;
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

      const { installment_id } = validation.data;

      const { data: installment } = await supabase
        .from("parcelas")
        .select("*, contratos(*)")
        .eq("id", installment_id)
        .single();

      if (!installment) {
        return reply.status(404).send({
          success: false,
          message: "Installment not found",
        });
      }

      const value = installment.valor_atualizado || installment.valor;
      const qrCode = await gerarPix(value, `Installment ${installment.numero}`);

      await createAuditLog({
        action: "generate_pix",
        entity_type: "parcela",
        entity_id: installment_id,
        details: { value },
      });

      return reply.send({
        success: true,
        data: {
          value,
          qrCode,
          dueDate: installment.data_vencimento,
          number: installment.numero,
        },
      });
    }
  );

  app.post(
    "/api/payments/confirm",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { installment_id, paid_value } = req.body as { installment_id: string; paid_value: number };

      if (!installment_id || !paid_value) {
        return reply.status(400).send({
          success: false,
          message: "installment_id and paid_value are required",
        });
      }

      const { data: installment } = await supabase
        .from("parcelas")
        .select("*")
        .eq("id", installment_id)
        .single();

      if (!installment) {
        return reply.status(404).send({
          success: false,
          message: "Installment not found",
        });
      }

      const { error } = await supabase
        .from("parcelas")
        .update({
          status: "pago",
          valor_pago: paid_value,
          data_pagamento: new Date().toISOString(),
        })
        .eq("id", installment_id);

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      await createAuditLog({
        action: "confirm_payment",
        entity_type: "parcela",
        entity_id: installment_id,
        details: { paid_value },
      });

      return reply.send({
        success: true,
        message: "Payment confirmed",
      });
    }
  );
}