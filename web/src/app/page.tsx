"use client";

import { FinanceProvider, useFinance } from "@/context/FinanceContext";
import ChatPanel from "@/components/ChatPanel";
import FinancePreviewPanel from "@/components/FinancePreviewPanel";
import ModuleLibraryPanel from "@/components/ModuleLibraryPanel";
import SidebarPanel from "@/components/SidebarPanel";
import TitleBar from "@/components/TitleBar";

function MainContent() {
  const { activeView, activeModuleId } = useFinance();

  if (activeView === "modules") {
    return (
      <main className="h-full min-w-0 flex-1">
        <ModuleLibraryPanel />
      </main>
    );
  }

  return (
    <>
      <aside className="h-full w-[420px] flex-shrink-0 border-r border-white/[0.07]">
        <ChatPanel />
      </aside>
      <main className="h-full min-w-0 flex-1">
        {activeModuleId ? (
          <FinancePreviewPanel />
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center px-8 text-center"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(79, 140, 255, 0.12), transparent 55%), #10141a",
            }}
          >
            <div className="brand-mark mb-4 flex h-14 w-14 items-center justify-center text-xl font-semibold text-[#0b1220]">
              同
            </div>
            <h2 className="text-lg font-semibold text-white/90">对话 + 看板预览</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">
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
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#10141a]">
        <TitleBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="h-full w-[220px] flex-shrink-0">
            <SidebarPanel />
          </aside>
          <MainContent />
        </div>
      </div>
    </FinanceProvider>
  );
}
