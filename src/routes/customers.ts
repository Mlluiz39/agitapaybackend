import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import { createAuditLog } from "../utils/audit.js";
import { CustomerSchema } from "../types/customer.js";
import { JWTPayload } from "../config/auth.js";

interface CustomerBody {
  nome: string;
  cpf: string;
  rg?: string;
  telefone: string;
  email?: string;
  endereco?: string;
}

export default async function customersRoutes(app: FastifyInstance) {
  app.post(
    "/customers",
    async (req: FastifyRequest<{ Body: CustomerBody }>, reply: FastifyReply) => {
      const validation = CustomerSchema.safeParse(req.body);

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

  app.get("/customers", async (req: FastifyRequest, reply: FastifyReply) => {
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
    "/customers/:id/balance",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;

      const { data: parcelas, error } = await supabase
        .from("parcelas")
        .select("*, contratos!inner(cliente_id)")
        .eq("contratos.cliente_id", id);

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      let total = 0;
      let pago = 0;
      let pendente = 0;

      for (const p of parcelas || []) {
        const valor = Number(p.valor_atualizado || p.valor || 0);
        const pagoValor = Number(p.valor_pago || 0);
        
        total += valor;
        if (p.status === "pago") {
          pago += pagoValor > 0 ? pagoValor : valor;
        } else {
          pendente += valor;
        }
      }

      return reply.send({
        success: true,
        data: { total, pago, pendente },
      });
    }
  );

  app.get(
    "/customers/:id",
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
          message: "Customer not found",
        });
      }

      return reply.send({
        success: true,
        data,
      });
    }
  );

  app.put(
    "/customers/:id",
    async (req: FastifyRequest<{ Params: { id: string }, Body: CustomerBody }>, reply: FastifyReply) => {
      const { id } = req.params;
      const validation = CustomerSchema.safeParse(req.body);

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
        .update({
          nome,
          cpf,
          rg,
          telefone,
          email,
          endereco,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      const user = req.user as JWTPayload | undefined;
      await createAuditLog({
        user_id: user?.userId,
        action: "update_cliente",
        entity_type: "cliente",
        entity_id: id,
        details: { nome, cpf },
      });

      return reply.send({
        success: true,
        data,
      });
    }
  );

  app.delete(
    "/customers/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }

      const user = req.user as JWTPayload | undefined;
      await createAuditLog({
        user_id: user?.userId,
        action: "delete_cliente",
        entity_type: "cliente",
        entity_id: id,
        details: { id },
      });

      return reply.send({
        success: true,
        data,
      });
    }
  );

  app.post(
    "/api/customers",
    async (req: FastifyRequest<{ Body: CustomerBody }>, reply: FastifyReply) => {
      const validation = CustomerSchema.safeParse(req.body);

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

  app.get("/api/customers/summary", async (req: FastifyRequest, reply: FastifyReply) => {
    // Busca clientes
    const { data: clientesData, error: errCli } = await supabase.from("clientes").select("*");
    if (errCli) return reply.status(500).send({ success: false, message: errCli.message });

    // Busca parcelas com contrato (pra vincular ao cliente)
    const { data: parcelasData, error: errPar } = await supabase
      .from("parcelas")
      .select("*, contratos(cliente_id)");
    if (errPar) return reply.status(500).send({ success: false, message: errPar.message });

    // Agrupa os valores
    const sumarios = (clientesData || []).map((cliente) => {
      const parcelasDoCliente = (parcelasData || []).filter(
        (p: any) => p.contratos?.cliente_id === cliente.id
      );

      let total = 0;
      let pago = 0;
      let pendente = 0;

      for (const p of parcelasDoCliente) {
        const v = Number(p.valor_atualizado || p.valor || 0);
        const pV = Number(p.valor_pago || 0);
        total += v;
        if (p.status === "pago") {
          pago += pV > 0 ? pV : v;
        } else {
          pendente += v;
        }
      }

      return {
        id: cliente.id,
        nome: cliente.nome,
        documentos: cliente.documentos,
        total,
        pago,
        pendente
      };
    });

    return reply.send({ success: true, data: sumarios });
  });
}