import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase.js";
import { createAuditLog } from "../utils/audit.js";
import { JWTPayload } from "../config/auth.js";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = "documentos-clientes";

type DocumentType = "cnh" | "rg" | "comprovante_residencia" | "selfie";

const VALID_DOC_TYPES: DocumentType[] = [
  "cnh",
  "rg",
  "comprovante_residencia",
  "selfie",
];

export default async function uploadsRoutes(app: FastifyInstance) {
  // Upload de documento/selfie do cliente
  app.post(
    "/customers/:id/documents",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;

      // Verificar se o cliente existe
      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("id, nome, documento")
        .eq("id", id)
        .single();

      if (clienteError || !cliente) {
        return reply.status(404).send({
          success: false,
          message: "Cliente não encontrado",
        });
      }

      // Parse multipart
      const data = await req.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: "Nenhum arquivo enviado",
        });
      }

      // Validar tipo de documento
      const docType = (data.fields?.doc_type as any)?.value as string;
      if (!docType || !VALID_DOC_TYPES.includes(docType as DocumentType)) {
        return reply.status(400).send({
          success: false,
          message: `Tipo de documento inválido. Use: ${VALID_DOC_TYPES.join(", ")}`,
        });
      }

      // Validar MIME type
      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          message: `Tipo de arquivo não suportado. Permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
        });
      }

      // Ler o buffer do arquivo
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Validar tamanho
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          message: "Arquivo excede o tamanho máximo de 5MB",
        });
      }

      // Gerar nome único
      const fileExt = data.filename?.split(".").pop() || "jpg";
      const uniqueName = `${id}/${docType}_${crypto.randomUUID()}.${fileExt}`;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueName, fileBuffer, {
          contentType: data.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro no upload:", uploadError);
        return reply.status(500).send({
          success: false,
          message: `Erro ao fazer upload: ${uploadError.message}`,
        });
      }

      // Gerar URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueName);

      // Atualizar registro do cliente com as URLs dos documentos
      const existingDocs =
        typeof cliente.documento === "string"
          ? (() => {
              try {
                return JSON.parse(cliente.documento);
              } catch {
                return {};
              }
            })()
          : cliente.documento || {};

      const updatedDocs = {
        ...existingDocs,
        [docType]: {
          url: publicUrl,
          path: uploadData.path,
          uploaded_at: new Date().toISOString(),
          original_name: data.filename,
          mime_type: data.mimetype,
          size: fileBuffer.length,
        },
      };

      const { error: updateError } = await supabase
        .from("clientes")
        .update({ documento: JSON.stringify(updatedDocs) })
        .eq("id", id);

      if (updateError) {
        console.error("Erro ao atualizar cliente:", updateError);
        return reply.status(500).send({
          success: false,
          message: `Erro ao salvar referência do documento: ${updateError.message}`,
        });
      }

      // Audit log
      try {
        const user = req.user as JWTPayload | undefined;
        await createAuditLog({
          user_id: user?.userId,
          action: "upload_documento",
          entity_type: "cliente",
          entity_id: id,
          details: { doc_type: docType, filename: data.filename },
        });
      } catch (e) {
        // silent fail on audit
      }

      return reply.status(201).send({
        success: true,
        data: {
          doc_type: docType,
          url: publicUrl,
          path: uploadData.path,
          original_name: data.filename,
          size: fileBuffer.length,
        },
      });
    }
  );

  // Listar documentos do cliente
  app.get(
    "/customers/:id/documents",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;

      const { data: cliente, error } = await supabase
        .from("clientes")
        .select("id, documento")
        .eq("id", id)
        .single();

      if (error || !cliente) {
        return reply.status(404).send({
          success: false,
          message: "Cliente não encontrado",
        });
      }

      let docs = {};
      if (typeof cliente.documento === "string" && cliente.documento) {
        try {
          docs = JSON.parse(cliente.documento);
        } catch {
          docs = {};
        }
      } else if (cliente.documento) {
        docs = cliente.documento;
      }

      return reply.send({
        success: true,
        data: docs,
      });
    }
  );

  // Deletar documento do cliente
  app.delete(
    "/customers/:id/documents/:docType",
    async (
      req: FastifyRequest<{
        Params: { id: string; docType: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id, docType } = req.params;

      if (!VALID_DOC_TYPES.includes(docType as DocumentType)) {
        return reply.status(400).send({
          success: false,
          message: `Tipo de documento inválido. Use: ${VALID_DOC_TYPES.join(", ")}`,
        });
      }

      const { data: cliente, error } = await supabase
        .from("clientes")
        .select("id, documento")
        .eq("id", id)
        .single();

      if (error || !cliente) {
        return reply.status(404).send({
          success: false,
          message: "Cliente não encontrado",
        });
      }

      let docs: Record<string, any> = {};
      if (typeof cliente.documento === "string" && cliente.documento) {
        try {
          docs = JSON.parse(cliente.documento);
        } catch {
          docs = {};
        }
      } else if (cliente.documento) {
        docs = cliente.documento as Record<string, any>;
      }

      // Remover do storage se existir
      if (docs[docType]?.path) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([docs[docType].path]);
      }

      delete docs[docType];

      const { error: updateError } = await supabase
        .from("clientes")
        .update({ documento: JSON.stringify(docs) })
        .eq("id", id);

      if (updateError) {
        return reply.status(500).send({
          success: false,
          message: `Erro ao remover documento: ${updateError.message}`,
        });
      }

      // Audit log
      try {
        const user = req.user as JWTPayload | undefined;
        await createAuditLog({
          user_id: user?.userId,
          action: "delete_documento",
          entity_type: "cliente",
          entity_id: id,
          details: { doc_type: docType },
        });
      } catch (e) {
        // silent fail
      }

      return reply.send({
        success: true,
        message: "Documento removido com sucesso",
      });
    }
  );
}
