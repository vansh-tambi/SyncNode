import React from "react";
import { Play, Save, ChevronRight } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select-and-tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { HighlightedInput } from "./HighlightedInput";
import { motion, AnimatePresence } from "framer-motion";

interface ActionBarProps {
  selectedMethod: string;
  setSelectedMethod: (val: string) => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  activeRequestId: number | null;
  activeRequestName: string;
  handleSaveAction: () => void;
  isLoading: boolean;
  handleSendRequest: () => void;
  setActiveRequestId: (id: number | null) => void;
  setSaveRequestName: (name: string) => void;
  setShowSaveDialog: (show: boolean) => void;
}

export function ActionBar({
  selectedMethod,
  setSelectedMethod,
  urlInput,
  setUrlInput,
  activeRequestId,
  activeRequestName,
  handleSaveAction,
  isLoading,
  handleSendRequest,
  setActiveRequestId,
  setSaveRequestName,
  setShowSaveDialog
}: ActionBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 bg-secondary border border-border rounded-lg p-2 focus-within:border-primary/50 transition-colors shrink-0">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-24 shrink-0">
          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger className="w-24 bg-transparent border-0 text-xs h-7 text-foreground font-bold shadow-none">
              {selectedMethod}
            </SelectTrigger>
            <SelectContent className="bg-secondary border-border">
              {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                <SelectItem key={m} value={m}>
                  <span className={`text-xs font-bold ${selectedMethod === m ? "text-primary" : ""}`}>
                    {m}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex-1 min-w-0">
          <HighlightedInput
            value={urlInput}
            onChange={setUrlInput}
            placeholder="Enter request URL..."
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 shrink-0 border-t border-border/50 md:border-0 pt-2 md:pt-0">
        {activeRequestId && (
          <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-1 max-w-[120px] truncate">
            {activeRequestName}
          </span>
        )}
        
        <div className="flex items-center gap-px border border-border rounded-md overflow-hidden bg-transparent">
          <Button 
            onClick={handleSaveAction}
            variant="ghost"
            className="text-xs h-8 hover:bg-white/5 gap-1 text-muted-foreground px-3 rounded-none border-0"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <DropdownMenu trigger={
            <button className="text-muted-foreground hover:text-foreground p-2 border-l border-border h-8 flex items-center justify-center bg-transparent">
              <ChevronRight className="h-3 w-3 rotate-90" />
            </button>
          }>
            <DropdownMenuItem onClick={() => {
              setActiveRequestId(null);
              setSaveRequestName(activeRequestName ? `${activeRequestName} Copy` : "New Outbound Request Copy");
              setShowSaveDialog(true);
            }}>
              Save As...
            </DropdownMenuItem>
          </DropdownMenu>
        </div>

        <Button 
          onClick={isLoading ? undefined : handleSendRequest}
          className={`relative bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 px-4 rounded-md flex items-center justify-center min-w-[85px] overflow-hidden ${isLoading ? "cursor-not-allowed" : ""}`}
          style={{ boxShadow: "0 0 10px rgba(255, 95, 31, 0.25)" }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
              />
            ) : (
              <motion.div
                key="send"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> SEND
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}
