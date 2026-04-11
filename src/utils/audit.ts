import { supabase } from "../services/supabase.js";

export type AuditAction = 
  | "login" 
  | "logout" 
  | "create_cliente" 
  | "update_cliente" 
  | "delete_cliente"
  | "upload_documento"
  | "delete_documento"
  | "create_contrato" 
  | "view_contrato"
  | "delete_contrato"
  | "create_cobranca"
  | "update_parcela"
  | "generate_pix"
  | "confirm_payment";

export interface AuditLog {
  user_id?: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export async function createAuditLog(log: AuditLog): Promise<void> {
  const { error } = await supabase
    .from("audit_logs")
    .insert([{
      user_id: log.user_id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: new Date().toISOString(),
    }]);

  if (error) {
    console.error("Failed to create audit log:", error);
  }
}

export function getClientInfo(request: Request): { ip: string; userAgent: string } {
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}