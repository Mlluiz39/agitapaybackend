import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import dayjs from "dayjs";

export default async function alertsRoutes(app: FastifyInstance) {
  app.get("/api/alerts", async (req: FastifyRequest, reply: FastifyReply) => {
    const today = dayjs().format("YYYY-MM-DD");
    const next7Days = dayjs().add(7, "day").format("YYYY-MM-DD");

    const { data: overdueInstallments } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome, telefone, email))")
      .eq("status", "pendente")
      .lt("data_vencimento", today);

    const { data: upcomingInstallments } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome, telefone, email))")
      .eq("status", "pendente")
      .gte("data_vencimento", today)
      .lte("data_vencimento", next7Days);

    const alerts: any[] = [];

    if (overdueInstallments) {
      for (const p of overdueInstallments) {
        if (p.contratos?.clientes) {
          alerts.push({
            type: "overdue",
            priority: "high",
            customer: p.contratos.clientes,
            installment: p,
            message: `Installment ${p.numero} overdue! Due date: ${p.data_vencimento}`,
          });
        }
      }
    }

    if (upcomingInstallments) {
      for (const p of upcomingInstallments) {
        if (p.contratos?.clientes) {
          alerts.push({
            type: "upcoming",
            priority: "medium",
            customer: p.contratos.clientes,
            installment: p,
            message: `Installment ${p.numero} due soon: ${p.data_vencimento}`,
          });
        }
      }
    }

    return reply.send({ success: true, data: alerts });
  });

  app.get("/api/alerts/count", async (req: FastifyRequest, reply: FastifyReply) => {
    const today = dayjs().format("YYYY-MM-DD");

    const { count: overdue } = await supabase
      .from("parcelas")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .lt("data_vencimento", today);

    const { count: upcoming } = await supabase
      .from("parcelas")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .gte("data_vencimento", today)
      .lte("data_vencimento", dayjs().add(7, "day").format("YYYY-MM-DD"));

    return reply.send({
      success: true,
      data: {
        overdue: overdue || 0,
        upcoming: upcoming || 0,
        total: (overdue || 0) + (upcoming || 0),
      },
    });
  });
}