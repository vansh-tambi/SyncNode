import React from "react";
import { Folder, History as HistoryIcon, MoreVertical, Trash2, Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/select-and-tabs";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getMethodBadgeClass } from "./utils";

interface Collection {
  id: number;
  name: string;
  requests: any[];
}

interface SidebarProps {
  collections: Collection[];
  historyList: any[];
  activeRequestId: number | null;
  populateRequestState: (req: any) => void;
  setRenameTarget: (target: { type: "collection" | "request"; id: number; name: string }) => void;
  setConfirmDeleteTarget: (target: { type: "collection" | "request"; id: number }) => void;
  clearHistory: () => void;
  setApiResponse: (res: any) => void;
  setActiveSettingsTab: (tab: string) => void;
  setShowSettingsModal: (show: boolean) => void;
}

export function Sidebar({
  collections,
  historyList,
  activeRequestId,
  populateRequestState,
  setRenameTarget,
  setConfirmDeleteTarget,
  clearHistory,
  setApiResponse,
  setActiveSettingsTab,
  setShowSettingsModal
}: SidebarProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 relative backdrop-blur-md bg-background/80">
      <Tabs defaultValue="collections" className="flex-grow flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 border-b border-border shrink-0 bg-secondary/40 backdrop-blur-md">
          <TabsList className="border-b-0 h-10 gap-2">
            <TabsTrigger value="collections" className="text-xs py-1.5 px-3">
              <Folder className="h-3.5 w-3.5 mr-1.5" /> Collections
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs py-1.5 px-3">
              <HistoryIcon className="h-3.5 w-3.5 mr-1.5" /> History
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-3 mb-10">
          <TabsContent value="collections" className="mt-0 h-full">
            <div className="space-y-4">
              {collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 border border-dashed border-border rounded-lg">
                  <Folder className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">No Saved Collections</span>
                </div>
              ) : (
                collections.map((col) => (
                  <div key={col.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer py-1 group px-1 rounded hover:bg-white/5 animate-in fade-in relative">
                      <span className="truncate flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        {col.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <DropdownMenu trigger={
                          <button className="text-muted-foreground hover:text-foreground p-0.5"><MoreVertical className="h-3.5 w-3.5" /></button>
                        }>
                          <DropdownMenuItem onClick={() => setRenameTarget({ type: "collection", id: col.id, name: col.name })}>Rename</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setConfirmDeleteTarget({ type: "collection", id: col.id })} className="text-destructive hover:bg-destructive/20">Delete</DropdownMenuItem>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="pl-4 space-y-0.5 border-l border-border/80 ml-2.5">
                      {col.requests?.map((req) => (
                        <div
                          key={req.id}
                          className={`flex items-center justify-between text-xs py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer transition-all ${
                            activeRequestId === req.id ? "bg-primary/10 border-l-2 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => populateRequestState(req)}>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getMethodBadgeClass(req.method)} shrink-0`}>
                              {req.method}
                            </span>
                            <span className="truncate text-muted-foreground hover:text-foreground">{req.name}</span>
                          </div>
                          <DropdownMenu trigger={
                            <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 p-0.5"><MoreVertical className="h-3 w-3" /></button>
                          }>
                            <DropdownMenuItem onClick={() => setRenameTarget({ type: "request", id: req.id, name: req.name })}>Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmDeleteTarget({ type: "request", id: req.id })} className="text-destructive hover:bg-destructive/20">Delete</DropdownMenuItem>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0 h-full">
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                <span className="text-[10px] text-muted-foreground font-mono">LOG ENTRIES</span>
                {historyList.length > 0 && (
                  <button onClick={clearHistory} className="text-[10px] text-destructive hover:text-destructive/80 flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              {historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 border border-dashed border-border rounded-lg">
                  <HistoryIcon className="h-8 w-8 text-muted-foreground/50 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">No Execution Logs</span>
                </div>
              ) : (
                historyList.map((hist) => (
                  <div
                    key={hist.id}
                    onClick={() => {
                      populateRequestState(hist);
                      if (hist.response_status) {
                        setApiResponse({
                          status_code: hist.response_status,
                          time_ms: hist.response_time_ms,
                          size_bytes: hist.response_size_bytes,
                          headers: hist.response_headers || {},
                          body: hist.response_body
                        });
                      }
                    }}
                    className="flex flex-col gap-1 p-2 hover:bg-secondary rounded border border-transparent hover:border-border cursor-pointer transition-all animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getMethodBadgeClass(hist.method)}`}>
                        {hist.method}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{hist.response_time_ms}ms</span>
                    </div>
                    <span className="text-xs truncate text-muted-foreground font-mono">{hist.url}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer Settings Gear */}
      <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-border bg-background/90 backdrop-blur-md flex items-center px-3 justify-between z-10 shrink-0">
        <Button 
          onClick={() => {
            setActiveSettingsTab("themes");
            setShowSettingsModal(true);
          }}
          variant="ghost" 
          size="sm" 
          className="h-7 hover:bg-white/5 border border-transparent hover:border-border gap-1 text-xs text-muted-foreground"
        >
          <Settings className="h-3.5 w-3.5" /> Preferences
        </Button>
        <span className="text-[9px] font-mono text-muted-foreground/80">Shortcuts: Ctrl+Enter</span>
      </div>
    </div>
  );
}
