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
      .select("*, contratos(clientes(*))");

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
    "/installments/:id/pay-interest",
    async (req: FastifyRequest<{ Params: { id: string }, Body: { interest_paid: number } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const { interest_paid } = req.body;

      if (!interest_paid || interest_paid <= 0) {
         return reply.status(400).send({ success: false, message: "Valor inválido" });
      }

      const { data: installment } = await supabase
        .from("parcelas")
        .select("*")
        .eq("id", id)
        .single();
      
      if (!installment) {
        return reply.status(404).send({ success: false, message: "Installment not found" });
      }

      const newJurosPagos = (installment.juros_pagos || 0) + interest_paid;

      const { error: updateError } = await supabase
        .from("parcelas")
        .update({
          juros_pagos: newJurosPagos,
        })
        .eq("id", id);
      
      if (updateError) {
        return reply.status(500).send({ success: false, message: updateError.message });
      }

      await createAuditLog({
        action: "update_parcela_interest",
        entity_type: "parcela",
        entity_id: id,
        details: { interest_paid, total_juros_pagos: newJurosPagos, status: installment.status },
      });

      return reply.send({ success: true, message: "Interest payment recorded successfully", juros_pagos: newJurosPagos });
    }
  );

  app.post(
    "/installments/:id/notify",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;

      const { data: installment } = await supabase
        .from("parcelas")
        .select("*, contratos(clientes(nome, telefone, email))")
        .eq("id", id)
        .single() as any;

      if (!installment) {
        return reply.status(404).send({ success: false, message: "Parcela não encontrada" });
      }

      const telefone = installment.contratos?.clientes?.telefone;
      if (!telefone) {
        return reply.status(400).send({ success: false, message: "Cliente não possui telefone cadastrado" });
      }

      const { cobrar } = await import("../services/whatsapp.js");
      const { sendEmail, buildAgitaPayEmailTemplate } = await import("../services/email.js");
      
      const nome = installment.contratos.clientes.nome.split(" ")[0];
      const today = dayjs().startOf("day");
      const venc = dayjs(installment.data_vencimento).startOf("day");
      const diasDiferenca = venc.diff(today, "day"); // se for futuro = positivo
      
      let msgWpp = "";
      if (today.isBefore(venc)) {
         msgWpp = `Olá ${nome}, aqui é da AgitaPay ! lembrete amigável: Sua parcela no valor de R$ ${installment.valor.toFixed(2).replace('.', ',')} vence no dia ${venc.format("DD/MM/YYYY")}`;
      } else if (today.isSame(venc)) {
         msgWpp = `Olá ${nome}, aqui é da AgitaPay ! lembrete amigável: Sua parcela no valor de R$ ${installment.valor.toFixed(2).replace('.', ',')} vence *hoje* (${venc.format("DD/MM/YYYY")})`;
      } else {
         const valorExibir = installment.valor_atualizado || installment.valor;
         msgWpp = `Olá ${nome}, aqui é da AgitaPay ! lembrete amigável: Sua parcela no valor de R$ ${valorExibir.toFixed(2).replace('.', ',')} venceu no dia ${venc.format("DD/MM/YYYY")}`;
      }

      try {
        // Disparo de Teste do WhatsApp
        await cobrar(telefone, msgWpp);
        
        // Disparo de Teste do E-mail
        const email = installment.contratos?.clientes?.email;
        let emailSentStatus = false;
        let emailErrorMsg = "Cliente não possui e-mail cadastrado ou e-mail inválido.";

        if (email && email.includes('@')) {
           const valorExibirEmail = (today.isAfter(venc) && installment.valor_atualizado) ? installment.valor_atualizado : installment.valor;
           // Ajustando a diferenca pra ficar compativel com o template (qts dias faltam) -> invertendo
           const fakeDiasDiferencaEmail = today.isSame(venc) ? 0 : today.isBefore(venc) ? venc.diff(today, "day") : -1;
           
           const html = buildAgitaPayEmailTemplate(nome, fakeDiasDiferencaEmail, valorExibirEmail, venc.format("DD/MM/YYYY"));
           const subject = today.isSame(venc) ? "Sua fatura da AgitaPay vence HOJE. ✨" : "Atualizações sobre sua fatura AgitaPay";
           
           const result = await sendEmail(email, subject, html);
           emailSentStatus = result.success;
           if (!result.success) {
             emailErrorMsg = result.message;
           }
        }

        return reply.send({ 
          success: true, 
          message: emailSentStatus 
            ? "Notificação de WhatsApp E E-mail enviadas com sucesso!" 
            : `WhatsApp enviado. E-mail falhou: ${emailErrorMsg}`
        });
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: err.message });
      }
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