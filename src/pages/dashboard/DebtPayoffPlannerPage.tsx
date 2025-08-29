import React, { useMemo, useState } from "react";
import WebsiteLayout from "../../components/layout/WebsiteLayout";
import DashboardHeader from "../../components/ui/DashboardHeader";

type Strategy = "avalanche" | "snowball" | "ai_optimized";

type Debt = {
  id: string;
  name: string;
  balance: number; // current balance
  rate: number;    // APR %
  min: number;     // minimum payment
};

const initialDebts: Debt[] = [
  { id: "cc1", name: "Credit Card", balance: 3200, rate: 22.99, min: 85 },
  { id: "loan1", name: "Car Loan", balance: 7800, rate: 6.49, min: 240 },
  { id: "loc1", name: "Line of Credit", balance: 5400, rate: 9.99, min: 110 },
];

function sortDebts(strategy: Strategy, debts: Debt[]): Debt[] {
  const arr = [...debts];
  if (strategy === "avalanche") {
    arr.sort((a, b) => b.rate - a.rate); // highest interest first
  } else if (strategy === "snowball") {
    arr.sort((a, b) => a.balance - b.balance); // smallest balance first
  } else {
    // "ai_optimized" (placeholder): interest-weighted balance
    arr.sort((a, b) => (b.balance * b.rate) - (a.balance * a.rate));
  }
  return arr;
}

export default function DebtPayoffPlannerPage() {
  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [extra, setExtra] = useState<number>(0); // extra monthly payment

  // Ensure page starts at the top
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const ordered = useMemo(() => sortDebts(strategy, debts), [strategy, debts]);

  const totalMin = useMemo(
    () => debts.reduce((sum, d) => sum + d.min, 0),
    [debts]
  );

  const totalBalance = useMemo(
    () => debts.reduce((sum, d) => sum + d.balance, 0),
    [debts]
  );

  return (
    <div className="w-full">
      {/* Standardized Dashboard Header */}
      <DashboardHeader />
      
      {/* Content Area with Enhanced Styling */}
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="text-sm opacity-80">
            Total Balance: <span className="font-semibold">${totalBalance.toLocaleString()}</span>
          </div>
        </header>

        {/* Controls */}
        <div className="space-y-6">
          <section className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl border border-white/20 p-4">
              <div className="text-sm mb-2 opacity-80">Payoff strategy</div>
              <div className="flex gap-2 flex-wrap">
                {(["avalanche", "snowball", "ai_optimized"] as Strategy[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStrategy(s)}
                    className={`px-3 py-2 rounded-lg border ${
                      strategy === s ? "bg-white text-black" : "bg-white/5 text-white border-white/20"
                    }`}
                  >
                    {s === "avalanche" ? "Avalanche" : s === "snowball" ? "Snowball" : "AI Optimized"}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/10 rounded-xl border border-white/20 p-4">
              <label className="block text-sm mb-2 opacity-80" htmlFor="extra">
                Extra monthly amount
              </label>
              <input
                id="extra"
                type="number"
                value={Number.isNaN(extra) ? "" : extra}
                onChange={(e) => setExtra(Number(e.target.value || 0))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g., 200"
              />
              <p className="text-xs opacity-70 mt-2">
                Current minimums: <span className="font-semibold">${totalMin.toLocaleString()}</span>
              </p>
            </div>

            <div className="bg-white/10 rounded-xl border border-white/20 p-4">
              <div className="text-sm mb-2 opacity-80">Plan summary</div>
              <ul className="text-sm space-y-1 opacity-90">
                <li>Debts: <span className="font-semibold">{debts.length}</span></li>
                <li>Total min: <span className="font-semibold">${totalMin.toLocaleString()}</span></li>
                <li>Extra: <span className="font-semibold">${extra.toLocaleString()}</span></li>
              </ul>
            </div>
          </section>

          {/* Table */}
          <section className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold">Payment Order</h2>
              <span className="text-xs opacity-70">
                Strategy: {strategy === "ai_optimized" ? "AI Optimized" : strategy[0].toUpperCase() + strategy.slice(1)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Debt</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">APR</th>
                    <th className="px-4 py-3 font-medium">Min Payment</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((d, idx) => (
                    <tr key={d.id} className="border-t border-white/10">
                      <td className="px-4 py-3">{d.name}</td>
                      <td className="px-4 py-3">${d.balance.toLocaleString()}</td>
                      <td className="px-4 py-3">{d.rate.toFixed(2)}%</td>
                      <td className="px-4 py-3">${d.min.toLocaleString()}</td>
                      <td className="px-4 py-3">{idx + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* (Optional) Actions */}
          <section className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold"
              onClick={() => alert("Coming soon: detailed payoff schedule")}
            >
              Generate Schedule
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              onClick={() => setDebts(initialDebts)}
            >
              Reset
            </button>
          </section>
        </div>
      </div>
    </div>
  );
} 