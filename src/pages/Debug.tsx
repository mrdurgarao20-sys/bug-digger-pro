import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bug, Upload, Camera, Flame, History, LogOut,
  MessageCircle, X, Send, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const languageColors: Record<string, string> = {
  Python: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Java: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  C: "bg-green-500/20 text-green-400 border-green-500/30",
  JavaScript: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Unknown: "bg-muted text-muted-foreground border-border",
};

function detectLanguage(code: string): string {
  if (/\bdef\b|import\s+\w|print\s*\(/.test(code)) return "Python";
  if (/public\s+class|System\.out/.test(code)) return "Java";
  if (/#include|printf\s*\(|int\s+main/.test(code)) return "C";
  if (/\bconst\b|\blet\b|console\.log|=>/.test(code)) return "JavaScript";
  return "Unknown";
}

const sampleErrors = [
  { line: 3, message: "Undefined variable 'result'" },
  { line: 7, message: "Missing closing parenthesis" },
];

const Debug = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Unknown");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [errors, setErrors] = useState<typeof sampleErrors>([]);
  const [showFix, setShowFix] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    setLanguage(detectLanguage(code));
  }, [code]);

  const handleAnalyze = () => {
    if (code.trim()) {
      setErrors(sampleErrors);
      setShowFix(false);
    }
  };

  const lineNumbers = code.split("\n").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Bug className="h-8 w-8 text-neon-purple animate-glow-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Bug className="h-5 w-5 text-neon-purple" />
          <span className="font-bold gradient-text">Bug Digger</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-400" />
            <span>🔥 5 bugs fixed today</span>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
            <History className="h-4 w-4" /> History
          </Button>
          <div className="h-8 w-8 rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center text-sm font-medium text-neon-purple">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-[60%] border-r border-border/50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">Code Editor</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${languageColors[language]}`}>
                {language}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" /> Upload File
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs">
                <Camera className="h-3.5 w-3.5" /> Screenshot
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Line numbers */}
            <div className="w-12 bg-muted/30 border-r border-border/50 py-4 px-2 text-right font-mono text-xs text-muted-foreground select-none overflow-hidden">
              {Array.from({ length: Math.max(lineNumbers, 20) }, (_, i) => (
                <div key={i} className="leading-6">{i + 1}</div>
              ))}
            </div>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here or upload a file..."
              className="flex-1 resize-none border-0 rounded-none bg-transparent font-mono text-sm leading-6 py-4 px-4 focus-visible:ring-0 placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Output section */}
          <div className="border-t border-border/50 p-4 h-32">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Output</h3>
            <div className="font-mono text-xs text-muted-foreground">
              {code.trim() ? "Ready to analyze..." : "No code to run."}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[40%] flex flex-col overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Errors */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Errors Detected
                </h2>
                <button
                  onClick={handleAnalyze}
                  className="neon-button text-xs px-4 py-1.5"
                  disabled={!code.trim()}
                >
                  Analyze
                </button>
              </div>

              {errors.length > 0 ? (
                <div className="space-y-2">
                  {errors.map((err, i) => (
                    <div key={i} className="glass-card p-3 flex items-start gap-3">
                      <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                        L{err.line}
                      </span>
                      <span className="text-sm text-foreground">{err.message}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowFix(true)}
                    className="neon-button w-full mt-3 text-sm py-2 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Fix
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {code.trim() ? "Click Analyze to detect errors." : "Paste code to get started."}
                </p>
              )}
            </div>

            {/* Explanation */}
            {showFix && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="glass-card glow-border-cyan p-5">
                  <h3 className="text-sm font-semibold text-neon-cyan mb-2">Why Did This Error Occur?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The variable <code className="text-neon-cyan font-mono">result</code> was used before being assigned a value. 
                    Additionally, there's a missing closing parenthesis on line 7 which breaks the syntax.
                  </p>
                </div>

                <div className="glass-card glow-border-purple p-5">
                  <h3 className="text-sm font-semibold text-neon-purple mb-2">Corrected Code Explanation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Initialize <code className="text-neon-purple font-mono">result</code> before use and add the missing parenthesis. 
                    Always declare variables before referencing them to avoid runtime errors.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Chat bubble */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 glass-card border-l border-border/50 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-neon-purple" /> AI Assistant
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="glass-card p-3 text-sm text-muted-foreground">
                Hi! I'm your debugging assistant. Ask me anything about your code.
              </div>
            </div>
            <div className="p-4 border-t border-border/50 flex gap-2">
              <input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask about your code..."
                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-purple"
              />
              <Button size="icon" className="neon-button-purple p-2 rounded-lg">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat toggle */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 neon-button-purple rounded-full p-4 z-40"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default Debug;
