import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// Configuração do Cliente WhatsApp via Puppeteer
export const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

let isReady = false;

// Gera o QR Code no terminal para autenticar a conta
whatsappClient.on('qr', (qr) => {
  console.log('\n=======================================');
  console.log('📲 ESCANEIE O QR CODE LOGO ABAIXO COM SEU WHATSAPP');
  console.log('=======================================\n');
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
  console.log('\n✅ Conexão com o WhatsApp estabelecida com sucesso!\n');
  isReady = true;
});

whatsappClient.on('auth_failure', (msg) => {
  console.error('\n❌ Falha na autenticação do WhatsApp:', msg, '\n');
});

whatsappClient.on('disconnected', (reason) => {
  console.log('\n🔄 WhatsApp desconectado:', reason, '\n');
  isReady = false;
});

// Inicialização opcional que será chamada pelo server.ts
export const initializeWhatsApp = () => {
  console.log('Iniciando serviço interno do WhatsApp via Puppeteer...');
  whatsappClient.initialize().catch((err) => {
    console.error('Erro ao inicializar o WhatsApp:', err);
  });
};

/**
 * Envia uma mensagem para o número fornecido
 * @param to Número de telefone (ex: '(11) 99999-9999')
 * @param message Mensagem string
 */
export const cobrar = async (to: string, message: string): Promise<void> => {
  if (!isReady) {
    throw new Error('Serviço de WhatsApp interno não está pronto (Conecte o QR Code no terminal).');
  }

  // Tratamento do número: remove tudo que não for dígito
  let cleanNumber = to.replace(/\D/g, '');

  // Validação simplificada para números do Brasil (10 a 11 dígitos sem o DDI)
  if (cleanNumber.length === 10 || cleanNumber.length === 11) {
    cleanNumber = `55${cleanNumber}`;
  }

  let finalNumberId: string | null = null;

  try {
    // getNumberId verifica se o número existe e qual o ID real (ignora ou adiciona o nono dígito do BR automaticamente)
    const registered = await whatsappClient.getNumberId(cleanNumber);
    if (registered) {
      finalNumberId = registered._serialized;
    } else {
      // Como último recurso, tenta enviar "na força" caso o getNumberId falhe por limitação no caching
      finalNumberId = `${cleanNumber}@c.us`;
    }

    // Se a pessoa estiver enviando mensagem para si mesma
    if (whatsappClient.info && whatsappClient.info.wid && whatsappClient.info.wid.user === cleanNumber) {
      finalNumberId = whatsappClient.info.wid._serialized;
    }

    await whatsappClient.sendMessage(finalNumberId, message);
    console.log(`✅ Mensagem de cobrança enviada com sucesso para ${finalNumberId}`);
  } catch (error: any) {
    console.error(`❌ Erro ao enviar WhatsApp para ${finalNumberId || cleanNumber}:`, error);
    throw error;
  }
};