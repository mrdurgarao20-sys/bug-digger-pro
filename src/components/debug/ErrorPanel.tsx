import { AlertTriangle, CheckCircle2, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { DebugError } from "@/hooks/useDebugAI";

interface ErrorPanelProps {
  code: string;
  errors: DebugError[];
  confidence: number;
  isAnalyzing: boolean;
  isFixing: boolean;
  whyExplanation: string;
  fixExplanation: string;
  patternWarning: string | null;
  onAnalyze: () => void;
  onFix: () => void;
}

const AnalyzingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass-card p-3 flex items-start gap-3">
        <Skeleton className="h-5 w-10 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const ExplanationSkeleton = () => (
  <div className="glass-card p-5 space-y-2">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-5/6" />
    <Skeleton className="h-3 w-3/4" />
  </div>
);

const ErrorPanel = ({
  code,
  errors,
  confidence,
  isAnalyzing,
  isFixing,
  whyExplanation,
  fixExplanation,
  patternWarning,
  onAnalyze,
  onFix,
}: ErrorPanelProps) => {
  return (
    <div className="w-full md:w-[40%] flex flex-col overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Errors */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Errors Detected
              {errors.length > 0 && (
                <span className="text-xs text-muted-foreground">({errors.length})</span>
              )}
            </h2>
            <button
              onClick={onAnalyze}
              className="neon-button text-xs px-4 py-1.5 flex items-center gap-1.5"
              disabled={!code.trim() || isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {/* Pattern warning */}
          {patternWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 glass-card-hover"
            >
              <p className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4" />
                ⚠️ You keep making this mistake!
              </p>
              <p className="text-sm text-muted-foreground">{patternWarning}</p>
            </motion.div>
          )}

          {isAnalyzing ? (
            <AnalyzingSkeleton />
          ) : errors.length > 0 ? (
            <div className="space-y-2">
              {errors.map((err, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card glass-card-hover p-3 flex items-start gap-3"
                >
                  <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded shrink-0">
                    L{err.line_number}
                  </span>
                  <div>
                    <span className="text-xs text-neon-purple font-medium">{err.error_type}</span>
                    <p className="text-sm text-foreground mt-0.5">{err.simple_explanation}</p>
                  </div>
                </motion.div>
              ))}

              {confidence > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <TrendingUp className="h-3.5 w-3.5 text-neon-cyan" />
                  Fix Confidence: <span className="text-neon-cyan font-semibold">{confidence}%</span>
                </div>
              )}

              <button
                onClick={onFix}
                disabled={isFixing}
                className="neon-button w-full mt-3 text-sm py-2 flex items-center justify-center gap-2"
              >
                {isFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isFixing ? "Fixing..." : "Fix"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {code.trim() ? "Click Analyze to detect errors." : "Paste code to get started."}
            </p>
          )}
        </div>

        {/* Explanations */}
        {isFixing ? (
          <>
            <ExplanationSkeleton />
            <ExplanationSkeleton />
          </>
        ) : (
          <>
            {whyExplanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card glass-card-hover glow-border-cyan p-5">
                <h3 className="text-sm font-semibold text-neon-cyan mb-2">Why Did This Error Occur?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{whyExplanation}</p>
              </motion.div>
            )}

            {fixExplanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card glass-card-hover glow-border-purple p-5">
                <h3 className="text-sm font-semibold text-neon-purple mb-2">Corrected Code Explanation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{fixExplanation}</p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ErrorPanel;
