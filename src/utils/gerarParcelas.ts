import dayjs, { Dayjs } from "dayjs";

export interface ParcelaInput {
  numero: number;
  valor: number;
  data_vencimento: string;
  status: "pendente";
}

export function gerarParcelas(
  valorTotal: number,
  parcelas: number,
  dataInicio: Date | Dayjs
): ParcelaInput[] {
  const valorParcela = valorTotal / parcelas;

  const lista: ParcelaInput[] = [];

  for (let i = 1; i <= parcelas; i++) {
    lista.push({
      numero: i,
      valor: valorParcela,
      data_vencimento: dayjs(dataInicio).add(i, "month").format("YYYY-MM-DD"),
      status: "pendente",
    });
  }

  return lista;
}