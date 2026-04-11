import { Resend } from 'resend';
import "dotenv/config";

// Crie a seguinte variável no seu .env:
// RESEND_API_KEY="re_123456789"

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY não configurada no .env. Email ignorado.");
    return { success: false, message: "RESEND_API_KEY não configurada" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'AgitaPay <no-reply@resend.dev>', // Ou troque pelo seu domínio autenticado no futuro
      to: [to],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error(`❌ Erro da API Resend ao enviar para ${to}:`, error);
      return { success: false, message: error.message };
    }

    console.log(`✉️ Email enviado via API com sucesso para ${to}: ${data?.id}`);
    return { success: true, message: "Sucesso", data };
  } catch (error: any) {
    console.error(`❌ Exceção ao enviar email para ${to}:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Monta o template HTML bonito da AgitaPay
 */
export const buildAgitaPayEmailTemplate = (
  nomeCliente: string,
  diasDiferenca: number, // 5 = 5 dias antes, 1 = amanhã, 0 = hoje, negativo = atraso
  valor: number,
  dataVencimento: string
) => {
  const valorFormatado = `R$ ${valor.toFixed(2).replace(".", ",")}`;
  
  let titulo = "";
  let subtitulo = "";
  let corDestaque = "#005049"; // primary (verde AgitaPay)

  if (diasDiferenca === 5) {
    titulo = "Sua fatura está se aproximando!";
    subtitulo = `Não se esqueça, sua parcela vence no dia ${dataVencimento}.`;
  } else if (diasDiferenca === 1) {
    titulo = "Sua fatura vence amanhã!";
    subtitulo = `Evite juros e multas regularizando sua parcela de amanhã.`;
  } else if (diasDiferenca === 0) {
    titulo = "Sua fatura vence HOJE!";
    subtitulo = `Não deixe para última hora! Pague hoje para manter o acesso às vantagens.`;
    corDestaque = "#00b2a9"; 
  } else if (diasDiferenca < 0) {
    titulo = "Sua fatura está em atraso!";
    subtitulo = `Notamos que o pagamento da parcela do dia ${dataVencimento} ainda não foi compensado.`;
    corDestaque = "#ba1a1a"; // error red
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f6f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background-color: ${corDestaque}; padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
        .content { padding: 40px 30px; color: #3f4947; line-height: 1.6; }
        .content h2 { margin-top: 0; color: #191c1b; font-size: 20px; }
        .box-valor { background-color: #f4f6f5; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 1px solid #dce5e2; }
        .box-valor p { margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #6f7977; font-weight: bold; }
        .box-valor h3 { margin: 10px 0 0; font-size: 32px; color: ${corDestaque}; }
        .footer { background-color: #fbfdfa; padding: 20px; text-align: center; color: #899390; font-size: 12px; border-top: 1px solid #eff1ef; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AgitaPay</h1>
        </div>
        <div class="content">
          <h2>Olá, ${nomeCliente.split(" ")[0]}!</h2>
          <p>${titulo}</p>
          <p>${subtitulo}</p>
          
          <div class="box-valor">
            <p>Valor Atualizado</p>
            <h3>${valorFormatado}</h3>
          </div>
          
          <p>Se você já realizou o pagamento, por favor, desconsidere este e-mail. Se precisar de ajuda ou de um envio de código PIX, responda a nossa equipe em nossos canais de atendimento ou WhatsApp.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} AgitaPay - Sistema de Gestão Inteligente.</p>
          <p>Mensagem gerada automaticamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
