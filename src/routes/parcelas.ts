import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import { gerarPix } from "../services/pix.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";
import dayjs from "dayjs";

const PagarParcelaSchema = z.object({
  parcela_id: z.string().uuid(),
  valor_pago: z.number().positive(),
});

interface PagarParcelaBody {
  parcela_id: string;
  valor_pago: number;
}

export default async function parcelasRoutes(app: FastifyInstance) {
  app.get("/parcelas", async (req: FastifyRequest, reply: FastifyReply) => {
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
    "/parcelas/:contrato_id",
    async (req: FastifyRequest<{ Params: { contrato_id: string } }>, reply: FastifyReply) => {
      const { contrato_id } = req.params;

      const { data, error } = await supabase
        .from("parcelas")
        .select("*")
        .eq("contrato_id", contrato_id);

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
    "/parcelas/pagar",
    async (req: FastifyRequest<{ Body: PagarParcelaBody }>, reply: FastifyReply) => {
      const validation = PagarParcelaSchema.safeParse(req.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { parcela_id, valor_pago } = validation.data;

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

      const { error: updateError } = await supabase
        .from("parcelas")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
          valor_pago,
        })
        .eq("id", parcela_id);

      if (updateError) {
        return reply.status(500).send({
          success: false,
          message: updateError.message,
        });
      }

      await createAuditLog({
        action: "update_parcela",
        entity_type: "parcela",
        entity_id: parcela_id,
        details: { valor_pago, status: "pago" },
      });

      return reply.send({
        success: true,
        message: "Pagamento registrado",
      });
    }
  );

  app.post(
    "/parcelas/atualizar-atraso",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const hoje = dayjs();

      const { data: parcelas } = await supabase
        .from("parcelas")
        .select("*")
        .eq("status", "pendente");

      if (!parcelas || parcelas.length === 0) {
        return reply.send({
          success: true,
          message: "Nenhuma parcela pendente",
        });
      }

      let atualizadas = 0;

      for (const p of parcelas) {
        const vencimento = dayjs(p.data_vencimento);

        if (hoje.isAfter(vencimento)) {
          const diasAtraso = hoje.diff(vencimento, "day");
          const juros = p.valor * 0.01 * diasAtraso;

          await supabase
            .from("parcelas")
            .update({
              status: "atrasado",
              valor_atualizado: p.valor + juros,
              dias_atraso: diasAtraso,
            })
            .eq("id", p.id);

          atualizadas++;
        }
      }

      return reply.send({
        success: true,
        message: `${atualizadas} parcelas atualizadas`,
      });
    }
  );

  app.get(
    "/parcelas/:id/pix",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;

      const { data: parcela } = await supabase
        .from("parcelas")
        .select("*")
        .eq("id", id)
        .single();

      if (!parcela) {
        return reply.status(404).send({
          success: false,
          message: "Parcela não encontrada",
        });
      }

      const valor = parcela.valor_atualizado || parcela.valor;

      const qrCode = await gerarPix(valor);

      return reply.send({
        success: true,
        data: {
          valor,
          qrCode,
        },
      });
    }
  );
}