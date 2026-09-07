"use client";

import { FinanceProvider, useFinance } from "@/context/FinanceContext";
import ChatPanel from "@/components/ChatPanel";
import FinancePreviewPanel from "@/components/FinancePreviewPanel";
import ModuleLibraryPanel from "@/components/ModuleLibraryPanel";
import SidebarPanel from "@/components/SidebarPanel";

function MainContent() {
  const { activeView, activeModuleId } = useFinance();

  if (activeView === "modules") {
    return (
      <main className="h-full min-w-0 flex-1">
        <ModuleLibraryPanel />
      </main>
    );
  }

  // chat / viewer：左侧对话，右侧预览（对齐 ai-app）
  return (
    <>
      <aside className="h-full w-[420px] flex-shrink-0 border-r border-white/5">
        <ChatPanel />
      </aside>
      <main className="h-full min-w-0 flex-1">
        {activeModuleId ? (
          <FinancePreviewPanel />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[#0f1218] px-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
              同
            </div>
            <h2 className="text-lg font-semibold text-white/90">对话 + 看板预览</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">
              在左侧提问，例如「同花顺近一年走势」。模型取数后可自动在右侧打开对应看板。
            </p>
          </div>
        )}
      </main>
    </>
  );
}

export default function Home() {
  return (
    <FinanceProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <aside className="h-full w-[220px] flex-shrink-0">
          <SidebarPanel />
        </aside>
        <MainContent />
      </div>
    </FinanceProvider>
  );
}
