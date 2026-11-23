import { readVaultData, updateVaultData } from "@/lib/local/vault";
import { newId, nowIso } from "@/lib/local/localDb";
import type {
  FinanceStore,
  FinanceSummary,
  CreateTransactionInput,
  CreateAssetInput,
} from "./financeStore";
import type { LocalFinanceTransaction, LocalFinanceBudget, LocalInvestmentAsset } from "@/lib/local/schema";

export const localFinanceStore: FinanceStore = {
  async listTransactions(): Promise<LocalFinanceTransaction[]> {
    const data = await readVaultData();
    return (data.finance_transactions || []).sort((a, b) => b.date.localeCompare(a.date));
  },

  async createTransaction(input: CreateTransactionInput): Promise<LocalFinanceTransaction> {
    const timestamp = nowIso();
    const newTx: LocalFinanceTransaction = {
      id: newId(),
      date: input.date,
      amount: Math.round(input.amount * 100) / 100,
      type: input.type,
      category: input.category.trim(),
      description: input.description?.trim() || null,
      created_at: timestamp,
    };

    await updateVaultData((data) => ({
      ...data,
      finance_transactions: [newTx, ...(data.finance_transactions || [])],
    }));

    return newTx;
  },

  async deleteTransaction(id: string): Promise<void> {
    await updateVaultData((data) => ({
      ...data,
      finance_transactions: (data.finance_transactions || []).filter((t) => t.id !== id),
    }));
  },

  async listBudgets(): Promise<LocalFinanceBudget[]> {
    const data = await readVaultData();
    return data.finance_budgets || [];
  },

  async setBudget(category: string, monthlyLimit: number): Promise<LocalFinanceBudget> {
    const timestamp = nowIso();
    let savedBudget: LocalFinanceBudget;

    await updateVaultData((data) => {
      const existingIndex = (data.finance_budgets || []).findIndex(
        (b) => b.category.toLowerCase() === category.trim().toLowerCase()
      );

      if (existingIndex >= 0) {
        savedBudget = {
          ...data.finance_budgets![existingIndex],
          monthly_limit: Math.round(monthlyLimit * 100) / 100,
          updated_at: timestamp,
        };
        const updated = [...data.finance_budgets!];
        updated[existingIndex] = savedBudget;
        return { ...data, finance_budgets: updated };
      }

      savedBudget = {
        id: newId(),
        category: category.trim(),
        monthly_limit: Math.round(monthlyLimit * 100) / 100,
        created_at: timestamp,
        updated_at: timestamp,
      };
      return {
        ...data,
        finance_budgets: [...(data.finance_budgets || []), savedBudget],
      };
    });

    return savedBudget!;
  },

  async deleteBudget(id: string): Promise<void> {
    await updateVaultData((data) => ({
      ...data,
      finance_budgets: (data.finance_budgets || []).filter((b) => b.id !== id),
    }));
  },

  async listAssets(): Promise<LocalInvestmentAsset[]> {
    const data = await readVaultData();
    return data.investment_assets || [];
  },

  async createAsset(input: CreateAssetInput): Promise<LocalInvestmentAsset> {
    const timestamp = nowIso();
    const newAsset: LocalInvestmentAsset = {
      id: newId(),
      name: input.name.trim(),
      symbol: input.symbol?.trim().toUpperCase() || "",
      asset_class: input.asset_class,
      units: input.units,
      buy_price: input.buy_price,
      current_price: input.current_price,
      target_allocation_pct: input.target_allocation_pct || 0,
      notes: input.notes?.trim() || null,
      updated_at: timestamp,
    };

    await updateVaultData((data) => ({
      ...data,
      investment_assets: [...(data.investment_assets || []), newAsset],
    }));

    return newAsset;
  },

  async updateAsset(id: string, updates: Partial<CreateAssetInput>): Promise<LocalInvestmentAsset> {
    let updatedAsset: LocalInvestmentAsset | null = null;
    const timestamp = nowIso();

    await updateVaultData((data) => {
      const assets = (data.investment_assets || []).map((a) => {
        if (a.id === id) {
          updatedAsset = {
            ...a,
            ...updates,
            updated_at: timestamp,
          };
          return updatedAsset;
        }
        return a;
      });

      return {
        ...data,
        investment_assets: assets,
      };
    });

    if (!updatedAsset) throw new Error("Asset not found");
    return updatedAsset;
  },

  async deleteAsset(id: string): Promise<void> {
    await updateVaultData((data) => ({
      ...data,
      investment_assets: (data.investment_assets || []).filter((a) => a.id !== id),
    }));
  },

  async getSummary(monthStr?: string): Promise<FinanceSummary> {
    const data = await readVaultData();
    const targetMonth = monthStr || new Date().toISOString().slice(0, 7); // YYYY-MM

    const txs = (data.finance_transactions || []).filter((t) => t.date.startsWith(targetMonth));

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of txs) {
      if (t.type === "income") totalIncome += t.amount;
      else if (t.type === "expense") totalExpenses += t.amount;
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

    let totalPortfolioValue = 0;
    let totalInvested = 0;

    for (const a of data.investment_assets || []) {
      totalPortfolioValue += a.units * a.current_price;
      totalInvested += a.units * a.buy_price;
    }

    const totalGainLoss = totalPortfolioValue - totalInvested;
    const gainLossPct = totalInvested > 0 ? Math.round((totalGainLoss / totalInvested) * 1000) / 10 : 0;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netSavings: Math.round(netSavings * 100) / 100,
      savingsRate,
      totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalGainLoss: Math.round(totalGainLoss * 100) / 100,
      gainLossPct,
    };
  },

  async exportTransactionsCsv(): Promise<string> {
    const txs = await this.listTransactions();
    const headers = ["id", "date", "type", "category", "amount", "description"];
    const rows = txs.map((t) =>
      [
        t.id,
        t.date,
        t.type,
        `"${t.category.replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
        `"${(t.description || "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  },

  async importTransactionsCsv(csvContent: string): Promise<number> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return 0;

    let importedCount = 0;
    const timestamp = nowIso();
    const newItems: LocalFinanceTransaction[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV splitter
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 5) continue;

      const date = cols[1];
      const type = cols[2] === "income" ? "income" : "expense";
      const category = cols[3] || "General";
      const amount = parseFloat(cols[4]);
      const description = cols[5] || null;

      if (!isNaN(amount) && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        newItems.push({
          id: cols[0] && cols[0].length > 5 ? cols[0] : newId(),
          date,
          type,
          category,
          amount: Math.abs(amount),
          description,
          created_at: timestamp,
        });
        importedCount++;
      }
    }

    if (newItems.length > 0) {
      await updateVaultData((data) => {
        const existingMap = new Map((data.finance_transactions || []).map((t) => [t.id, t]));
        for (const item of newItems) {
          existingMap.set(item.id, item);
        }
        return {
          ...data,
          finance_transactions: Array.from(existingMap.values()),
        };
      });
    }

    return importedCount;
  },
};
