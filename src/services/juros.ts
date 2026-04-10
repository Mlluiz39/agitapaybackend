export function calcularJuros(
  valor: number,
  taxa: number,
  parcelas: number,
  tipo: "simples" | "composto"
): number {
  if (tipo === "simples") {
    return valor * (1 + taxa * parcelas);
  }

  if (tipo === "composto") {
    return valor * Math.pow(1 + taxa, parcelas);
  }

  throw new Error("Tipo de juros inválido: " + tipo);
}