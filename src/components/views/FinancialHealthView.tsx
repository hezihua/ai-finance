"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import StockSearchBox from "@/components/StockSearchBox";
import { formatDateMs, formatMoney, formatPrice } from "@/lib/format";
import { useFinance } from "@/context/FinanceContext";

type IncomeRow = {
  period_end_ms: number;
  fiscal_year?: number;
  fiscal_period?: string;
  operating_income?: number | null;
  operating_profit?: number | null;
  net_profit?: number | null;
  parent_holder_net_profit?: number | null;
  basic_eps?: number | null;
};

type BalanceRow = {
  period_end_ms: number;
  assets_total?: number | null;
  total_debt?: number | null;
  holder_equity_total?: number | null;
  cash?: number | null;
  accounts_receivable?: number | null;
};

type CashRow = {
  period_end_ms: number;
  act_cash_flow_net?: number | null;
  invest_cash_flow_net?: number | null;
  financing_cash_flow_net?: number | null;
  pay_fixed_assets_etc_cash?: number | null;
};

export default function FinancialHealthView({ thscode }: { thscode: string }) {
  const { stockName } = useFinance();
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [balance, setBalance] = useState<BalanceRow[]>([]);
  const [cashflow, setCashflow] = useState<CashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const q = `thscode=${encodeURIComponent(thscode)}&period=quarterly&limit=8`;
        const [iRes, bRes, cRes] = await Promise.all([
          fetch(`/api/financials?table=income&${q}`),
          fetch(`/api/financials?table=balance&${q}`),
          fetch(`/api/financials?table=cashflow&${q}`),
        ]);
        const [iData, bData, cData] = await Promise.all([iRes.json(), bRes.json(), cRes.json()]);
        if (!iRes.ok) throw new Error(iData.error ?? "利润表失败");
        if (!bRes.ok) throw new Error(bData.error ?? "资产负债表失败");
        if (!cRes.ok) throw new Error(cData.error ?? "现金流量表失败");
        if (!cancelled) {
          setIncome(iData.item ?? []);
          setBalance(bData.item ?? []);
          setCashflow(cData.item ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [thscode]);

  const latest = income[0];
  const prev = income[1];
  const latestBal = balance[0];
  const latestCash = cashflow[0];

  const yoyIncome = useMemo(() => {
    if (!latest?.operating_income || !prev?.operating_income) return null;
    return ((latest.operating_income - prev.operating_income) / Math.abs(prev.operating_income)) * 100;
  }, [latest, prev]);

  const cashConversion = useMemo(() => {
    if (!latestCash?.act_cash_flow_net || !latest?.net_profit) return null;
    if (!latest.net_profit) return null;
    return latestCash.act_cash_flow_net / latest.net_profit;
  }, [latest, latestCash]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载财务报表…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white/90">
            {stockName} · 财务体检
          </h2>
          <p className="mt-1 text-xs text-white/40">
            {thscode} · 最近 8 期季度报 · null 表示未披露
          </p>
        </div>
        <StockSearchBox className="w-full max-w-sm" placeholder="切换体检标的…" targetModule="financial-health" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="最新营收" value={formatMoney(latest?.operating_income)} />
        <Metric label="最新净利润" value={formatMoney(latest?.net_profit)} />
        <Metric
          label="营收环比"
          value={yoyIncome == null ? "—" : `${yoyIncome >= 0 ? "+" : ""}${yoyIncome.toFixed(2)}%`}
        />
        <Metric
          label="现金转化"
          value={cashConversion == null ? "—" : cashConversion.toFixed(2)}
          note="经营现金流 / 净利润"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Metric label="总资产" value={formatMoney(latestBal?.assets_total)} />
        <Metric label="总负债" value={formatMoney(latestBal?.total_debt)} />
        <Metric label="经营现金流净额" value={formatMoney(latestCash?.act_cash_flow_net)} />
      </div>

      <Panel title="利润表序列">
        <Table
          headers={["报告期", "营收", "营业利润", "净利润", "归母净利", "EPS"]}
          rows={income.map((r) => [
            formatDateMs(r.period_end_ms),
            formatMoney(r.operating_income),
            formatMoney(r.operating_profit),
            formatMoney(r.net_profit),
            formatMoney(r.parent_holder_net_profit),
            formatPrice(r.basic_eps),
          ])}
        />
      </Panel>

      <Panel title="资产负债表序列">
        <Table
          headers={["报告期", "总资产", "总负债", "所有者权益", "货币资金", "应收账款"]}
          rows={balance.map((r) => [
            formatDateMs(r.period_end_ms),
            formatMoney(r.assets_total),
            formatMoney(r.total_debt),
            formatMoney(r.holder_equity_total),
            formatMoney(r.cash),
            formatMoney(r.accounts_receivable),
          ])}
        />
      </Panel>

      <Panel title="现金流量表序列">
        <Table
          headers={["报告期", "经营现金流", "投资现金流", "筹资现金流", "购建固定资产"]}
          rows={cashflow.map((r) => [
            formatDateMs(r.period_end_ms),
            formatMoney(r.act_cash_flow_net),
            formatMoney(r.invest_cash_flow_net),
            formatMoney(r.financing_cash_flow_net),
            formatMoney(r.pay_fixed_assets_etc_cash),
          ])}
        />
      </Panel>

      <p className="text-xs text-white/30">财务数据来自同花顺披露口径 · 不构成投资建议</p>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-white/90">{value}</p>
      {note && <p className="mt-1 text-[11px] text-white/30">{note}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#12161d] p-4">
      <h3 className="mb-4 text-sm font-semibold text-white/90">{title}</h3>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs text-white/35">
            {headers.map((h) => (
              <th key={h} className="pb-2 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 pr-3 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
