import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DiffModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  originalCode: string;
  fixedCode: string;
}

const DiffModal = ({ isOpen, onAccept, onReject, originalCode, fixedCode }: DiffModalProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fixedCode);
    setCopied(true);
    toast({ title: "Copied!", description: "Corrected code copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-card glow-border-cyan w-full max-w-lg mx-4 p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-2">Accept these changes?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              The AI has generated a fix for your code. Would you like to apply it?
            </p>

            <div className="max-h-48 overflow-auto mb-6 glass-card p-3 font-mono text-xs">
              <pre className="text-foreground whitespace-pre-wrap">{fixedCode}</pre>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={handleCopy}
                className="text-muted-foreground gap-1.5"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                onClick={onReject}
                className="text-muted-foreground gap-1.5"
              >
                <X className="h-4 w-4" /> No
              </Button>
              <button onClick={onAccept} className="neon-button text-sm px-6 py-2 flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Yes, Apply
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DiffModal;
