import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Download,
  Upload,
  Home,
  PieChart as PieIcon,
  Tag,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocalModeBadge } from "@/components/LocalModeBadge";
import { LocalVaultLockButton } from "@/components/LocalVaultLockButton";
import { useToast } from "@/hooks/use-toast";
import {
  getFinanceStore,
  type FinanceSummary,
} from "@/lib/data/financeStore";
import type { LocalFinanceTransaction, LocalFinanceBudget, LocalInvestmentAsset } from "@/lib/local/schema";

const DEFAULT_CATEGORIES = [
  "Housing",
  "Food & Groceries",
  "Transport",
  "Health & Fitness",
  "Utilities",
  "Tech & Software",
  "Entertainment",
  "Education",
  "Salary",
  "Freelance",
  "Investments",
  "Other",
];

export const LocalFinance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transactions, setTransactions] = useState<LocalFinanceTransaction[]>([]);
  const [budgets, setBudgets] = useState<LocalFinanceBudget[]>([]);
  const [assets, setAssets] = useState<LocalInvestmentAsset[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    totalPortfolioValue: 0,
    totalInvested: 0,
    totalGainLoss: 0,
    gainLossPct: 0,
  });

  const [loading, setLoading] = useState(true);

  // New Transaction Dialog state
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txCategory, setTxCategory] = useState("Food & Groceries");
  const [txDesc, setTxDesc] = useState("");

  // New Budget Dialog state
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState("Food & Groceries");
  const [budgetLimit, setBudgetLimit] = useState("");

  // New Asset Dialog state
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetSymbol, setAssetSymbol] = useState("");
  const [assetClass, setAssetClass] = useState<any>("stocks");
  const [assetUnits, setAssetUnits] = useState("");
  const [assetBuyPrice, setAssetBuyPrice] = useState("");
  const [assetCurrentPrice, setAssetCurrentPrice] = useState("");

  const loadData = async () => {
    try {
      const store = await getFinanceStore();
      const [txList, budgetList, assetList, summaryData] = await Promise.all([
        store.listTransactions(),
        store.listBudgets(),
        store.listAssets(),
        store.getSummary(),
      ]);

      setTransactions(txList);
      setBudgets(budgetList);
      setAssets(assetList);
      setSummary(summaryData);
    } catch {
      toast({ description: "Could not load finance data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTransaction = async () => {
    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ description: "Enter a valid positive amount", variant: "destructive" });
      return;
    }

    try {
      const store = await getFinanceStore();
      await store.createTransaction({
        date: txDate,
        amount: amountNum,
        type: txType,
        category: txCategory,
        description: txDesc,
      });

      setTxDialogOpen(false);
      setTxAmount("");
      setTxDesc("");
      await loadData();
      toast({ title: "Transaction recorded" });
    } catch {
      toast({ description: "Failed to add transaction", variant: "destructive" });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const store = await getFinanceStore();
      await store.deleteTransaction(id);
      await loadData();
      toast({ title: "Transaction deleted" });
    } catch {
      toast({ description: "Failed to delete transaction", variant: "destructive" });
    }
  };

  const handleSetBudget = async () => {
    const limitNum = parseFloat(budgetLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      toast({ description: "Enter a valid monthly limit", variant: "destructive" });
      return;
    }

    try {
      const store = await getFinanceStore();
      await store.setBudget(budgetCategory, limitNum);
      setBudgetDialogOpen(false);
      setBudgetLimit("");
      await loadData();
      toast({ title: "Budget limit saved" });
    } catch {
      toast({ description: "Failed to save budget", variant: "destructive" });
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const store = await getFinanceStore();
      await store.deleteBudget(id);
      await loadData();
      toast({ title: "Budget deleted" });
    } catch {
      toast({ description: "Failed to delete budget", variant: "destructive" });
    }
  };

  const handleAddAsset = async () => {
    const unitsNum = parseFloat(assetUnits);
    const buyNum = parseFloat(assetBuyPrice);
    const currNum = parseFloat(assetCurrentPrice);

    if (!assetName.trim() || isNaN(unitsNum) || isNaN(buyNum) || isNaN(currNum)) {
      toast({ description: "Please fill all required asset numbers", variant: "destructive" });
      return;
    }

    try {
      const store = await getFinanceStore();
      await store.createAsset({
        name: assetName.trim(),
        symbol: assetSymbol.trim(),
        asset_class: assetClass,
        units: unitsNum,
        buy_price: buyNum,
        current_price: currNum,
      });

      setAssetDialogOpen(false);
      setAssetName("");
      setAssetSymbol("");
      setAssetUnits("");
      setAssetBuyPrice("");
      setAssetCurrentPrice("");
      await loadData();
      toast({ title: "Asset added to portfolio" });
    } catch {
      toast({ description: "Failed to add asset", variant: "destructive" });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const store = await getFinanceStore();
      await store.deleteAsset(id);
      await loadData();
      toast({ title: "Asset removed" });
    } catch {
      toast({ description: "Failed to remove asset", variant: "destructive" });
    }
  };

  const handleExportCsv = async () => {
    const store = await getFinanceStore();
    const csv = await store.exportTransactionsCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habitflow-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Transactions exported as CSV" });
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const store = await getFinanceStore();
      const count = await store.importTransactionsCsv(text);
      await loadData();
      toast({ title: "CSV imported", description: `${count} transactions imported successfully.` });
    } catch {
      toast({ description: "Failed to import CSV", variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Compute category spending for the current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonth));
  const categorySpending = new Map<string, number>();
  for (const t of currentMonthTxs) {
    if (t.type === "expense") {
      categorySpending.set(t.category, (categorySpending.get(t.category) || 0) + t.amount);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="LifeOS Home">
              <Home className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              <h1 className="font-semibold text-lg">Expense &amp; Investment Trackers</h1>
            </div>
            <LocalModeBadge />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setTxDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Transaction
            </Button>
            <LocalVaultLockButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Top Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Monthly Income</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${summary.totalIncome.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">This month</CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Monthly Expenses</span>
                <ArrowDownRight className="h-4 w-4 text-rose-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                ${summary.totalExpenses.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">This month</CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Net Savings</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                ${summary.netSavings.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Savings rate: {summary.savingsRate}%
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Portfolio Value</span>
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                ${summary.totalPortfolioValue.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              Gain: {summary.totalGainLoss >= 0 ? "+" : ""}${summary.totalGainLoss.toFixed(2)} ({summary.gainLossPct}%)
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="expenses">Expenses &amp; Income</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="sync">CSV Import / Export</TabsTrigger>
          </TabsList>

          {/* Tab 1: Expenses & Budgets */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Budgets Column */}
              <div className="space-y-4 md:col-span-1">
                <Card>
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold">Monthly Budgets</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setBudgetDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Limit
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {budgets.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No category budgets set. Click "Add Limit" to manage spending.
                      </p>
                    ) : (
                      budgets.map((b) => {
                        const spent = categorySpending.get(b.category) || 0;
                        const pct = Math.min(100, Math.round((spent / b.monthly_limit) * 100));
                        const isOver = spent > b.monthly_limit;
                        return (
                          <div key={b.id} className="space-y-1 text-xs">
                            <div className="flex justify-between font-medium">
                              <span>{b.category}</span>
                              <span className={isOver ? "text-destructive font-bold" : ""}>
                                ${spent.toFixed(0)} / ${b.monthly_limit.toFixed(0)}
                              </span>
                            </div>
                            <Progress value={pct} className={`h-1.5 ${isOver ? "[&>div]:bg-destructive" : ""}`} />
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table Column */}
              <div className="space-y-4 md:col-span-2">
                <Card>
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
                    <span className="text-xs text-muted-foreground">{transactions.length} entries</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {transactions.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center">
                        No transactions recorded yet. Click "Add Transaction" to log income or expenses.
                      </p>
                    ) : (
                      <div className="divide-y max-h-[480px] overflow-y-auto">
                        {transactions.map((t) => (
                          <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <div className="font-medium flex items-center gap-2">
                                <span>{t.category}</span>
                                {t.description && (
                                  <span className="text-muted-foreground font-normal">({t.description})</span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{t.date}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`font-semibold ${
                                  t.type === "income"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteTransaction(t.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Investments Portfolio */}
          <TabsContent value="investments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Investment Portfolio</CardTitle>
                  <CardDescription>Track stocks, crypto, ETFs, and real estate assets offline.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setAssetDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Asset
                </Button>
              </CardHeader>
              <CardContent>
                {assets.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No investment assets tracked. Add your holdings to calculate total net worth.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b text-muted-foreground uppercase text-[10px]">
                        <tr>
                          <th className="py-2">Asset</th>
                          <th>Class</th>
                          <th>Units</th>
                          <th>Buy Price</th>
                          <th>Current Price</th>
                          <th>Total Value</th>
                          <th>Gain / Loss</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {assets.map((a) => {
                          const totalVal = a.units * a.current_price;
                          const totalCost = a.units * a.buy_price;
                          const gainLoss = totalVal - totalCost;
                          const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
                          return (
                            <tr key={a.id} className="py-2 hover:bg-muted/30">
                              <td className="py-2.5 font-medium">
                                {a.name} {a.symbol && <span className="text-muted-foreground">({a.symbol})</span>}
                              </td>
                              <td className="uppercase text-[10px] text-muted-foreground">{a.asset_class}</td>
                              <td>{a.units}</td>
                              <td>${a.buy_price.toFixed(2)}</td>
                              <td>${a.current_price.toFixed(2)}</td>
                              <td className="font-semibold">${totalVal.toFixed(2)}</td>
                              <td className={gainLoss >= 0 ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
                                {gainLoss >= 0 ? "+" : ""}${gainLoss.toFixed(2)} ({gainLossPct.toFixed(1)}%)
                              </td>
                              <td>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteAsset(a.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: CSV Import & Export */}
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Finance Import &amp; Export</CardTitle>
                <CardDescription>
                  Export transactions to spreadsheet-compatible CSV or import past financial history into your encrypted vault.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button onClick={handleExportCsv}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportCsv}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Transactions CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Record an expense or income entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={txType} onValueChange={(v: any) => setTxType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={txCategory} onValueChange={setTxCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g. Weekly supermarket run"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTransaction}>Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Budget Limit Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Monthly Budget Limit</DialogTitle>
            <DialogDescription>Set a target spending cap for a category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={budgetCategory} onValueChange={setBudgetCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monthly Limit ($)</Label>
              <Input
                type="number"
                placeholder="500"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetBudget}>Save Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Investment Asset</DialogTitle>
            <DialogDescription>Record a holding in your local portfolio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Asset Name</Label>
                <Input placeholder="e.g. Apple Inc or S&P 500 ETF" value={assetName} onChange={(e) => setAssetName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Ticker / Symbol</Label>
                <Input placeholder="AAPL / VOO / BTC" value={assetSymbol} onChange={(e) => setAssetSymbol(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Asset Class</Label>
              <Select value={assetClass} onValueChange={setAssetClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="etf">Index Funds / ETF</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="metals">Precious Metals / Gold</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="cash">Cash &amp; Equivalents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Units / Quantity</Label>
                <Input type="number" step="any" placeholder="10" value={assetUnits} onChange={(e) => setAssetUnits(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Buy Price ($)</Label>
                <Input type="number" step="any" placeholder="150" value={assetBuyPrice} onChange={(e) => setAssetBuyPrice(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Current Price ($)</Label>
                <Input type="number" step="any" placeholder="185" value={assetCurrentPrice} onChange={(e) => setAssetCurrentPrice(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAsset}>Add to Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalFinance;
