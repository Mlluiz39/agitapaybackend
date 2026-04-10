import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (req: FastifyRequest, reply: FastifyReply) => {
    const [{ data: totalCustomers }, { data: totalContracts }, { data: pendingInstallments }, { data: overdueInstallments }] = await Promise.all([
      supabase.from("clientes").select("*", { count: "exact", head: true }),
      supabase.from("contratos").select("*", { count: "exact", head: true }),
      supabase.from("parcelas").select("*").eq("status", "pendente"),
      supabase.from("parcelas").select("*").eq("status", "atrasado"),
    ]);

    const { data: contracts } = await supabase
      .from("contratos")
      .select("valor_total");

    const totalValue = contracts?.reduce((sum, c) => sum + Number(c.valor_total), 0) || 0;

    const { data: upcomingInstallments } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome))")
      .order("data_vencimento", { ascending: true })
      .limit(10);

    return reply.send({
      success: true,
      data: {
        totalCustomers: totalCustomers?.length || 0,
        totalContracts: totalContracts?.length || 0,
        pendingInstallments: pendingInstallments?.length || 0,
        overdueInstallments: overdueInstallments?.length || 0,
        totalValue,
        upcomingInstallments: upcomingInstallments || [],
      },
    });
  });
}