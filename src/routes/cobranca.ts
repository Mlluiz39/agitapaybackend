import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { cobrar } from "../services/whatsapp.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";

const CobrancaInputSchema = z.object({
  telefone: z.string().min(10),
  nome: z.string().min(1),
  valor: z.number().positive(),
});

interface CobrancaInput {
  telefone: string;
  nome: string;
  valor: number;
}

export default async function cobrancaRoutes(app: FastifyInstance) {
  app.post(
    "/cobrar",
    async (req: FastifyRequest<{ Body: CobrancaInput }>, reply: FastifyReply) => {
      const validation = CobrancaInputSchema.safeParse(req.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { telefone, nome, valor } = validation.data;

      const msg = `Olá ${nome}\n\nSua parcela de R$ ${valor.toFixed(2)} está pendente.`;

      try {
        await cobrar(telefone, msg);
      } catch (error) {
        return reply.status(500).send({
          success: false,
          message: "Erro ao enviar mensagem",
        });
      }

      await createAuditLog({
        action: "create_cobranca",
        entity_type: "cobranca",
        details: { telefone, nome, valor },
      });

      return reply.send({
        success: true,
        message: "Cobrança enviada",
      });
    }
  );
}