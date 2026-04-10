export function calculateInterest(
  value: number,
  rate: number,
  installments: number,
  type: "simples" | "composto"
): number {
  if (type === "simples") {
    return value * (1 + rate * installments);
  }

  if (type === "composto") {
    return value * Math.pow(1 + rate, installments);
  }

  throw new Error("Invalid interest type: " + type);
}