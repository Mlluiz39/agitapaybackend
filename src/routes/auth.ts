import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { supabase } from "../services/supabase.js";
import { createAuditLog } from "../utils/audit.js";
import { validarCPF } from "../utils/validators.js";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(1),
  role: z.enum(["admin", "user"]).default("user"),
});

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  nome: string;
  role?: "admin" | "user";
}

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    "/login",
    async (req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const validation = LoginSchema.safeParse(req.body);
      
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { email, password } = validation.data;

      const { data: users, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .limit(1);

      if (error || !users || users.length === 0) {
        return reply.status(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }

      const user = users[0];
      
      const token = app.jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      await createAuditLog({
        user_id: user.id,
        action: "login",
        entity_type: "usuario",
        entity_id: user.id,
      });

      return reply.send({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role,
        },
      });
    }
  );

  app.post(
    "/register",
    async (req: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      const validation = RegisterSchema.safeParse(req.body);
      
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: validation.error.errors,
        });
      }

      const { email, password, nome, role } = validation.data;

      const { data: existing } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (existing && existing.length > 0) {
        return reply.status(409).send({
          success: false,
          message: "Email already registered",
        });
      }

      const { data, error } = await supabase
        .from("usuarios")
        .insert([{
          email,
          password,
          nome,
          role,
        }])
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      const token = app.jwt.sign({
        userId: data.id,
        email: data.email,
        role: data.role,
      });

      return reply.status(201).send({
        success: true,
        token,
        user: {
          id: data.id,
          email: data.email,
          nome: data.nome,
          role: data.role,
        },
      });
    }
  );
}