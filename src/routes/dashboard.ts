import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (req: FastifyRequest, reply: FastifyReply) => {
    const [{ data: totalClientes }, { data: totalContratos }, { data: parcelasPendentes }, { data: parcelasAtrasadas }] = await Promise.all([
      supabase.from("clientes").select("*", { count: "exact", head: true }),
      supabase.from("contratos").select("*", { count: "exact", head: true }),
      supabase.from("parcelas").select("*").eq("status", "pendente"),
      supabase.from("parcelas").select("*").eq("status", "atrasado"),
    ]);

    const { data: contratos } = await supabase
      .from("contratos")
      .select("valor_total");

    const valorTotal = contratos?.reduce((sum, c) => sum + Number(c.valor_total), 0) || 0;

    const { data: ultimasParcelas } = await supabase
      .from("parcelas")
      .select("*, contratos(clientes(nome))")
      .order("data_vencimento", { ascending: true })
      .limit(10);

    return reply.send({
      success: true,
      data: {
        totalClientes: totalClientes?.length || 0,
        totalContratos: totalContratos?.length || 0,
        parcelasPendentes: parcelasPendentes?.length || 0,
        parcelasAtrasadas: parcelasAtrasadas?.length || 0,
        valorTotal,
        ultimasParcelas: ultimasParcelas || [],
      },
    });
  });
}