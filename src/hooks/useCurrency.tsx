import { useMemo } from "react";
import { useCompany } from "./useCompany";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  SEK: "kr",
  NOK: "kr",
  MXN: "$",
  INR: "₹",
  BRL: "R$",
  KRW: "₩",
  SGD: "S$",
  NZD: "NZ$",
  ZAR: "R",
  HKD: "HK$",
  TRY: "₺",
  RUB: "₽",
};

export function useCurrency() {
  const { company } = useCompany();

  const currency = company?.currency || "USD";
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatAmount = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };
  }, [currency]);

  return {
    currency,
    symbol,
    formatAmount,
  };
}
