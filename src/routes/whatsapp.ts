import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import { getWhatsAppStatus, whatsappClient } from "../services/whatsapp.js";

const whatsappRoutes: FastifyPluginAsync = async (app) => {
  // Rota para checar status e obter QR Code
  app.get("/whatsapp/status", { preHandler: [authenticate] }, async (request, reply) => {
    const status = getWhatsAppStatus();
    return reply.status(200).send(status);
  });

  // Rota para forçar desconexão
  app.post("/whatsapp/logout", { preHandler: [authenticate] }, async (request, reply) => {
    try {
      await whatsappClient.logout();
      return reply.status(200).send({ message: "WhatsApp desconectado com sucesso." });
    } catch (error) {
      return reply.status(500).send({ error: "Erro ao desconectar o WhatsApp." });
    }
  });
};

export default whatsappRoutes;
