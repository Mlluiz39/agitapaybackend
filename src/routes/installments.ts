import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import { gerarPix } from "../services/pix.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";
import dayjs from "dayjs";

const PayInstallmentSchema = z.object({
  installment_id: z.string().uuid(),
  paid_value: z.number().positive(),
});

interface PayInstallmentBody {
  installment_id: string;
  paid_value: number;
}

export default async function installmentsRoutes(app: FastifyInstance) {
  app.get("/installments", async (req: FastifyRequest, reply: FastifyReply) => {
    const { data, error } = await supabase
      .from("parcelas")
      .select("*, clientes(*)");

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
    "/installments/:contract_id",
    async (req: FastifyRequest<{ Params: { contract_id: string } }>, reply: FastifyReply) => {
      const { contract_id } = req.params;

      const { data, error } = await supabase
        .from("parcelas")
        .select("*")
        .eq("contrato_id", contract_id);

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
    }
  );

  app.post(
    "/installments/pay",
    async (req: FastifyRequest<{ Body: PayInstallmentBody }>, reply: FastifyReply) => {
      const validation = PayInstallmentSchema.safeParse(req.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { installment_id, paid_value } = validation.data;

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

      const { error: updateError } = await supabase
        .from("parcelas")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
          valor_pago: paid_value,
        })
        .eq("id", installment_id);

      if (updateError) {
        return reply.status(500).send({
          success: false,
          message: updateError.message,
        });
      }

      await createAuditLog({
        action: "update_parcela",
        entity_type: "parcela",
        entity_id: installment_id,
        details: { paid_value, status: "pago" },
      });

      return reply.send({
        success: true,
        message: "Payment recorded",
      });
    }
  );

  app.post(
    "/installments/update-overdue",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const today = dayjs();

      const { data: installments } = await supabase
        .from("parcelas")
        .select("*")
        .eq("status", "pendente");

      if (!installments || installments.length === 0) {
        return reply.send({
          success: true,
          message: "No pending installments",
        });
      }

      let updated = 0;

      for (const p of installments) {
        const dueDate = dayjs(p.data_vencimento);

        if (today.isAfter(dueDate)) {
          const daysLate = today.diff(dueDate, "day");
          const interest = p.valor * 0.01 * daysLate;

          await supabase
            .from("parcelas")
            .update({
              status: "atrasado",
              valor_atualizado: p.valor + interest,
              dias_atraso: daysLate,
            })
            .eq("id", p.id);

          updated++;
        }
      }

      return reply.send({
        success: true,
        message: `${updated} installments updated`,
      });
    }
  );

  app.get(
    "/installments/:id/pix",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;

      const { data: installment } = await supabase
        .from("parcelas")
        .select("*")
        .eq("id", id)
        .single();

      if (!installment) {
        return reply.status(404).send({
          success: false,
          message: "Installment not found",
        });
      }

      const value = installment.valor_atualizado || installment.valor;

      const qrCode = await gerarPix(value);

      return reply.send({
        success: true,
        data: {
          value,
          qrCode,
        },
      });
    }
  );
}