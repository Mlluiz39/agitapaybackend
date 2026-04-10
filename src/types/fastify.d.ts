import "fastify";
import { JWTPayload } from "../config/auth.js";

declare module "fastify" {
  interface FastifyInstance {
    jwt: {
      sign: (payload: JWTPayload) => string;
      verify: (token: string) => JWTPayload;
    };
  }
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}