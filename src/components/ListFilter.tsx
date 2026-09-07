"use client";

import { Search } from "lucide-react";

export default function ListFilter({
  value,
  onChange,
  placeholder = "筛选名称或代码…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1f28] px-3 py-2">
      <Search className="h-4 w-4 text-white/35" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/30"
      />
    </div>
  );
}
