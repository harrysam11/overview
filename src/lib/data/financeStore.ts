import type { LocalFinanceTransaction, LocalFinanceBudget, LocalInvestmentAsset } from "@/lib/local/schema";

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage (0 - 100)
  totalPortfolioValue: number;
  totalInvested: number;
  totalGainLoss: number;
  gainLossPct: number;
}

export interface CreateTransactionInput {
  date: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  description?: string;
}

export interface CreateAssetInput {
  name: string;
  symbol?: string;
  asset_class: "stocks" | "crypto" | "etf" | "cash" | "real_estate" | "metals" | "other";
  units: number;
  buy_price: number;
  current_price: number;
  target_allocation_pct?: number;
  notes?: string;
}

export interface FinanceStore {
  listTransactions(): Promise<LocalFinanceTransaction[]>;
  createTransaction(input: CreateTransactionInput): Promise<LocalFinanceTransaction>;
  deleteTransaction(id: string): Promise<void>;

  listBudgets(): Promise<LocalFinanceBudget[]>;
  setBudget(category: string, monthlyLimit: number): Promise<LocalFinanceBudget>;
  deleteBudget(id: string): Promise<void>;

  listAssets(): Promise<LocalInvestmentAsset[]>;
  createAsset(input: CreateAssetInput): Promise<LocalInvestmentAsset>;
  updateAsset(id: string, updates: Partial<CreateAssetInput>): Promise<LocalInvestmentAsset>;
  deleteAsset(id: string): Promise<void>;

  getSummary(monthStr?: string): Promise<FinanceSummary>;
  exportTransactionsCsv(): Promise<string>;
  importTransactionsCsv(csvContent: string): Promise<number>;
}

export const getFinanceStore = async (): Promise<FinanceStore> => {
  const { localFinanceStore } = await import("./localFinanceStore");
  return localFinanceStore;
};
