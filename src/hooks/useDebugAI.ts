import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DebugError {
  line_number: number;
  error_type: string;
  simple_explanation: string;
}

interface DebugState {
  language: string;
  errors: DebugError[];
  confidence: number;
  fixedCode: string;
  whyExplanation: string;
  fixExplanation: string;
  simulatedOutput: string;
  patternWarning: string | null;
  isDetecting: boolean;
  isAnalyzing: boolean;
  isFixing: boolean;
  isExplaining: boolean;
  isSimulating: boolean;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debug-ai`;

async function callAI(action: string, payload: Record<string, any>) {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "AI request failed");
  }

  return resp.json();
}

function parseJSON(text: string) {
  // Strip markdown fences if present
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export function useDebugAI() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<DebugState>({
    language: "Unknown",
    errors: [],
    confidence: 0,
    fixedCode: "",
    whyExplanation: "",
    fixExplanation: "",
    simulatedOutput: "",
    patternWarning: null,
    isDetecting: false,
    isAnalyzing: false,
    isFixing: false,
    isExplaining: false,
    isSimulating: false,
  });
  const [sessionId, setSessionId] = useState<string | null>(null);

  const set = (partial: Partial<DebugState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  const detectLanguage = useCallback(async (code: string) => {
    if (!code.trim()) return;
    set({ isDetecting: true });
    try {
      const { result } = await callAI("detect_language", { code });
      const parsed = parseJSON(result);
      set({ language: parsed.language || "Unknown" });
    } catch (e: any) {
      console.error("Language detection failed:", e);
    } finally {
      set({ isDetecting: false });
    }
  }, []);

  const analyzeErrors = useCallback(async (code: string) => {
    if (!code.trim()) return;
    set({ isAnalyzing: true, errors: [], confidence: 0 });
    try {
      const { result } = await callAI("detect_errors", { code });
      const parsed = parseJSON(result);
      const errors = parsed.errors || [];
      const confidence = parsed.confidence ?? 0;
      set({ errors, confidence });

      // Check for repeated patterns
      if (user && errors.length > 0) {
        checkPatterns(errors);
      }
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      set({ isAnalyzing: false });
    }
  }, [user]);

  const fixCode = useCallback(async (code: string, errors: DebugError[]) => {
    set({ isFixing: true });
    try {
      const { result } = await callAI("fix_code", { code, errors });
      // Strip markdown fences if present
      const cleaned = result.replace(/```[\w]*\s*/g, "").replace(/```\s*/g, "").trim();
      set({ fixedCode: cleaned });

      // Get explanations in parallel
      const [whyRes, fixRes] = await Promise.all([
        callAI("explain_error", { code, errors }),
        callAI("explain_fix", { code, fixedCode: cleaned }),
      ]);
      set({
        whyExplanation: whyRes.result,
        fixExplanation: fixRes.result,
      });
    } catch (e: any) {
      toast({ title: "Fix failed", description: e.message, variant: "destructive" });
    } finally {
      set({ isFixing: false });
    }
  }, []);

  const simulateOutput = useCallback(async (code: string) => {
    set({ isSimulating: true });
    try {
      const { result } = await callAI("simulate_output", { fixedCode: code });
      set({ simulatedOutput: result });
    } catch (e: any) {
      console.error("Simulation failed:", e);
    } finally {
      set({ isSimulating: false });
    }
  }, []);

  const extractCodeFromImage = useCallback(async (imageBase64: string) => {
    try {
      const { result } = await callAI("extract_code", { imageBase64 });
      return result.replace(/```[\w]*\s*/g, "").replace(/```\s*/g, "").trim();
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e.message, variant: "destructive" });
      return null;
    }
  }, []);

  const checkPatterns = useCallback(async (errors: DebugError[]) => {
    if (!user) return;
    try {
      const { data: sessions } = await supabase
        .from("debug_sessions")
        .select("errors")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!sessions) return;

      const errorTypeCounts: Record<string, number> = {};
      for (const s of sessions) {
        const sessionErrors = (s.errors as any[]) || [];
        for (const e of sessionErrors) {
          if (e.error_type) {
            errorTypeCounts[e.error_type] = (errorTypeCounts[e.error_type] || 0) + 1;
          }
        }
      }

      // Check current errors against history
      for (const err of errors) {
        const count = (errorTypeCounts[err.error_type] || 0);
        if (count >= 2) { // 2 past + current = 3+
          try {
            const { result } = await callAI("pattern_tip", { errorType: err.error_type });
            const parsed = parseJSON(result);
            set({ patternWarning: parsed.tip });
          } catch {
            // Ignore pattern tip failures
          }
          break;
        }
      }
    } catch {
      // Ignore pattern check failures
    }
  }, [user]);

  const saveSession = useCallback(async (code: string, language: string, errors: DebugError[], fix: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("debug_sessions")
        .insert({
          user_id: user.id,
          code,
          language,
          errors: errors as any,
          fix,
        })
        .select("id")
        .single();

      if (error) throw error;
      setSessionId(data.id);
      return data.id;
    } catch (e: any) {
      console.error("Failed to save session:", e);
      return null;
    }
  }, [user]);

  const saveChatMessage = useCallback(async (message: string, response: string, sessId?: string) => {
    if (!user) return;
    try {
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        session_id: sessId || sessionId,
        message,
        response,
      });
    } catch (e) {
      console.error("Failed to save chat message:", e);
    }
  }, [user, sessionId]);

  const resetState = useCallback(() => {
    setState({
      language: "Unknown",
      errors: [],
      confidence: 0,
      fixedCode: "",
      whyExplanation: "",
      fixExplanation: "",
      simulatedOutput: "",
      patternWarning: null,
      isDetecting: false,
      isAnalyzing: false,
      isFixing: false,
      isExplaining: false,
      isSimulating: false,
    });
    setSessionId(null);
  }, []);

  return {
    ...state,
    sessionId,
    detectLanguage,
    analyzeErrors,
    fixCode,
    simulateOutput,
    extractCodeFromImage,
    saveSession,
    saveChatMessage,
    resetState,
    set,
  };
}

export async function streamChat(
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void,
  onDone: () => void
) {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "chat", messages }),
  });

  if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}
