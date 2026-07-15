import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Tabs } from "@/components/ui/select-and-tabs";
import { getStatusCodeClass } from "./utils";

const RESPONSE_TABS = [
  { id: "pretty", label: "Pretty" },
  { id: "raw", label: "Raw" },
  { id: "headers", label: "Headers" }
];

interface ResponseViewerProps {
  apiResponse: any;
  responseTab: string;
  setResponseTab: (tab: string) => void;
}

export function ResponseViewer({ apiResponse, responseTab, setResponseTab }: ResponseViewerProps) {
  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Status Bar */}
      <div className="flex items-center justify-between shrink-0 bg-secondary/40 border border-border rounded-lg px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-muted-foreground">Response:</span>
          {apiResponse ? (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getStatusCodeClass(apiResponse.status_code)}`}>
              {apiResponse.status_code}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground font-mono italic">No Request Sent</span>
          )}
        </div>
        {apiResponse && (
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground animate-in fade-in">
            <span>Time: <span className="text-primary font-bold">{apiResponse.time_ms} ms</span></span>
            <span className="h-3 w-px bg-border" />
            <span>Size: <span className="text-primary font-bold">{(apiResponse.size_bytes / 1024).toFixed(2)} KB</span></span>
          </div>
        )}
      </div>

      {/* Response content */}
      <div className="flex-1 flex flex-col min-h-0 font-mono">
        <Tabs defaultValue="pretty" className="flex-1 flex flex-col min-h-0">
          <div className="flex border-b border-border bg-secondary/20 rounded-t-lg shrink-0 overflow-hidden relative">
            {RESPONSE_TABS.map((tab) => {
              const isActive = responseTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setResponseTab(tab.id)}
                  className="relative px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  <span className={isActive ? "text-foreground font-bold" : ""}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="response-liquid-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 bg-secondary/20 border border-t-0 border-border rounded-b-lg overflow-y-auto min-h-0 font-mono text-xs relative">
            <AnimatePresence mode="wait">
              {apiResponse ? (
                <motion.div
                  key={`${responseTab}-${apiResponse.time_ms}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-full"
                >
                  {responseTab === "pretty" && (
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      theme="vs-dark"
                      value={apiResponse.body || "{}"}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 8 },
                        fontFamily: "var(--font-geist-mono), monospace"
                      }}
                    />
                  )}

                  {responseTab === "raw" && (
                    <pre className="text-foreground p-4 leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
                      {apiResponse.body}
                    </pre>
                  )}

                  {responseTab === "headers" && (
                    <div className="p-4 space-y-1">
                      {Object.entries(apiResponse.headers || {}).map(([k, v]) => (
                        <div key={k} className="flex border-b border-border/30 py-1.5 last:border-b-0">
                          <span className="w-1/3 text-muted-foreground font-semibold">{k}</span>
                          <span className="w-2/3 text-foreground">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Terminal className="h-8 w-8 animate-pulse text-muted-foreground/50" />
                  <span className="text-xs uppercase tracking-widest font-mono">Ready to Transmit Data...</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
