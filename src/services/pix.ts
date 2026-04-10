import QRCode from "qrcode";
import "dotenv/config";

export interface PixPayload {
  chave: string;
  valor: number;
  descricao?: string;
}

export async function gerarPix(valor: number, descricao?: string): Promise<string> {
  const payload = descricao 
    ? `Pagamento de R$ ${valor} - ${descricao}` 
    : `Pagamento de R$ ${valor}`;
  return await QRCode.toDataURL(payload);
}

export function criarPayloadPix(payload: PixPayload): string {
  const { chave, valor, descricao } = payload;
  return `00020126360014BR.GOV.BCB.PIX01${chave.length.toString().padStart(2, "0")}${chave}52040000${descricao ? descricao.length.toString().padStart(2, "0") + descricao : "5303986"}5405${valor.toFixed(2).replace(".", "")}550600BR`;
}