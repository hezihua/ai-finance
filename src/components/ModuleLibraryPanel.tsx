"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Flame, Search } from "lucide-react";

import { useFinance } from "@/context/FinanceContext";
import { FINANCE_MODULES, getTagCounts } from "@/lib/modules";

export default function ModuleLibraryPanel() {
  const { openModule } = useFinance();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tagCounts = useMemo(() => getTagCounts(FINANCE_MODULES), []);

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FINANCE_MODULES.filter((mod) => {
      const matchesQuery =
        !q ||
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesTag = !activeTag || mod.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [query, activeTag]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1a1614] text-[#e8e4e0]">
      <div className="flex-shrink-0 border-b border-white/5 px-8 pb-5 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">金融看板库</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/45">
          基于同花顺 Financial-API 的真实数据能力，选择看板后在右侧实时渲染。
        </p>

        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索看板或标签..."
            className="w-full rounded-xl border border-white/5 bg-[#231f1b] py-3 pl-11 pr-4 text-sm text-white/90 transition placeholder:text-white/30 focus:border-emerald-500/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tagCounts.map(({ tag, count }) => {
            const selected = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(selected ? null : tag)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition ${
                  selected
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    : "border-white/5 bg-[#231f1b] text-white/50 hover:border-white/10 hover:text-white/70"
                }`}
              >
                <span className="text-white/30">#</span>
                {tag}
                <span className="ml-0.5 text-white/25">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dark-scrollbar flex-1 overflow-y-auto px-8 py-6">
        {filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <p className="text-sm">没有找到匹配的看板</p>
            <button
              onClick={() => {
                setQuery("");
                setActiveTag(null);
              }}
              className="mt-3 text-xs text-emerald-500/80 transition hover:text-emerald-400"
            >
              清除筛选
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map((mod) => (
              <article
                key={mod.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#231f1b] transition hover:border-white/10"
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Flame className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{mod.title}</h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-white/45">
                    {mod.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mod.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/40"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => openModule(mod.id, mod.defaultThscode)}
                    className="mt-4 inline-flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-400 transition group-hover:bg-emerald-500/15"
                  >
                    打开看板
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
