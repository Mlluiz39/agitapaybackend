import { z, ZodSchema, ZodError } from "zod";
import { FastifyRequest, FastifyReply } from "fastify";

export function validateBody(schema: ZodSchema) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      throw error;
    }
  };
}