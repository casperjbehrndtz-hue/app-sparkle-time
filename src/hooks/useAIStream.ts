import { useState, useCallback, useRef } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface StreamOptions {
  /** Edge function path (e.g. "budget-ai" or "onboarding-ai") */
  functionName: string;
  /** Request body */
  body: Record<string, unknown>;
  /** Called with each text chunk */
  onDelta?: (chunk: string) => void;
  /** Called when streaming completes */
  onDone?: () => void;
  /** Called on error */
  onError?: (error: string) => void;
}

interface UseAIStreamReturn {
  /** Accumulated streamed text */
  text: string;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Start a new stream */
  stream: (options: StreamOptions) => Promise<void>;
  /** Reset text */
  reset: () => void;
}

/**
 * Shared hook for SSE-style AI streaming from edge functions.
 * Consolidates streaming logic from AIChatPanel, AIWelcomeInsight, etc.
 */
export function useAIStream(): UseAIStreamReturn {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setText("");
    setIsStreaming(false);
    abortRef.current?.abort();
  }, []);

  const stream = useCallback(async (options: StreamOptions) => {
    const { functionName, body, onDelta, onDone, onError } = options;
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    let accumulated = "";

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Ukendt fejl" }));
        const msg = err.error || `Fejl ${resp.status}`;
        // If server signals monthly limit, mark it so UI can react
        if (err.limit_reached) {
          (options as any).onLimitReached?.();
        }
        onError?.(msg);
        setIsStreaming(false);
        return;
      }

      if (!resp.body) {
        onError?.("Ingen stream modtaget");
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setText(accumulated);
              onDelta?.(content);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsStreaming(false);
      onDone?.();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Netværksfejl";
      onError?.(msg);
      setIsStreaming(false);
    }
  }, []);

  return { text, isStreaming, stream, reset };
}
