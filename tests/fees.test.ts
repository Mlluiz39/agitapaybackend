import { describe, it, expect } from "vitest";
import { calculateInterest } from "../src/services/fees.js";

describe("calculateInterest", () => {
  it("should calculate simple interest correctly", () => {
    const result = calculateInterest(1000, 0.05, 12, "simples");
    expect(result).toBe(1600);
  });

  it("should calculate compound interest correctly", () => {
    const result = calculateInterest(1000, 0.05, 12, "composto");
    expect(result).toBeCloseTo(1795.86, 2);
  });
});