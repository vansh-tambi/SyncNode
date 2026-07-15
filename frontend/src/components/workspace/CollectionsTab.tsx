import React from "react";
import { Folder, MoreVertical, Plus, Play } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getMethodBadgeClass } from "./utils";

interface RequestItem {
  id: number;
  name: string;
  method: string;
  url: string;
}

interface Collection {
  id: number;
  name: string;
  requests: RequestItem[];
}

interface CollectionsTabProps {
  collections: Collection[];
  populateRequestState: (req: any) => void;
  setRenameTarget: (target: { type: "collection" | "request"; id: number; name: string }) => void;
  setConfirmDeleteTarget: (target: { type: "collection" | "request"; id: number }) => void;
  setActiveMainTab: (tab: string) => void;
  onCreateRequestClick: () => void;
}

export function CollectionsTab({
  collections,
  populateRequestState,
  setRenameTarget,
  setConfirmDeleteTarget,
  setActiveMainTab,
  onCreateRequestClick
}: CollectionsTabProps) {
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background/50 backdrop-blur-sm select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-wider text-foreground font-sans uppercase">Collections</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">Organize and manage your saved API requests</p>
          </div>
          <Button 
            onClick={onCreateRequestClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-[0_0_10px_rgba(255,95,31,0.2)]"
          >
            <Plus className="h-4 w-4 mr-1" /> New Request
          </Button>
        </div>

        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 border border-dashed border-border rounded-xl bg-secondary/10">
            <Folder className="h-12 w-12 text-muted-foreground/30 animate-pulse" />
            <div className="text-center">
              <span className="text-sm font-mono uppercase tracking-wider block font-bold">No Collections Saved</span>
              <span className="text-xs text-muted-foreground/75 mt-1 block">Save requests to collections to see them here.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => (
              <div 
                key={col.id} 
                className="bg-secondary/20 border border-border/80 rounded-xl p-4 flex flex-col min-h-[200px] hover:border-primary/30 transition-all duration-300 backdrop-blur-md"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
                  <span className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                    <Folder className="h-4 w-4 text-primary shrink-0" />
                    {col.name}
                  </span>
                  <DropdownMenu trigger={
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary"><MoreVertical className="h-4 w-4" /></button>
                  }>
                    <DropdownMenuItem onClick={() => setRenameTarget({ type: "collection", id: col.id, name: col.name })}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConfirmDeleteTarget({ type: "collection", id: col.id })} className="text-destructive hover:bg-destructive/20">Delete</DropdownMenuItem>
                  </DropdownMenu>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[180px] pr-1">
                  {col.requests && col.requests.length > 0 ? (
                    col.requests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => {
                          populateRequestState(req);
                          setActiveMainTab("workspace");
                        }}
                        className="flex items-center justify-between text-xs py-2 px-2.5 bg-secondary/30 hover:bg-secondary/70 border border-border/40 hover:border-border rounded-lg cursor-pointer transition-all duration-150 group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getMethodBadgeClass(req.method)} shrink-0`}>
                            {req.method}
                          </span>
                          <span className="truncate text-muted-foreground group-hover:text-foreground font-mono">{req.name}</span>
                        </div>
                        <DropdownMenu trigger={
                          <button 
                            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 p-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        }>
                          <DropdownMenuItem onClick={() => setRenameTarget({ type: "request", id: req.id, name: req.name })}>Rename</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setConfirmDeleteTarget({ type: "request", id: req.id })} className="text-destructive hover:bg-destructive/20">Delete</DropdownMenuItem>
                        </DropdownMenu>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-center py-6 text-[10px] font-mono text-muted-foreground/60 italic">
                      Empty Collection
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
