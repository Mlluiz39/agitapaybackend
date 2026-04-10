import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";

export default async function parcelasApiRoutes(app: FastifyInstance) {
  app.get("/api/parcelas", async (req: FastifyRequest, reply: FastifyReply) => {
    const { data, error } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome, cpf))")
      .order("data_vencimento", { ascending: true });

    if (error) {
      return reply.status(500).send({ success: false, message: error.message });
    }

    return reply.send({ success: true, data: data || [] });
  });

  app.get("/api/parcelas/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(*))")
      .eq("id", id)
      .single();

    if (error) {
      return reply.status(404).send({ success: false, message: "Parcela não encontrada" });
    }

    return reply.send({ success: true, data });
  });

  app.post("/api/parcelas/:id/pagar", async (req: FastifyRequest<{ Params: { id: string }, Body: { valor_pago: number } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { valor_pago } = req.body;

    const { error } = await supabase
      .from("parcelas")
      .update({
        status: "pago",
        valor_pago,
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return reply.status(500).send({ success: false, message: error.message });
    }

    return reply.send({ success: true, message: "Pagamento registrado" });
  });
}