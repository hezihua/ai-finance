import { NextRequest, NextResponse } from "next/server";

import {
  CHAT_SYSTEM_PROMPT,
  CHAT_TOOLS,
  runFinanceTool,
} from "@/lib/chat-tools";
import type { ChatAction, FinanceModuleId } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRole = "system" | "user" | "assistant" | "tool";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenRouterMessage = {
  role: ChatRole;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

type ToolTrace = {
  id: string;
  name: string;
  status: "success" | "error";
  params?: Record<string, unknown>;
  result?: unknown;
};

function resolveModelCandidates() {
  const primary = (process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324").trim();
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const defaults = [
    "deepseek/deepseek-chat-v3-0324",
    "qwen/qwen-2.5-72b-instruct",
    "meta-llama/llama-3.3-70b-instruct",
  ];
  return [...new Set([primary, ...fallbacks, ...defaults])];
}

function parseOpenRouterError(errText: string): { message?: string; code?: number } {
  try {
    const parsed = JSON.parse(errText) as {
      error?: { message?: string; code?: number };
    };
    return {
      message: parsed.error?.message,
      code: parsed.error?.code,
    };
  } catch {
    return {};
  }
}

function isRetryableModelError(status: number, errText: string) {
  if (status === 429 || status === 502 || status === 503) return true;
  if (status === 404) return true;
  if (status === 403) {
    const msg = (parseOpenRouterError(errText).message || errText).toLowerCase();
    return (
      msg.includes("not available in your region") ||
      msg.includes("geo") ||
      msg.includes("region") ||
      msg.includes("provider")
    );
  }
  return false;
}

function friendlyOpenRouterError(status: number, errText: string, model: string) {
  const parsed = parseOpenRouterError(errText);
  const detail = parsed.message || errText.replace(/\s+/g, " ").slice(0, 240);

  if (status === 429) {
    return `模型 ${model} 暂时限流（429）。可稍后重试，或改 OPENROUTER_MODEL / OPENROUTER_FALLBACK_MODELS 后重启 pnpm dev。`;
  }
  if (status === 403 && detail.toLowerCase().includes("not available in your region")) {
    return `模型 ${model} 在当前地区不可用（403）。请换 OPENROUTER_MODEL（例如 deepseek/deepseek-chat-v3-0324）并重启。`;
  }
  if (status === 401) {
    return `OpenRouter 鉴权失败（401）。请检查 OPENROUTER_API_KEY。`;
  }
  if (status === 403) {
    return `OpenRouter 拒绝访问（403 · ${model}）${detail ? `：${detail}` : "。可能是地区限制或模型权限，不一定是 Key 无效。"}`;
  }
  return `OpenRouter 请求失败（${status} · ${model}）${detail ? `：${detail}` : ""}`;
}

async function callOpenRouterOnce(
  messages: OpenRouterMessage[],
  withTools: boolean,
  model: string,
  openRouterKey: string,
) {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.3,
  };
  if (withTools) {
    body.tools = CHAT_TOOLS;
    body.tool_choice = "auto";
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_TITLE || "ai-finance",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const error = new Error(friendlyOpenRouterError(res.status, errText, model)) as Error & {
      status?: number;
      raw?: string;
      retryable?: boolean;
    };
    error.status = res.status;
    error.raw = errText;
    error.retryable = isRetryableModelError(res.status, errText);
    throw error;
  }

  return res.json();
}

async function callOpenRouter(messages: OpenRouterMessage[], withTools: boolean) {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) {
    throw new Error("未配置 OPENROUTER_API_KEY");
  }

  const models = resolveModelCandidates();
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    try {
      return await callOpenRouterOnce(messages, withTools, model, openRouterKey);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const retryable = (error as Error & { retryable?: boolean }).retryable === true;
      lastError = error;
      // 限流 / 地区不可用 / 无端点时尝试下一个模型
      if (!retryable) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("OpenRouter 全部候选模型均失败");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (body.messages ?? []) as IncomingMessage[];
    const context = body.context as
      | { thscode?: string; stockName?: string; activeModuleId?: string | null }
      | undefined;

    if (!messages.length) {
      return NextResponse.json({ error: "缺少 messages" }, { status: 400 });
    }

    const contextHint = context
      ? `\n\n当前工作台状态：标的=${context.stockName ?? "未知"}(${context.thscode ?? "无"})，看板=${context.activeModuleId ?? "未打开"}。`
      : "";

    const history: OpenRouterMessage[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT + contextHint },
      ...messages.map((m) => ({
        role: m.role as ChatRole,
        content: m.content,
      })),
    ];

    const toolTraces: ToolTrace[] = [];
    const actions: ChatAction[] = [];
    let rounds = 0;

    while (rounds < 4) {
      rounds += 1;
      const data = await callOpenRouter(history, true);
      const choice = data.choices?.[0]?.message;
      if (!choice) throw new Error("模型未返回消息");

      const toolCalls = choice.tool_calls as OpenRouterMessage["tool_calls"];
      if (!toolCalls?.length) {
        return NextResponse.json({
          content:
            choice.content ||
            "暂时没有得到有效回复。请换个问法，或先打开看板查看原始数据。\n\n不构成投资建议。",
          toolCalls: toolTraces,
          actions,
        });
      }

      history.push({
        role: "assistant",
        content: choice.content ?? null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }

        try {
          const { result, action } = await runFinanceTool(tc.function.name, args);
          toolTraces.push({
            id: tc.id,
            name: tc.function.name,
            status: "success",
            params: args,
            result,
          });
          if (action?.type === "open_module" && action.moduleId) {
            actions.push({
              type: "open_module",
              moduleId: action.moduleId as FinanceModuleId,
              thscode: action.thscode,
            });
          }
          history.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "工具调用失败";
          toolTraces.push({
            id: tc.id,
            name: tc.function.name,
            status: "error",
            params: args,
            result: { error: message },
          });
          history.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify({ error: message }),
          });
        }
      }
    }

    const final = await callOpenRouter(history, false);
    const content =
      final.choices?.[0]?.message?.content ||
      "已完成数据查询，但未能生成总结。请查看工具结果。\n\n不构成投资建议。";

    return NextResponse.json({ content, toolCalls: toolTraces, actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "对话失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
