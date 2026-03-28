import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronLeft, ChevronRight, Code2, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface DebugSession {
  id: string;
  code: string;
  language: string | null;
  errors: any;
  fix: string | null;
  created_at: string;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onLoadSession: (session: DebugSession) => void;
}

const HistorySidebar = ({ isOpen, onToggle, onLoadSession }: HistorySidebarProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    loadSessions();
  }, [user, isOpen]);

  const loadSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("debug_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setSessions((data as DebugSession[]) || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("debug_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const getHeading = (session: DebugSession) => {
    const firstLine = session.code.split("\n")[0]?.trim() || "Untitled";
    return firstLine.length > 40 ? firstLine.slice(0, 40) + "…" : firstLine;
  };

  const getErrorCount = (session: DebugSession) => {
    if (!session.errors) return 0;
    return Array.isArray(session.errors) ? session.errors.length : 0;
  };

  return (
    <>
      {/* Toggle button when collapsed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-card/80 backdrop-blur-xl border border-border/50 rounded-r-lg p-2 hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-neon-purple" />
                Debug History
              </h3>
              <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Code2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No debug sessions yet</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <motion.button
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onLoadSession(session)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-all group glass-card-hover"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">
                          {getHeading(session)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {session.language && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neon-purple/10 text-neon-purple border border-neon-purple/20">
                              {session.language}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {getErrorCount(session)} errors
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default HistorySidebar;
