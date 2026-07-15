import React from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select-and-tabs";
import { HighlightedInput } from "./HighlightedInput";

const REQUEST_TABS = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" }
];

interface RequestEditorProps {
  activeReqTab: string;
  setActiveReqTab: (tab: string) => void;
  queryParams: any[];
  headers: any[];
  handleKeyValueChange: (idx: number, field: any, val: any, type: any) => void;
  removeKeyValueRow: (idx: number, type: any) => void;
  bodyContent: string;
  setBodyContent: (val: string) => void;
  authType: string;
  setAuthType: (val: string) => void;
  authToken: string;
  setAuthToken: (val: string) => void;
}

export function RequestEditor({
  activeReqTab,
  setActiveReqTab,
  queryParams,
  headers,
  handleKeyValueChange,
  removeKeyValueRow,
  bodyContent,
  setBodyContent,
  authType,
  setAuthType,
  authToken,
  setAuthToken
}: RequestEditorProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex border-b border-border bg-secondary/20 rounded-t-lg shrink-0 overflow-hidden relative">
        {REQUEST_TABS.map((tab) => {
          const isActive = activeReqTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReqTab(tab.id)}
              className="relative px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <span className={isActive ? "text-foreground font-bold" : ""}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="liquid-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 p-4 bg-secondary/10 border border-t-0 border-border rounded-b-lg overflow-y-auto min-h-0">
        {/* Params & Headers Table Grid */}
        {(activeReqTab === "params" || activeReqTab === "headers") && (
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {activeReqTab === "params" ? "Query Parameters" : "Request Headers"}
            </span>
            <div className="border border-border rounded-lg overflow-hidden bg-secondary/30 overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-[10px] font-mono text-muted-foreground">
                    <th className="p-2 w-12 text-center">Active</th>
                    <th className="p-2 w-1/3 border-r border-border">Key</th>
                    <th className="p-2">Value</th>
                    <th className="p-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {(activeReqTab === "params" ? queryParams : headers).map((item, idx) => (
                    <tr key={idx} className="border-b border-border/40 last:border-b-0 hover:bg-secondary/20">
                      <td className="p-1.5 text-center">
                        <input 
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => handleKeyValueChange(idx, "enabled", e.target.checked, activeReqTab)}
                          className="h-3 w-3 accent-primary rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-1.5 border-r border-border">
                        <input 
                          placeholder="key"
                          value={item.key}
                          onChange={(e) => handleKeyValueChange(idx, "key", e.target.value, activeReqTab)}
                          className="w-full bg-transparent border-0 text-xs font-mono focus:ring-0 focus:outline-none text-foreground"
                        />
                      </td>
                      <td className="p-1.5">
                        <HighlightedInput
                          value={item.value}
                          onChange={(val) => handleKeyValueChange(idx, "value", val, activeReqTab)}
                          placeholder="value"
                          className="border-0 bg-transparent h-7 px-0"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        {idx < (activeReqTab === "params" ? queryParams.length - 1 : headers.length - 1) && (
                          <button 
                            onClick={() => removeKeyValueRow(idx, activeReqTab)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Body Tab */}
        {activeReqTab === "body" && (
          <div className="h-full flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase mb-2">JSON Body (Raw)</span>
            <div className="flex-1 min-h-[180px] border border-border rounded-lg overflow-hidden font-mono">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={bodyContent}
                onChange={(val) => setBodyContent(val || "")}
                options={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 8 }
                }}
              />
            </div>
          </div>
        )}

        {/* Auth Tab */}
        {activeReqTab === "auth" && (
          <div className="space-y-3 max-w-md animate-in fade-in">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Authorization Configuration</span>
            <div className="grid gap-3">
              <Select value={authType} onValueChange={setAuthType}>
                <SelectTrigger className="bg-secondary border-border text-xs h-9 text-foreground">
                  {authType === "bearer" ? "Bearer Token" : "No Auth"}
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  <SelectItem value="none">No Auth</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                </SelectContent>
              </Select>
              {authType === "bearer" && (
                <HighlightedInput
                  value={authToken}
                  onChange={setAuthToken}
                  placeholder="Token secret key..."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
