import { useRef, useEffect } from "react";
import { Upload, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const languageColors: Record<string, string> = {
  Python: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Java: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  C: "bg-green-500/20 text-green-400 border-green-500/30",
  "C++": "bg-green-500/20 text-green-400 border-green-500/30",
  JavaScript: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  TypeScript: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Go: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Rust: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Ruby: "bg-red-500/20 text-red-400 border-red-500/30",
  PHP: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Unknown: "bg-muted text-muted-foreground border-border",
};

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
  isDetecting: boolean;
  simulatedOutput: string;
  isSimulating: boolean;
  onFileUpload: (file: File) => void;
  onScreenshotUpload: (file: File) => void;
  diffView: { original: string; fixed: string } | null;
}

const CodeEditor = ({
  code,
  onCodeChange,
  language,
  isDetecting,
  simulatedOutput,
  isSimulating,
  onFileUpload,
  onScreenshotUpload,
  diffView,
}: CodeEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineNumbers = Math.max((diffView ? diffView.original : code).split("\n").length, 20);
  const colorClass = languageColors[language] || languageColors.Unknown;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        onScreenshotUpload(file);
      } else {
        onFileUpload(file);
      }
    }
    e.target.value = "";
  };

  // Render diff view
  const renderDiff = () => {
    if (!diffView) return null;
    const origLines = diffView.original.split("\n");
    const fixedLines = diffView.fixed.split("\n");
    const maxLen = Math.max(origLines.length, fixedLines.length);
    const diffLines: { text: string; type: "same" | "removed" | "added" }[] = [];

    for (let i = 0; i < maxLen; i++) {
      const orig = origLines[i] ?? "";
      const fixed = fixedLines[i] ?? "";
      if (orig === fixed) {
        diffLines.push({ text: orig, type: "same" });
      } else {
        if (i < origLines.length) diffLines.push({ text: orig, type: "removed" });
        if (i < fixedLines.length) diffLines.push({ text: fixed, type: "added" });
      }
    }

    return (
      <div className="flex-1 overflow-auto font-mono text-sm leading-6 py-4 px-4">
        {diffLines.map((line, i) => (
          <div
            key={i}
            className={`px-2 ${
              line.type === "removed"
                ? "bg-red-500/10 text-red-400 line-through"
                : line.type === "added"
                ? "bg-green-500/10 text-green-400"
                : "text-foreground"
            }`}
          >
            <span className="text-muted-foreground/50 mr-4 select-none inline-block w-6 text-right">
              {line.type === "removed" ? "−" : line.type === "added" ? "+" : " "}
            </span>
            {line.text || " "}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-[60%] border-r border-border/50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Code Editor</h2>
          <span className={`text-xs px-2.5 py-0.5 rounded-full border transition-all ${colorClass}`}>
            {isDetecting ? <Loader2 className="h-3 w-3 animate-spin inline" /> : language}
          </span>
          {diffView && (
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
              Diff View
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept=".py,.java,.c,.cpp,.js,.ts,.go,.rs,.rb,.php,.txt" onChange={handleFileChange} />
          <input ref={screenshotInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload File
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs" onClick={() => screenshotInputRef.current?.click()}>
            <Camera className="h-3.5 w-3.5" /> Screenshot
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {diffView ? (
          renderDiff()
        ) : (
          <>
            <div className="w-12 bg-muted/30 border-r border-border/50 py-4 px-2 text-right font-mono text-xs text-muted-foreground select-none overflow-hidden">
              {Array.from({ length: lineNumbers }, (_, i) => (
                <div key={i} className="leading-6">{i + 1}</div>
              ))}
            </div>
            <Textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="Paste your code here or upload a file..."
              className="flex-1 resize-none border-0 rounded-none bg-transparent font-mono text-sm leading-6 py-4 px-4 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </>
        )}
      </div>

      {/* Output section */}
      <div className="border-t border-border/50 p-4 h-36 overflow-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Output</h3>
        <div className="font-mono text-xs text-foreground whitespace-pre-wrap">
          {isSimulating ? (
            <span className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Simulating output...
            </span>
          ) : simulatedOutput ? (
            simulatedOutput
          ) : (
            <span className="text-muted-foreground">
              {code.trim() ? "Output will appear after fixing." : "No code to run."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
