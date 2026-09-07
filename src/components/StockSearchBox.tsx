"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { useFinance } from "@/context/FinanceContext";
import type { TickerItem } from "@/lib/hithink-finance";
import type { FinanceModuleId } from "@/types";

type Props = {
  className?: string;
  placeholder?: string;
  targetModule?: FinanceModuleId;
};

export default function StockSearchBox({
  className = "",
  placeholder = "搜索股票名称或代码…",
  targetModule = "stock-overview",
}: Props) {
  const { openModule, setThscode } = useFinance();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "搜索失败");
        setResults(data.item ?? []);
        setError(null);
        setOpen(true);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "搜索失败");
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function selectTicker(item: TickerItem) {
    setThscode(item.thscode, item.name);
    openModule(targetModule, item.thscode);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1f28] px-3 py-2 focus-within:border-emerald-500/40">
        {loading ? (
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-white/40" />
        ) : (
          <Search className="h-4 w-4 flex-shrink-0 text-white/40" />
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length || error) setOpen(true);
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="text-white/30 hover:text-white/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-white/10 bg-[#1a1f28] shadow-2xl">
          {error ? (
            <p className="px-3 py-3 text-xs text-rose-400">{error}</p>
          ) : (
            <ul>
              {results.map((item) => (
                <li key={item.thscode}>
                  <button
                    type="button"
                    onClick={() => selectTicker(item)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/5"
                  >
                    <span>
                      <span className="font-medium text-white/90">{item.name}</span>
                      <span className="ml-2 font-mono text-xs text-white/40">{item.thscode}</span>
                    </span>
                    <span className="text-[11px] text-white/30">{item.exchange}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
