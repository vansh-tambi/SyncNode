import React from "react";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMethodBadgeClass, getStatusCodeClass } from "./utils";

interface HistoryItem {
  id: number;
  method: string;
  url: string;
  response_status?: number;
  response_time_ms?: number;
  response_size_bytes?: number;
  response_headers?: any;
  response_body?: any;
}

interface HistoryTabProps {
  historyList: HistoryItem[];
  clearHistory: () => void;
  populateRequestState: (req: any) => void;
  setApiResponse: (res: any) => void;
  setActiveMainTab: (tab: string) => void;
}

export function HistoryTab({
  historyList,
  clearHistory,
  populateRequestState,
  setApiResponse,
  setActiveMainTab
}: HistoryTabProps) {
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background/50 backdrop-blur-sm select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-wider text-foreground font-sans uppercase">Execution History</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">Audit log of your outbound request transmissions</p>
          </div>
          {historyList.length > 0 && (
            <Button 
              onClick={clearHistory}
              variant="ghost"
              className="text-xs h-9 border border-border text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Clear History
            </Button>
          )}
        </div>

        {historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 border border-dashed border-border rounded-xl bg-secondary/10">
            <HistoryIcon className="h-12 w-12 text-muted-foreground/30 animate-pulse" />
            <div className="text-center">
              <span className="text-sm font-mono uppercase tracking-wider block font-bold">No History Logs</span>
              <span className="text-xs text-muted-foreground/75 mt-1 block">Trigger outbound requests to begin logging history.</span>
            </div>
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-secondary/20 backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="p-3.5 w-24">Method</th>
                    <th className="p-3.5">URL Target</th>
                    <th className="p-3.5 w-24 text-center">Status</th>
                    <th className="p-3.5 w-28 text-right">Latency</th>
                    <th className="p-3.5 w-28 text-right">Payload Size</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((hist) => (
                    <tr 
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
                        setActiveMainTab("workspace");
                      }}
                      className="border-b border-border/40 last:border-b-0 hover:bg-secondary/40 cursor-pointer transition-all duration-150"
                    >
                      <td className="p-3.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getMethodBadgeClass(hist.method)}`}>
                          {hist.method}
                        </span>
                      </td>
                      <td className="p-3.5 truncate max-w-md text-foreground/90 font-mono">
                        {hist.url}
                      </td>
                      <td className="p-3.5 text-center">
                        {hist.response_status ? (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusCodeClass(hist.response_status)}`}>
                            {hist.response_status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right text-primary font-bold">
                        {hist.response_time_ms ? `${hist.response_time_ms} ms` : "-"}
                      </td>
                      <td className="p-3.5 text-right text-muted-foreground">
                        {hist.response_size_bytes ? `${(hist.response_size_bytes / 1024).toFixed(2)} KB` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
