import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import { createAuditLog } from "../utils/audit.js";
import { ClienteSchema } from "../types/cliente.js";
import { JWTPayload } from "../config/auth.js";

interface ClienteBody {
  nome: string;
  cpf: string;
  rg?: string;
  telefone: string;
  email?: string;
  endereco?: string;
}

export default async function clientesRoutes(app: FastifyInstance) {
  app.post(
    "/clientes",
    async (req: FastifyRequest<{ Body: ClienteBody }>, reply: FastifyReply) => {
      const validation = ClienteSchema.safeParse(req.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { nome, cpf, rg, telefone, email, endereco } = validation.data;

      const { data, error } = await supabase
        .from("clientes")
        .insert([{
          nome,
          cpf,
          rg,
          telefone,
          email,
          endereco,
        }])
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      const user = req.user as JWTPayload;
      await createAuditLog({
        user_id: user?.userId,
        action: "create_cliente",
        entity_type: "cliente",
        entity_id: data.id,
        details: { nome, cpf },
      });

      return reply.status(201).send({
        success: true,
        data,
      });
    }
  );

  app.get("/clientes", async (req: FastifyRequest, reply: FastifyReply) => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*");

    if (error) {
      return reply.status(500).send({
        success: false,
        message: error.message,
      });
    }

    return reply.send({
      success: true,
      data,
    });
  });

  app.get(
    "/clientes/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return reply.status(404).send({
          success: false,
          message: "Cliente não encontrado",
        });
      }

      return reply.send({
        success: true,
        data,
      });
    }
  );

  app.post(
    "/api/customers",
    async (req: FastifyRequest<{ Body: ClienteBody }>, reply: FastifyReply) => {
      const validation = ClienteSchema.safeParse(req.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { nome, cpf, rg, telefone, email, endereco } = validation.data;

      const { data, error } = await supabase
        .from("clientes")
        .insert([{
          nome,
          cpf,
          rg,
          telefone,
          email,
          endereco,
        }])
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(201).send({
        success: true,
        data,
      });
    }
  );

  app.get("/api/customers", async (req: FastifyRequest, reply: FastifyReply) => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*");

    if (error) {
      return reply.status(500).send({
        success: false,
        message: error.message,
      });
    }

    return reply.send({
      success: true,
      data,
    });
  });
}