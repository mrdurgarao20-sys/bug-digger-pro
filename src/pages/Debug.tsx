import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDebugAI } from "@/hooks/useDebugAI";
import { Bug, Flame, History, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CodeEditor from "@/components/debug/CodeEditor";
import ErrorPanel from "@/components/debug/ErrorPanel";
import DiffModal from "@/components/debug/DiffModal";
import ChatDrawer from "@/components/debug/ChatDrawer";
import { supabase } from "@/integrations/supabase/client";

const Debug = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffView, setDiffView] = useState<{ original: string; fixed: string } | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  const ai = useDebugAI();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Load today's bug count
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

  // Auto-detect language on code change (debounced)
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
    // Reset state when code changes
    ai.set({ errors: [], fixedCode: "", whyExplanation: "", fixExplanation: "", simulatedOutput: "", patternWarning: null, confidence: 0 });
    setDiffView(null);
  };

  const handleAnalyze = useCallback(() => {
    ai.analyzeErrors(code);
  }, [code, ai]);

  const handleFix = useCallback(async () => {
    await ai.fixCode(code, ai.errors);
    // Show diff modal after fix
    if (ai.fixedCode) {
      setShowDiffModal(true);
      setDiffView({ original: code, fixed: ai.fixedCode });
    }
  }, [code, ai]);

  // Watch for fixedCode to show modal
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

    // Simulate output
    ai.simulateOutput(ai.fixedCode);

    // Save session
    const sid = await ai.saveSession(code, ai.language, ai.errors, ai.fixedCode);
    if (sid) setTodayCount((c) => c + 1);
  };

  const handleRejectFix = () => {
    setShowDiffModal(false);
    setDiffView(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleCodeChange(text);
    };
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
            <span>🔥 {todayCount} bugs fixed today</span>
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

      {/* Diff Modal */}
      <DiffModal
        isOpen={showDiffModal}
        onAccept={handleAcceptFix}
        onReject={handleRejectFix}
        originalCode={code}
        fixedCode={ai.fixedCode}
      />

      {/* Chat */}
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
