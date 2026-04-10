import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL e SUPABASE_KEY são obrigatórios");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Database {
  clientes: unknown;
  contratos: unknown;
  parcelas: unknown;
}