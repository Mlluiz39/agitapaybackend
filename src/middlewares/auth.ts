import { FastifyRequest, FastifyReply } from "fastify";
import { JWTPayload } from "../config/auth.js";

declare module "fastify" {
  interface FastifyRequest {
    jwtVerify<JWTPayload>(options?: object): Promise<JWTPayload>;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
}

export function requireRole(...roles: Array<"admin" | "user">) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JWTPayload;
    
    if (!roles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }
  };
}