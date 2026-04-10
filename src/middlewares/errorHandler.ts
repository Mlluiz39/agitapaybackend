import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      request.log.error(error);

      if (error.statusCode === 401) {
        return reply.status(401).send({
          success: false,
          message: "Unauthorized",
        });
      }

      if (error.statusCode === 403) {
        return reply.status(403).send({
          success: false,
          message: "Forbidden",
        });
      }

      if (error.statusCode === 404) {
        return reply.status(404).send({
          success: false,
          message: "Not found",
        });
      }

      if (error.validation) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.validation,
        });
      }

      const isProduction = process.env.NODE_ENV === "production";

      return reply.status(error.statusCode || 500).send({
        success: false,
        message: isProduction ? "Internal server error" : error.message,
        ...(!isProduction && { stack: error.stack }),
      });
    }
  );

  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      success: false,
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}