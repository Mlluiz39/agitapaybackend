import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import dayjs from "dayjs";

export default async function alertasRoutes(app: FastifyInstance) {
  app.get("/api/alertas", async (req: FastifyRequest, reply: FastifyReply) => {
    const hoje = dayjs().format("YYYY-MM-DD");
    const proximos7dias = dayjs().add(7, "day").format("YYYY-MM-DD");

    const { data: parcelasVencidas } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome, telefone, email))")
      .eq("status", "pendente")
      .lt("data_vencimento", hoje);

    const { data: parcelasProximas } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome, telefone, email))")
      .eq("status", "pendente")
      .gte("data_vencimento", hoje)
      .lte("data_vencimento", proximos7dias);

    const alertas = [];

    if (parcelasVencidas) {
      for (const p of parcelasVencidas) {
        if (p.contratos?.clientes) {
          alertas.push({
            tipo: "atrasado",
            prioridade: "alta",
            cliente: p.contratos.clientes,
            parcela: p,
            mensagem: `Parcela ${p.numero} atrasada! Vencimento: ${p.data_vencimento}`,
          });
        }
      }
    }

    if (parcelasProximas) {
      for (const p of parcelasProximas) {
        if (p.contratos?.clientes) {
          alertas.push({
            tipo: "vencimento_proximo",
            prioridade: "media",
            cliente: p.contratos.clientes,
            parcela: p,
            mensagem: `Parcela ${p.numero} vence em breve: ${p.data_vencimento}`,
          });
        }
      }
    }

    return reply.send({ success: true, data: alertas });
  });

  app.get("/api/alertas/contagem", async (req: FastifyRequest, reply: FastifyReply) => {
    const hoje = dayjs().format("YYYY-MM-DD");

    const { count: atrasadas } = await supabase
      .from("parcelas")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .lt("data_vencimento", hoje);

    const { count: proximas } = await supabase
      .from("parcelas")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .gte("data_vencimento", hoje)
      .lte("data_vencimento", dayjs().add(7, "day").format("YYYY-MM-DD"));

    return reply.send({
      success: true,
      data: {
        atrasadas: atrasadas || 0,
        proximas: proximas || 0,
        total: (atrasadas || 0) + (proximas || 0),
      },
    });
  });
}