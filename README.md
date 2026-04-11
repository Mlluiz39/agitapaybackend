# ⚙️ AgitaPay Backend - Core API & Motor Autônomo

<div align="center">
  <img alt="AgitaPay API" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img alt="Fastify" src="https://img.shields.io/badge/fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</div>
<br>

O Backend da **AgitaPay** é o motor pulsante da plataforma de Gestão e Cobranças de Crédito. Muito além de apenas servir uma API RESTful veloz, este sistema possui rotinas de cron autônomas, e dispara notificações dinâmicas e humanizadas via múltiplos canais para resgatar recebíveis antes ou logo após o vencimento da dívida.

---

## 🛠 Arquitetura do Software (Back-End)

| Tecnologia          | Função                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js (LTS)**   | Ambiente assíncrono de altíssima performance para I/O não bloqueante.                                                                               |
| **Fastify**         | Framework ultra-rápido para microserviços e roteamento de tráfego, escolhido sobre o Express.js por seu benchmark superior.                           |
| **Supabase / PGSQL**| Banco de Dados Relacional. A aplicação utiliza o SDK do Supabase integrando Client, autenticação e tabelas altamente estruturadas.                   |
| **whatsapp-web.js** | Orquestrador de mensageria em tempo real, utilizando instância Puppeteer injetada no backend que pareia o QR Code e transforma em Bot transacional. |
| **Resend API**      | Envio massivo e robusto de e-mails em HTML sem a infraestrutura tradicional de SMTP frágil (adeus caixas de Spam no momento da cobrança).           |
| **Node-Cron**       | Sistema engrenado em Background que acorda todos os dias para escanear a carteira e penalizar (com juros) e cobrar os clientes inadimplentes.       |

## 🚀 Como a Cobrança Funciona (Fluxo Autônomo)

O backend possui um módulo engrenado em relógio local `cron/alert.ts` programado para rodar todas as manhãs. Quando ele roda:

1. **Juros e Multa**: Os contratos escaneados cujo prazo venceu sofrem uma reestruturação matemática atualizando a dívida atual mediante juros percentuais configurados globalmente.
2. **Dutos de Mensagens**: 
   - **T-5 e T-1**: O robô de WhatsApp acorda para enviar lembretes amigáveis se antecipando aos vencimentos antes da fatura estourar.
   - **T-0**: No exato dia do vencimento da conta, tanto o `WhatsApp` quanto a `API do Resend Email` varrem os contatos disparando templates codificados de aviso de PIX verde.
   - **Inadimplentes**: Cobranças diárias passam a pingar no devedor via WhatsApp com a somatória atualizada da conta em vermelho.

## 🔌 Principais Endpoints Rest

* `/api/customers`: GET/POST/PUT para cadastro em Full KYC com documentos.
* `/api/customers/summary`: Rota analítica pesada que enxerga o panorama total (Dívida total alocada, Dinheiro no Caixa e Dinheiro Inadimplente).
* `/api/alerts`: Analisador de cohort gerando fluxos instantâneos e métricas para o Painel de controle no Frontend.
* `/installments/:id/notify`: Endpoint para envio imediato de cobranças humanizadas, que força o robô a enviar WA e Email on-demand.

## ⚙️ Como Iniciar & Setup

**1. Instalação e Preparo Inicial**
\`\`\`bash
npm install
\`\`\`

**2. Variáveis de Ambiente (.env)**
Crie na raiz um arquivo `.env` para abastecer os serviços críticos:
\`\`\`env
# Bancos
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_KEY="..."

# Emails (Motor de Notificacao)
RESEND_API_KEY="..."

# Configuração HTTP
PORT=3000
ALLOWED_ORIGINS="http://localhost:5173"
\`\`\`

**3. Execução em Modo de Desenvolvimento**
\`\`\`bash
npm run dev
\`\`\`
> **⚠️ Aviso**: O servidor vai carregar a biblioteca do WhatsApp. Na primeira vez, **um QR Code aparecerá no console do seu terminal**. Você precisará parear o seu celular corporativo rapidamente para ceder as chaves de acesso ao motor autônomo. Uma pasta invisível garantirá que você não precise escanear novamente caso não faça logout.

---

> Construído visando performance crítica e robustez nas entregas das faturas. Este é um motor de retenção que se paga no primeiro mês salvando contratos em perda passiva.
