import dayjs, { Dayjs } from "dayjs";

export interface InstallmentInput {
  numero: number;
  valor: number;
  data_vencimento: string;
  status: "pendente";
}

export function generateInstallments(
  totalValue: number,
  installments: number,
  startDate: Date | Dayjs
): InstallmentInput[] {
  const installmentValue = totalValue / installments;

  const list: InstallmentInput[] = [];

  for (let i = 1; i <= installments; i++) {
    list.push({
      numero: i,
      valor: installmentValue,
      data_vencimento: dayjs(startDate).add(i, "month").format("YYYY-MM-DD"),
      status: "pendente",
    });
  }

  return list;
}