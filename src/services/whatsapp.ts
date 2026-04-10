import axios from "axios";
import "dotenv/config";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";

export async function cobrar(numero: string, mensagem: string): Promise<void> {
  await axios.post(`${EVOLUTION_API_URL}/message/sendText`, {
    number: numero,
    text: mensagem,
  }, {
    headers: {
      apikey: process.env.EVOLUTION_API_KEY,
    },
  });
}