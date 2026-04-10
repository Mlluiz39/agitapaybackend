import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";

export default async function installmentsApiRoutes(app: FastifyInstance) {
  app.get("/api/installments", async (req: FastifyRequest, reply: FastifyReply) => {
    const { data, error } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome, cpf))")
      .order("data_vencimento", { ascending: true });

    if (error) {
      return reply.status(500).send({ success: false, message: error.message });
    }

    return reply.send({ success: true, data: data || [] });
  });

  app.get("/api/installments/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(*))")
      .eq("id", id)
      .single();

    if (error) {
      return reply.status(404).send({ success: false, message: "Installment not found" });
    }

    return reply.send({ success: true, data });
  });

  app.post("/api/installments/:id/pay", async (req: FastifyRequest<{ Params: { id: string }, Body: { paid_value: number } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { paid_value } = req.body;

    const { error } = await supabase
      .from("parcelas")
      .update({
        status: "pago",
        valor_pago: paid_value,
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return reply.status(500).send({ success: false, message: error.message });
    }

    return reply.send({ success: true, message: "Payment recorded" });
  });
}