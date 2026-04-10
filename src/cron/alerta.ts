import cron from "node-cron";
import { supabase } from "../services/supabase.js";
import { cobrar } from "../services/whatsapp.js";
import dayjs from "dayjs";

interface ParcelaComCliente {
  id: string;
  valor: number;
  data_vencimento: string;
  clientes: {
    nome: string;
    telefone: string;
  };
}

cron.schedule("0 8 * * *", async () => {
  const hoje = dayjs().format("YYYY-MM-DD");

  const { data } = await supabase
    .from("parcelas")
    .select("*, clientes(*)")
    .lte("data_vencimento", hoje)
    .eq("status", "pendente") as { data: ParcelaComCliente[] | null };

  if (!data) return;

  for (const p of data) {
    const msg = `Olá ${p.clientes.nome}

Parcela atrasada!
Valor: R$ ${p.valor}

Pague o quanto antes.`;

    try {
      await cobrar(p.clientes.telefone, msg);
    } catch (error) {
      console.error(`Erro ao enviar mensagem para ${p.clientes.telefone}:`, error);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
});