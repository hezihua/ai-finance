"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Send,
  Wrench,
} from "lucide-react";

import StockSearchBox from "@/components/StockSearchBox";
import { useFinance } from "@/context/FinanceContext";
import type { ChatMessage, ToolCall } from "@/types";

const IDEAS = [
  "帮我看看同花顺最近一年走势和回撤",
  "今天涨停池最高连板有哪些？",
  "热股榜前十和飙升榜有什么重合？",
  "打开涨停池看板，并总结连板结构",
];

export default function ChatPanel() {
  const {
    currentSessionId,
    messages,
    sendMessage,
    isGenerating,
    thscode,
    stockName,
    openModule,
  } = useFinance();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const noSession = currentSessionId == null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    const content = input;
    setInput("");
    await sendMessage(content);
  };

  const showWelcome = !noSession && messages.length === 0 && !isGenerating;

  return (
    <div className="flex h-full flex-col bg-[#1a1614] text-[#e8e4e0]">
      <div ref={scrollRef} className="dark-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {noSession && !isGenerating && (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xl text-black shadow-lg">
              ✦
            </div>
            <h2 className="mb-1 text-base font-semibold text-white">你好，我是 ai-finance</h2>
            <p className="mb-6 max-w-xs text-xs leading-relaxed text-white/50">
              用自然语言查询同花顺行情、涨停池与市场热度，并可在右侧打开对应看板。
            </p>
            <div className="w-full space-y-2">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  onClick={() => setInput(idea)}
                  className="w-full rounded-lg border border-white/5 bg-[#231f1b] px-3 py-2.5 text-left text-sm text-white/70 transition hover:border-white/10 hover:bg-[#2a2520]"
                >
                  <span className="mr-2 text-emerald-500/70">›</span>
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        {showWelcome && (
          <div className="py-8 text-center text-sm text-white/45">
            会话已创建，继续提问即可。当前标的：{stockName}（{thscode}）
          </div>
        )}

        {!noSession &&
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}

        {isGenerating && messages.every((m) => m.role !== "assistant" || !m.toolCalls?.some((t) => t.status === "running")) && (
          <div className="animate-slide-up rounded-xl border border-white/5 bg-[#231f1b] p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span className="text-sm text-white/80">分析中…</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 px-4 py-3">
        <div className="mb-2">
          <StockSearchBox placeholder="搜索股票并打开看板…" />
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openModule("stock-overview", thscode)}
            className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/45 hover:text-white/70"
          >
            个股看板
          </button>
          <button
            type="button"
            onClick={() => openModule("limit-up-market")}
            className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/45 hover:text-white/70"
          >
            涨停池
          </button>
          <button
            type="button"
            onClick={() => openModule("market-heat")}
            className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/45 hover:text-white/70"
          >
            市场热度
          </button>
        </div>
        <div className="flex items-end gap-2 rounded-xl bg-[#2a2520] p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              isGenerating
                ? "正在分析中…"
                : noSession
                  ? "输入问题开始新会话…"
                  : "例如：贵州茅台近一年收益和回撤如何？"
            }
            rows={1}
            disabled={isGenerating}
            className="max-h-[160px] min-h-[32px] flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-50"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isGenerating}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-white/30">
          <Wrench className="h-3 w-3" />
          <span>{isGenerating ? "查询同花顺数据中…" : "OpenRouter · 同花顺数据"}</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-[10px] font-semibold">
            我
          </div>
          <div className="flex-1 rounded-xl bg-[#2a2520] px-4 py-3">
            <p className="text-sm leading-relaxed text-white/90">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[10px] font-semibold text-black">
          AI
        </div>
        <div className="flex-1 space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
            {message.content}
          </p>
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="space-y-2">
              {message.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const icon =
    toolCall.status === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : toolCall.status === "running" ? (
      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );

  return (
    <div className="overflow-hidden rounded-lg border border-white/5 bg-[#231f1b]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 transition hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-sm text-emerald-200/80">{toolCall.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {icon}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/40" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/40" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/5 px-3 pb-3 pt-2">
          {toolCall.params && (
            <>
              <div className="mb-1.5 text-xs text-white/40">参数</div>
              <pre className="overflow-x-auto rounded bg-[#1a1614] p-2 font-mono text-xs text-white/60">
                {JSON.stringify(toolCall.params, null, 2)}
              </pre>
            </>
          )}
          {toolCall.result != null && (
            <>
              <div className="mb-1.5 mt-2 text-xs text-white/40">结果摘要</div>
              <pre className="max-h-40 overflow-auto rounded bg-[#1a1614] p-2 font-mono text-xs text-white/60">
                {JSON.stringify(toolCall.result, null, 2).slice(0, 1200)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
