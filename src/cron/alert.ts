import cron from "node-cron";
import { supabase } from "../services/supabase.js";
import { cobrar } from "../services/whatsapp.js";
import dayjs from "dayjs";

interface ParcelaExt {
  id: string;
  valor: number;
  valor_atualizado: number | null;
  data_vencimento: string;
  dias_atraso: number | null;
  contratos: {
    clientes: {
      nome: string;
      telefone: string;
      email?: string;
    };
  };
}

// Roda todo dia às 08:00 da manhã
cron.schedule("0 8 * * *", async () => {
  console.log("[CRON] Executando rotina de cobrança do WhatsApp...");
  const today = dayjs().startOf("day");

  // Buscar TODAS as parcelas pendentes para calcular notificações futuras e atrasadas
  const { data } = await supabase
    .from("parcelas")
    .select("*, contratos(clientes(nome, telefone, email))")
    .eq("status", "pendente") as { data: ParcelaExt[] | null };

  if (!data || data.length === 0) {
    console.log("[CRON] Nenhuma cobrança pendente identificada.");
    return;
  }

  let mensagensEnviadas = 0;

  for (const p of data) {
    const telefone = p.contratos?.clientes?.telefone;
    const nome = p.contratos?.clientes?.nome?.split(" ")[0] || "Cliente";

    if (!telefone) continue;

    const dataVenc = dayjs(p.data_vencimento).startOf("day");
    const diasDiferenca = dataVenc.diff(today, "day"); // Positivo = futuro, Negativo = atrasado, 0 = hoje
    
    const dataVencBr = dataVenc.format("DD/MM/YYYY");
    const valorBaseFormatado = p.valor.toFixed(2).replace('.', ',');

    let msg = "";

    // 5 dias antes
    if (diasDiferenca === 5) {
      msg = `Olá ${nome}, aqui é da AgitaPay ! lembrete amigável: Sua parcela no valor de R$ ${valorBaseFormatado} vence em 5 dias, no dia ${dataVencBr}`;
    } 
    // 24 horas antes (1 dia)
    else if (diasDiferenca === 1) {
      msg = `Olá ${nome}, aqui é da AgitaPay ! lembrete amigável: Sua parcela no valor de R$ ${valorBaseFormatado} vence amanhã, no dia ${dataVencBr}`;
    } 
    // No dia do vencimento
    else if (diasDiferenca === 0) {
      msg = `Olá ${nome}, aqui é da AgitaPay ! lembrete amigável: Sua parcela no valor de R$ ${valorBaseFormatado} vence *hoje* no dia ${dataVencBr}`;
    } 
    // Atrasado (negativo)
    else if (diasDiferenca < 0) {
      const diasAtraso = Math.abs(diasDiferenca);
      const valorExibir = p.valor_atualizado || p.valor; // Caso tenha juros aplicados
      msg = `Olá ${nome}, aqui é da AgitaPay ! lembrete amigável: Sua parcela no valor de R$ ${valorExibir.toFixed(2).replace('.', ',')} venceu no dia ${dataVencBr} (${diasAtraso} dias de atraso)`;
    } else {
      // Ignorar diasDiferenca > 5 ou entre 2 e 4.
      continue;
    }

    try {
      await cobrar(telefone, msg);
      mensagensEnviadas++;
    } catch (error) {
      console.error(`[CRON] Erro ao enviar WhatsApp para ${telefone}:`, error);
    }

    // ----------------------------
    // Envio do E-mail (Apenas no dia do vencimento)
    // ----------------------------
    if (diasDiferenca === 0) {
      const email = p.contratos?.clientes?.email;
      if (email && email.includes('@')) {
        try {
          const { sendEmail, buildAgitaPayEmailTemplate } = await import("../services/email.js");
          const valorExibir = (diasDiferenca < 0 && p.valor_atualizado) ? p.valor_atualizado : p.valor;
          
          const html = buildAgitaPayEmailTemplate(
            nome, 
            diasDiferenca, 
            valorExibir, 
            dataVencBr
          );
          
          const subjectMap: Record<number, string> = {
            5: "Aviso: Sua fatura da AgitaPay vence em 5 dias!",
            1: "Lembrete: Sua fatura da AgitaPay vence amanhã!",
            0: "Sua fatura da AgitaPay vence HOJE. ✨",
          };
          
          const subject = diasDiferenca < 0 
            ? `AVISO: Fatura em atraso (${Math.abs(diasDiferenca)} dias) - AgitaPay`
            : (subjectMap[diasDiferenca] || "Atualizações sobre sua fatura AgitaPay");

          const result = await sendEmail(email, subject, html);
          if (!result.success) {
            console.error(`[CRON] Falha silenciosa no envio de email para ${email}:`, result.message);
          }
        } catch (errEmail) {
          console.error(`[CRON] Erro ao enviar email para ${email}:`, errEmail);
        }
      }
    }

    // Aguardar 5 segundos entre as mensagens para evitar banimento pelo WhatsApp (e limitação anti-spam no E-mail)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  
  console.log(`[CRON] Finalizada cobrança. ${mensagensEnviadas} notificações de WhatsApp enviadas.`);
});