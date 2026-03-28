import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDebugAI } from "@/hooks/useDebugAI";
import { Bug, Flame, LogOut, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CodeEditor from "@/components/debug/CodeEditor";
import ErrorPanel from "@/components/debug/ErrorPanel";
import DiffModal from "@/components/debug/DiffModal";
import ChatDrawer from "@/components/debug/ChatDrawer";
import HistorySidebar from "@/components/debug/HistorySidebar";
import { supabase } from "@/integrations/supabase/client";

const Debug = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffView, setDiffView] = useState<{ original: string; fixed: string } | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  const ai = useDebugAI();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("debug_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .then(({ count }) => setTodayCount(count || 0));
  }, [user]);

  useEffect(() => {
    if (!code.trim()) {
      ai.set({ language: "Unknown" });
      return;
    }
    const timer = setTimeout(() => ai.detectLanguage(code), 800);
    return () => clearTimeout(timer);
  }, [code]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    ai.set({ errors: [], fixedCode: "", whyExplanation: "", fixExplanation: "", simulatedOutput: "", patternWarning: null, confidence: 0 });
    setDiffView(null);
  };

  const handleNewCode = () => {
    setCode("");
    ai.resetState();
    setDiffView(null);
    setShowDiffModal(false);
    toast({ title: "Ready!", description: "Paste new code to debug." });
  };

  const handleAnalyze = useCallback(() => {
    ai.analyzeErrors(code);
  }, [code, ai]);

  const handleFix = useCallback(async () => {
    await ai.fixCode(code, ai.errors);
    if (ai.fixedCode) {
      setShowDiffModal(true);
      setDiffView({ original: code, fixed: ai.fixedCode });
    }
  }, [code, ai]);

  useEffect(() => {
    if (ai.fixedCode && !ai.isFixing) {
      setShowDiffModal(true);
      setDiffView({ original: code, fixed: ai.fixedCode });
    }
  }, [ai.fixedCode, ai.isFixing]);

  const handleAcceptFix = async () => {
    setCode(ai.fixedCode);
    setShowDiffModal(false);
    setDiffView(null);
    ai.simulateOutput(ai.fixedCode);
    const sid = await ai.saveSession(code, ai.language, ai.errors, ai.fixedCode);
    if (sid) {
      setTodayCount((c) => c + 1);
      toast({ title: "Fix accepted! 🎉", description: "Your code has been updated." });
    }
  };

  const handleRejectFix = () => {
    setShowDiffModal(false);
    setDiffView(null);
  };

  const handleLoadSession = (session: any) => {
    setCode(session.code);
    if (session.errors) ai.set({ errors: session.errors, language: session.language || "Unknown" });
    if (session.fix) ai.set({ fixedCode: session.fix });
    setHistoryOpen(false);
    toast({ title: "Session loaded", description: "Loaded a previous debug session." });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => handleCodeChange(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleScreenshotUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      const extracted = await ai.extractCodeFromImage(base64);
      if (extracted) handleCodeChange(extracted);
    };
    reader.readAsDataURL(file);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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
      <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Bug className="h-5 w-5 text-neon-purple" />
          <span className="font-bold gradient-text hidden sm:inline">Bug Digger</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="hidden sm:inline">🔥 {todayCount} bugs fixed today</span>
            <span className="sm:hidden">{todayCount}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleNewCode} className="text-neon-cyan gap-1.5 text-xs hover:bg-neon-cyan/10">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Code</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(!historyOpen)} className="text-muted-foreground gap-1.5 text-xs">
            History
          </Button>
          <div className="h-8 w-8 rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center text-sm font-medium text-neon-purple">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive" title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        <HistorySidebar
          isOpen={historyOpen}
          onToggle={() => setHistoryOpen(!historyOpen)}
          onLoadSession={handleLoadSession}
        />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <CodeEditor
            code={code}
            onCodeChange={handleCodeChange}
            language={ai.language}
            isDetecting={ai.isDetecting}
            simulatedOutput={ai.simulatedOutput}
            isSimulating={ai.isSimulating}
            onFileUpload={handleFileUpload}
            onScreenshotUpload={handleScreenshotUpload}
            diffView={diffView}
          />

          <ErrorPanel
            code={code}
            errors={ai.errors}
            confidence={ai.confidence}
            isAnalyzing={ai.isAnalyzing}
            isFixing={ai.isFixing}
            whyExplanation={ai.whyExplanation}
            fixExplanation={ai.fixExplanation}
            patternWarning={ai.patternWarning}
            onAnalyze={handleAnalyze}
            onFix={handleFix}
          />
        </div>
      </div>

      <DiffModal
        isOpen={showDiffModal}
        onAccept={handleAcceptFix}
        onReject={handleRejectFix}
        originalCode={code}
        fixedCode={ai.fixedCode}
      />

      <ChatDrawer
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
        code={code}
        errors={ai.errors}
        fixedCode={ai.fixedCode}
        sessionId={ai.sessionId}
        saveChatMessage={ai.saveChatMessage}
      />
    </div>
  );
};

export default Debug;
