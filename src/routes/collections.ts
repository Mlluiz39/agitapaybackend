import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { cobrar } from "../services/whatsapp.js";
import { createAuditLog } from "../utils/audit.js";
import { z } from "zod";

const CollectionInputSchema = z.object({
  telefone: z.string().min(10),
  nome: z.string().min(1),
  valor: z.number().positive(),
});

interface CollectionInput {
  telefone: string;
  nome: string;
  valor: number;
}

export default async function collectionsRoutes(app: FastifyInstance) {
  app.post(
    "/collect",
    async (req: FastifyRequest<{ Body: CollectionInput }>, reply: FastifyReply) => {
      const validation = CollectionInputSchema.safeParse(req.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { telefone, nome, valor } = validation.data;

      const msg = `Hello ${nome}\n\nYour installment of R$ ${valor.toFixed(2)} is pending.`;

      try {
        await cobrar(telefone, msg);
      } catch (error) {
        return reply.status(500).send({
          success: false,
          message: "Error sending message",
        });
      }

      await createAuditLog({
        action: "create_cobranca",
        entity_type: "cobranca",
        details: { telefone, nome, valor },
      });

      return reply.send({
        success: true,
        message: "Collection sent",
      });
    }
  );
}