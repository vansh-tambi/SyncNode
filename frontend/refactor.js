const fs = require('fs');

let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// The main layout starts at <PanelGroup orientation="horizontal"> (line 660)
// and ends right before {/* dialog overlays */} (line 1193).
const layoutStartIndex = code.indexOf('<PanelGroup orientation="horizontal">');
const layoutEndIndex = code.indexOf('{/* dialog overlays */}');

const topPart = code.substring(0, layoutStartIndex);
const bottomPart = code.substring(layoutEndIndex);

// Do imports replacement on topPart
let newTopPart = topPart.replace(/import \{ \n  Plus, Play.*?\n\} from "lucide-react";/s, `import { 
  Plus, Settings, Terminal, Check, X, Layers, ShieldAlert
} from "lucide-react";`);

newTopPart = newTopPart.replace(/import \{ DropdownMenu, DropdownMenuItem \} from "@\/components\/ui\/dropdown-menu";\nimport Editor from "@monaco-editor\/react";/, `import { Sidebar } from "@/components/workspace/Sidebar";
import { ActionBar } from "@/components/workspace/ActionBar";
import { RequestEditor } from "@/components/workspace/RequestEditor";
import { ResponseViewer } from "@/components/workspace/ResponseViewer";
import { HighlightedInput } from "@/components/workspace/HighlightedInput";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";`);

newTopPart = newTopPart.replace(/const REQUEST_TABS = \[.*?\];\n\nconst RESPONSE_TABS = \[.*?\];\n\nfunction HighlightedInput.*?\}\n\n/s, '');

newTopPart = newTopPart.replace(/const getMethodBadgeClass = \(method: string\) => \{[\s\S]*?const getStatusCodeClass = \(status: number\) => \{[\s\S]*?return "bg-\[#161622\] text-zinc-500 border-\[#27273A\]";\n  \};\n\n/, '// Utilities extracted to workspace/utils.ts\n\n');

// Replace hex colors in newTopPart and bottomPart
const applyVariables = (str) => {
  let res = str;
  res = res.replace(/bg-\[#12121A\]/g, 'bg-background');
  res = res.replace(/bg-\[#161622\]/g, 'bg-secondary');
  res = res.replace(/border-\[#27273A\]/g, 'border-border');
  res = res.replace(/text-\[#FF5F1F\]/g, 'text-primary');
  res = res.replace(/text-\[#F4F4F5\]/g, 'text-foreground');
  res = res.replace(/bg-\[#FF5F1F\]/g, 'bg-primary');
  res = res.replace(/accent-\[#FF5F1F\]/g, 'accent-primary');
  res = res.replace(/text-zinc-500/g, 'text-muted-foreground');
  res = res.replace(/text-zinc-400/g, 'text-muted-foreground');
  res = res.replace(/text-zinc-300/g, 'text-muted-foreground/80');
  res = res.replace(/text-zinc-200/g, 'text-foreground');
  res = res.replace(/text-zinc-100/g, 'text-foreground');
  res = res.replace(/text-white/g, 'text-foreground');
  return res;
};

newTopPart = applyVariables(newTopPart);
let newBottomPart = applyVariables(bottomPart);

newTopPart = newTopPart.replace(/<header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 shrink-0 shadow-lg relative z-20">/g, 
  '<header className="flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 shrink-0 shadow-lg relative z-20">');

newBottomPart = newBottomPart.replace(/bg-black\/60 backdrop-blur-sm/g, 'bg-black/60 backdrop-blur-md');
newBottomPart = newBottomPart.replace(/bg-background border border-border rounded-xl/g, 'bg-background/90 backdrop-blur-lg border border-border rounded-xl');

// Build the middle layout
const newMiddlePart = `<PanelGroup orientation="horizontal">
          {/* Left Sidebar */}
          {isSidebarOpen && (
            <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col border-r border-border bg-background overflow-hidden relative z-10">
              <Sidebar 
                collections={collections}
                historyList={historyList}
                activeRequestId={activeRequestId}
                populateRequestState={populateRequestState}
                setRenameTarget={setRenameTarget}
                setConfirmDeleteTarget={setConfirmDeleteTarget}
                clearHistory={clearHistory}
                setApiResponse={setApiResponse}
                setActiveSettingsTab={setActiveSettingsTab}
                setShowSettingsModal={setShowSettingsModal}
              />
            </Panel>
          )}

          {isSidebarOpen && (
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize relative z-10" />
          )}

          {/* Main Content Area */}
          <Panel className="flex flex-col min-w-0 bg-background relative">
            <AnimatePresence mode="wait">
              {isRequestActive ? (
                <motion.div 
                  key="active-workspace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col min-h-0 relative z-10 bg-background/50 backdrop-blur-sm"
                >
                  {/* Action Bar */}
                  <div className="p-3 pb-0 shrink-0">
                    <ActionBar 
                      selectedMethod={selectedMethod}
                      setSelectedMethod={setSelectedMethod}
                      urlInput={urlInput}
                      setUrlInput={setUrlInput}
                      activeRequestId={activeRequestId}
                      activeRequestName={activeRequestName}
                      handleSaveAction={handleSaveAction}
                      isLoading={isLoading}
                      handleSendRequest={handleSendRequest}
                      setActiveRequestId={setActiveRequestId}
                      setSaveRequestName={setSaveRequestName}
                      setShowSaveDialog={setShowSaveDialog}
                    />
                  </div>

                  {/* Main Work Area */}
                  <div className="flex-1 flex flex-col min-h-0 p-3 pt-4">
                    <PanelGroup orientation="vertical">
                      {/* Request Pane */}
                      <Panel defaultSize={50} minSize={25} className="flex flex-col min-h-0 pr-0 pb-2">
                        <RequestEditor 
                          activeReqTab={activeReqTab}
                          setActiveReqTab={setActiveReqTab}
                          queryParams={queryParams}
                          headers={headers}
                          handleKeyValueChange={handleKeyValueChange}
                          removeKeyValueRow={removeKeyValueRow}
                          bodyContent={bodyContent}
                          setBodyContent={setBodyContent}
                          authType={authType}
                          setAuthType={setAuthType}
                          authToken={authToken}
                          setAuthToken={setAuthToken}
                        />
                      </Panel>

                      <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize shrink-0 mx-2" />

                      {/* Response Pane */}
                      <Panel defaultSize={50} minSize={25} className="flex flex-col min-h-0 pt-2">
                        <ResponseViewer 
                          apiResponse={apiResponse}
                          responseTab={responseTab}
                          setResponseTab={setResponseTab}
                        />
                      </Panel>
                    </PanelGroup>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty-workspace-canvas"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center bg-background text-foreground p-6 text-center relative select-none"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_60%)] opacity-10 pointer-events-none" />
                  
                  <div className="flex flex-col items-center max-w-sm gap-4 z-10">
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 15px rgba(255,95,31,0.15)", "0 0 25px rgba(255,95,31,0.3)", "0 0 15px rgba(255,95,31,0.15)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-4 bg-primary/10 rounded-full border border-primary/20 text-primary"
                    >
                      <Terminal className="h-10 w-10" />
                    </motion.div>
                    <div>
                      <h2 className="text-lg font-bold tracking-wider text-foreground uppercase font-sans">Welcome to SyncNode</h2>
                      <p className="text-xs text-muted-foreground font-mono mt-1.5 leading-relaxed">
                        Next-generation sandboxed API client gateway. Overcome CORS blocks instantly with proxy routing.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground border border-border rounded-lg p-3 bg-secondary/40 w-full backdrop-blur-md">
                      <div className="text-left">Send Request:</div>
                      <div className="text-right text-primary font-bold">Ctrl + Enter</div>
                      <div className="text-left">Save Action:</div>
                      <div className="text-right text-primary font-bold">Ctrl + S</div>
                    </div>

                    <Button 
                      onClick={() => {
                        setActiveRequestId(null);
                        setActiveRequestName("New Outbound Request");
                        setSelectedMethod("GET");
                        setUrlInput("https://httpbin.org/get");
                        setBodyContent("{\\n  \\n}");
                        setHeaders([{ key: "", value: "", enabled: true }]);
                        setQueryParams([{ key: "", value: "", enabled: true }]);
                        setAuthType("none");
                        setAuthToken("");
                        setIsRequestActive(true);
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 w-full rounded-md shadow-[0_0_12px_rgba(255,95,31,0.2)] mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Create New Request
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </PanelGroup>\n      </main>\n\n      `;

const finalCode = newTopPart + newMiddlePart + newBottomPart;
fs.writeFileSync('src/app/page.tsx', finalCode);
console.log('Successfully refactored page.tsx with manual splits');
