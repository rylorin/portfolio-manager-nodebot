export interface BalanceEntry {
  id: number;
  quantity: number;
  currency: string;
  baseRate: number | undefined;
  availCurrencies?: string[];
}
