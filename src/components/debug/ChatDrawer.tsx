import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/hooks/useDebugAI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DebugError } from "@/hooks/useDebugAI";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  code: string;
  errors: DebugError[];
  fixedCode: string;
  sessionId: string | null;
  saveChatMessage: (message: string, response: string, sessionId?: string) => Promise<void>;
}

const ChatDrawer = ({
  isOpen,
  onToggle,
  code,
  errors,
  fixedCode,
  sessionId,
  saveChatMessage,
}: ChatDrawerProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm Bug Digger, your debugging buddy. 🐛 Ask me anything about your code!" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const buildContext = useCallback(async () => {
    let context = "";
    if (code) context += `\n\nCurrent code:\n\`\`\`\n${code}\n\`\`\``;
    if (errors.length > 0) context += `\n\nDetected errors:\n${JSON.stringify(errors, null, 2)}`;
    if (fixedCode) context += `\n\nFixed code:\n\`\`\`\n${fixedCode}\n\`\`\``;

    // Fetch last 5 debug sessions for context
    if (user) {
      try {
        const { data: sessions } = await supabase
          .from("debug_sessions")
          .select("code, language, errors, fix")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (sessions && sessions.length > 0) {
          context += "\n\nRecent debug history (last 5 sessions):";
          sessions.forEach((s, i) => {
            context += `\nSession ${i + 1} (${s.language || "unknown"}): ${(s.errors as any[])?.length || 0} errors found`;
          });
        }
      } catch {}
    }

    return context;
  }, [code, errors, fixedCode, user]);

  const send = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);

    const context = await buildContext();
    const contextMsg = context ? `[Context: ${context}]\n\nUser question: ${userMsg}` : userMsg;

    // Build full message history for AI
    const aiMessages = [
      ...messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) !== 0), // skip initial greeting
      { role: "user" as const, content: contextMsg },
    ];

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat(
        aiMessages,
        updateAssistant,
        () => {
          setIsStreaming(false);
          saveChatMessage(userMsg, assistantContent, sessionId || undefined);
        }
      );
    } catch (e) {
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble connecting. Please try again." },
      ]);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 glass-card border-l border-border/50 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-neon-purple" /> Bug Digger AI
              </h3>
              <Button variant="ghost" size="icon" onClick={onToggle}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm p-3 rounded-lg max-w-[85%] ${
                    msg.role === "user"
                      ? "ml-auto bg-neon-purple/20 border border-neon-purple/30 text-foreground"
                      : "glass-card text-muted-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="glass-card p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/50 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about your code..."
                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-purple"
                disabled={isStreaming}
              />
              <Button
                size="icon"
                onClick={send}
                disabled={isStreaming || !input.trim()}
                className="neon-button-purple p-2 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 neon-button-purple rounded-full p-4 z-40"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default ChatDrawer;
