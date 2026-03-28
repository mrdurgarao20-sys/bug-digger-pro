import { motion } from "framer-motion";
import { Bug, Code2, Upload, Camera } from "lucide-react";

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex-1 flex flex-col items-center justify-center p-8 text-center"
  >
    <div className="relative mb-6">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-2xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center"
      >
        <Bug className="h-10 w-10 text-neon-purple" />
      </motion.div>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -inset-3 rounded-2xl bg-neon-purple/5 blur-xl"
      />
    </div>

    <h3 className="text-lg font-semibold text-foreground mb-2">Ready to squash some bugs?</h3>
    <p className="text-sm text-muted-foreground max-w-xs mb-6">
      Paste your code, upload a file, or snap a screenshot to get started.
    </p>

    <div className="flex items-center gap-6 text-muted-foreground/50">
      <div className="flex flex-col items-center gap-1.5">
        <Code2 className="h-5 w-5" />
        <span className="text-[10px]">Paste Code</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Upload className="h-5 w-5" />
        <span className="text-[10px]">Upload File</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Camera className="h-5 w-5" />
        <span className="text-[10px]">Screenshot</span>
      </div>
    </div>
  </motion.div>
);

export default EmptyState;
