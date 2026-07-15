"use client";

import React, { useState, useEffect, useRef } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Settings, Terminal, Check, X, ShieldAlert, Trash2, Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Tabs, TabsList, TabsTrigger, TabsContent
} from "@/components/ui/select-and-tabs";
import { useToast } from "@/components/ui/use-toast";
import { ActionBar } from "@/components/workspace/ActionBar";
import { RequestEditor } from "@/components/workspace/RequestEditor";
import { ResponseViewer } from "@/components/workspace/ResponseViewer";
import { CollectionsTab } from "@/components/workspace/CollectionsTab";
import { HistoryTab } from "@/components/workspace/HistoryTab";
import { HighlightedInput } from "@/components/workspace/HighlightedInput";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Editor from "@monaco-editor/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://syncnode-muu3.onrender.com";

interface KeyValuePair {
  id?: number;
  key: string;
  value: string;
  enabled: boolean;
}

interface Collection {
  id: number;
  name: string;
  description?: string;
  requests: any[];
}

interface Environment {
  id: number;
  name: string;
  is_active: boolean;
  variables: any[];
}

export default function Home() {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState("GET");
  const [urlInput, setUrlInput] = useState("https://httpbin.org/get");
  const [activeReqTab, setActiveReqTab] = useState("params");
  const [responseTab, setResponseTab] = useState("pretty");

  // State identifying active loaded request
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [activeRequestName, setActiveRequestName] = useState<string>("");
  const [isRequestActive, setIsRequestActive] = useState<boolean>(false);

  // Main Tab Navigation
  const [activeMainTab, setActiveMainTab] = useState<"workspace" | "collections" | "history">("workspace");

  // Collections & Environments
  const [collections, setCollections] = useState<Collection[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<number | null>(null);

  // Key-Value States
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>([{ key: "", value: "", enabled: true }]);
  const [headers, setHeaders] = useState<KeyValuePair[]>([{ key: "", value: "", enabled: true }]);
  const [bodyContent, setBodyContent] = useState<string>("{\n  \n}");
  const [authType, setAuthType] = useState("none");
  const [authToken, setAuthToken] = useState("");

  // History Log
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Response States
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any | null>(null);

  // Modals/Dialogs control
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveRequestName, setSaveRequestName] = useState("");
  const [selectedColId, setSelectedColId] = useState<number | "">("");
  const [showNewColInput, setShowNewColInput] = useState(false);
  const [newColName, setNewColName] = useState("");

  const [showEnvModal, setShowEnvModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [newEnvName, setNewEnvName] = useState("");

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("themes");

  // CRUD confirmation overlays
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{ type: "collection" | "request"; id: number } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: "collection" | "request"; id: number; name: string } | null>(null);

  const isUpdatingUrl = useRef(false);
  const isUpdatingParams = useRef(false);

  // Keyboard Shortcuts (Ctrl+Enter / Cmd+Enter for Send, Ctrl+S for Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === "Enter") {
        e.preventDefault();
        if (isRequestActive) {
          handleSendRequest();
        }
      }
      if (modifier && e.key === "s") {
        e.preventDefault();
        if (isRequestActive) {
          handleSaveAction();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRequestActive, urlInput, selectedMethod, queryParams, headers, bodyContent, authType, authToken, activeRequestId, activeRequestName]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [colRes, envRes, histRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/collections`),
        fetch(`${API_BASE_URL}/api/environments`),
        fetch(`${API_BASE_URL}/api/history`)
      ]);

      if (colRes.ok) setCollections(await colRes.json());
      if (envRes.ok) {
        const envData = await envRes.json();
        setEnvironments(envData);
        if (envData.length > 0) {
          const active = envData.find((e: any) => e.is_active);
          setActiveEnvId(active ? active.id : envData[0].id);
        }
      }
      if (histRes.ok) setHistoryList(await histRes.json());
    } catch (e) {
      console.error("Failed fetching initial server logs:", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`);
      if (res.ok) setHistoryList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`, { method: "DELETE" });
      if (res.ok) {
        setHistoryList([]);
        toast({ title: "History Cleared", description: "Successfully purged tracking DB logs.", variant: "success" });
      }
    } catch (e) {
      toast({ title: "Clear Failed", description: "Database clear failure.", variant: "destructive" });
    }
  };

  // Sync Params Table to URL Query Params
  useEffect(() => {
    if (isUpdatingUrl.current) return;
    try {
      isUpdatingParams.current = true;
      const urlObj = new URL(urlInput.startsWith("http") ? urlInput : `https://${urlInput}`);
      const searchParams = Array.from(urlObj.searchParams.entries());

      const updatedParams = searchParams.map(([key, value]) => ({
        key,
        value,
        enabled: true
      }));

      updatedParams.push({ key: "", value: "", enabled: true });
      setQueryParams(updatedParams);
    } catch (e) {
      // Ignore URL assembly errors during user typing
    } finally {
      isUpdatingParams.current = false;
    }
  }, [urlInput]);

  const updateUrlFromParams = (currentParams: KeyValuePair[]) => {
    if (isUpdatingParams.current) return;
    try {
      isUpdatingUrl.current = true;
      const urlObj = new URL(urlInput.startsWith("http") ? urlInput : `https://${urlInput}`);
      const newSearchParams = new URLSearchParams();

      currentParams.forEach((param) => {
        if (param.enabled && param.key) {
          newSearchParams.append(param.key, param.value);
        }
      });

      urlObj.search = newSearchParams.toString();
      const finalUrl = newSearchParams.toString() ? urlObj.toString() : urlObj.origin + urlObj.pathname;
      setUrlInput(finalUrl);
    } catch (e) {
      // Ignore partial malformed urls
    } finally {
      isUpdatingUrl.current = false;
    }
  };

  // Key Value Table updates
  const handleKeyValueChange = (
    index: number,
    field: "key" | "value" | "enabled",
    val: any,
    type: "params" | "headers"
  ) => {
    const list = type === "params" ? [...queryParams] : [...headers];
    const item = { ...list[index], [field]: val };
    list[index] = item;

    if (index === list.length - 1 && (item.key || item.value)) {
      list.push({ key: "", value: "", enabled: true });
    }

    if (type === "params") {
      setQueryParams(list);
      updateUrlFromParams(list);
    } else {
      setHeaders(list);
    }
  };

  const removeKeyValueRow = (index: number, type: "params" | "headers") => {
    const list = type === "params" ? [...queryParams] : [...headers];
    if (list.length > 1) {
      list.splice(index, 1);
      if (type === "params") {
        setQueryParams(list);
        updateUrlFromParams(list);
      } else {
        setHeaders(list);
      }
    }
  };

  // Environment variables CRUD
  const handleCreateEnvironment = async () => {
    if (!newEnvName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/environments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEnvName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setEnvironments([...environments, data]);
        setNewEnvName("");
        setEditingEnv(data);
        setActiveEnvId(data.id);
        toast({ title: "Environment Created", description: `Added ${data.name}.`, variant: "success" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to create environment.", variant: "destructive" });
    }
  };

  const handleAddEnvVariable = async () => {
    if (!editingEnv) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/environments/${editingEnv.id}/variables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "new_var", value: "value", enabled: true })
      });
      if (res.ok) {
        const newVar = await res.json();
        const updated = { ...editingEnv, variables: [...editingEnv.variables, newVar] };
        setEditingEnv(updated);
        setEnvironments(environments.map(e => e.id === editingEnv.id ? updated : e));
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not add variable.", variant: "destructive" });
    }
  };

  const handleUpdateEnvVariable = async (varId: number, key: string, value: string, enabled: boolean) => {
    if (!editingEnv) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/environments/variables/${varId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, enabled })
      });
      if (res.ok) {
        const updatedVar = await res.json();
        const updated = {
          ...editingEnv,
          variables: editingEnv.variables.map(v => v.id === varId ? updatedVar : v)
        };
        setEditingEnv(updated);
        setEnvironments(environments.map(e => e.id === editingEnv.id ? updated : e));
      }
    } catch (e) {}
  };

  const handleDeleteEnvVariable = async (varId: number) => {
    if (!editingEnv) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/environments/variables/${varId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const updated = {
          ...editingEnv,
          variables: editingEnv.variables.filter(v => v.id !== varId)
        };
        setEditingEnv(updated);
        setEnvironments(environments.map(e => e.id === editingEnv.id ? updated : e));
      }
    } catch (e) {}
  };

  // Saved Request mutations
  const handleSaveAction = async () => {
    if (activeRequestId) {
      const headerMap: Record<string, string> = {};
      headers.forEach(h => { if (h.key && h.enabled) headerMap[h.key] = h.value; });

      const payload = {
        name: activeRequestName,
        method: selectedMethod,
        url: urlInput,
        headers: headerMap,
        body: bodyContent,
        auth_type: authType === "none" ? null : authType,
        auth_data: authType === "bearer" ? { token: authToken } : {}
      };

      try {
        const res = await fetch(`${API_BASE_URL}/api/requests/${activeRequestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          toast({ title: "Request Updated", description: "Successfully updated state in SQLite.", variant: "success" });
          const colUpdate = await fetch(`${API_BASE_URL}/api/collections`);
          if (colUpdate.ok) setCollections(await colUpdate.json());
        }
      } catch (e) {
        toast({ title: "Update Failed", description: "Could not save edits.", variant: "destructive" });
      }
    } else {
      setShowSaveDialog(true);
    }
  };

  const handleSaveRequest = async () => {
    let colId = selectedColId;
    if (showNewColInput && newColName.trim()) {
      try {
        const colRes = await fetch(`${API_BASE_URL}/api/collections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newColName.trim() })
        });
        if (colRes.ok) {
          const newCol = await colRes.json();
          setCollections([...collections, newCol]);
          colId = newCol.id;
        }
      } catch (e) {
        toast({ title: "Failed", description: "Could not create collection.", variant: "destructive" });
        return;
      }
    }

    if (!colId || !saveRequestName.trim()) {
      toast({ title: "Validation Error", description: "Provide request name & collection.", variant: "destructive" });
      return;
    }

    const headerMap: Record<string, string> = {};
    headers.forEach(h => { if (h.key && h.enabled) headerMap[h.key] = h.value; });

    const payload = {
      collection_id: colId,
      name: saveRequestName.trim(),
      method: selectedMethod,
      url: urlInput,
      headers: headerMap,
      query_params: {},
      body_type: "raw",
      body: bodyContent,
      auth_type: authType === "none" ? null : authType,
      auth_data: authType === "bearer" ? { token: authToken } : {},
      order: 0
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setActiveRequestId(data.id);
        setActiveRequestName(data.name);

        toast({ title: "Request Saved", description: `${saveRequestName} added to collection DB.`, variant: "success" });
        setShowSaveDialog(false);
        setSaveRequestName("");
        setNewColName("");
        setShowNewColInput(false);

        const colUpdate = await fetch(`${API_BASE_URL}/api/collections`);
        if (colUpdate.ok) setCollections(await colUpdate.json());
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed saving request details.", variant: "destructive" });
    }
  };

  // Rename Mutation logic
  const handleRenameConfirm = async () => {
    if (!renameTarget || !renameTarget.name.trim()) return;
    try {
      const url = renameTarget.type === "collection" 
        ? `${API_BASE_URL}/api/collections/${renameTarget.id}`
        : `${API_BASE_URL}/api/requests/${renameTarget.id}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameTarget.name.trim() })
      });

      if (res.ok) {
        toast({ title: "Item Renamed", description: `Updated name to: ${renameTarget.name}`, variant: "success" });
        setRenameTarget(null);
        const colUpdate = await fetch(`${API_BASE_URL}/api/collections`);
        if (colUpdate.ok) setCollections(await colUpdate.json());
      }
    } catch (e) {
      toast({ title: "Rename Failed", description: "Operation error.", variant: "destructive" });
    }
  };

  // Delete Mutation logic
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteTarget) return;
    try {
      const url = confirmDeleteTarget.type === "collection"
        ? `${API_BASE_URL}/api/collections/${confirmDeleteTarget.id}`
        : `${API_BASE_URL}/api/requests/${confirmDeleteTarget.id}`;

      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted Successfully", description: "Cleared record from SQLite database.", variant: "success" });
        
        if (confirmDeleteTarget.type === "request" && activeRequestId === confirmDeleteTarget.id) {
          setActiveRequestId(null);
          setActiveRequestName("");
          setIsRequestActive(false);
        }

        setConfirmDeleteTarget(null);
        const colUpdate = await fetch(`${API_BASE_URL}/api/collections`);
        if (colUpdate.ok) setCollections(await colUpdate.json());
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: "Database clear failure.", variant: "destructive" });
    }
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    setApiResponse(null);

    const headerMap: Record<string, string> = {};
    headers.forEach(h => {
      if (h.key && h.enabled) headerMap[h.key] = h.value;
    });

    const payload = {
      method: selectedMethod,
      url: urlInput,
      headers: headerMap,
      query_params: {},
      body_type: "raw",
      body: bodyContent,
      auth_type: authType === "none" ? null : authType,
      auth_data: authType === "bearer" ? { token: authToken } : {},
      environment_id: activeEnvId
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/runner/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setApiResponse(data);
      fetchHistory(); // Optimistic updates

      if (data.error_message) {
        toast({ title: "Execution Error", description: data.error_message, variant: "destructive" });
      } else {
        toast({ title: "Response Received", description: `Code: ${data.status_code} in ${data.time_ms}ms`, variant: "success" });
      }
    } catch (err: any) {
      toast({ title: "Connection Failed", description: err.message || "Gateway unreachable.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const populateRequestState = (req: any) => {
    setActiveRequestId(req.id || null);
    setActiveRequestName(req.name || "");
    setIsRequestActive(true);
    setSelectedMethod(req.method);
    setUrlInput(req.url);
    setBodyContent(req.body || "{}");
    setAuthType(req.auth_type || "none");
    setAuthToken(req.auth_data?.token || "");

    const headersList = Object.entries(req.headers || {}).map(([k, v]) => ({
      key: k,
      value: String(v),
      enabled: true
    }));
    headersList.push({ key: "", value: "", enabled: true });
    setHeaders(headersList);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "POST": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "DELETE": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-zinc-500/10 text-muted-foreground border-zinc-500/20";
    }
  };

  const getStatusCodeClass = (status: number) => {
    if (status >= 200 && status < 300) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status >= 400) return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-zinc-500/10 text-muted-foreground border-zinc-500/20";
  };

  const selectedEnvName = environments.find(e => e.id === activeEnvId)?.name || "Select Environment";

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans selection:bg-primary/30 select-none overflow-hidden relative">
      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 shrink-0 shadow-lg relative z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary border border-primary/20 shadow-[0_0_10px_rgba(255,95,31,0.15)]">
            <Terminal className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-foreground">SyncNode</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono hidden sm:inline">v1.0.0 // Core</span>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-secondary/50 border border-border/80 rounded-lg p-0.5 z-30">
          {([
            { id: "workspace", label: "Workspace" },
            { id: "collections", label: "Collections" },
            { id: "history", label: "History" }
          ] as const).map((tab) => {
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id)}
                className={`text-xs px-3.5 py-1.5 rounded-md font-bold transition-all ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-[0_0_8px_rgba(255,95,31,0.2)]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {tab.label.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 w-64 sm:w-96 justify-end">
          <div className="text-xs text-muted-foreground font-mono whitespace-nowrap hidden sm:inline">ENV:</div>
          <div className="w-40">
            <Select value={selectedEnvName} onValueChange={(val) => {
              const found = environments.find(e => e.name === val);
              if (found) setActiveEnvId(found.id);
            }}>
              <SelectTrigger className="w-full bg-secondary border-border text-xs h-8 text-foreground">
                {selectedEnvName}
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.name}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Environments Settings Gear */}
          <Button 
            onClick={() => {
              if (environments.length > 0) setEditingEnv(environments[0]);
              setShowEnvModal(true);
            }} 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 hover:bg-white/5 border border-border shrink-0 text-muted-foreground hover:text-foreground"
            title="Environment Variables Configuration"
          >
            <Sliders className="h-4 w-4" />
          </Button>

          {/* Preferences System settings gear */}
          <Button 
            onClick={() => {
              setActiveSettingsTab("themes");
              setShowSettingsModal(true);
            }} 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 hover:bg-white/5 border border-border shrink-0 text-muted-foreground hover:text-foreground"
            title="System Preferences"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Workspace Area */}
      <main className="flex-1 flex min-h-0 relative bg-background">
        <AnimatePresence mode="wait">
          {activeMainTab === "workspace" && (
            <motion.div
              key="workspace-view"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {isRequestActive ? (
                <div className="flex-1 flex flex-col min-h-0 relative z-10 bg-background/50 backdrop-blur-sm">
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
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-background text-foreground p-6 text-center relative select-none">
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
                        setBodyContent("{\n  \n}");
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
                </div>
              )}
            </motion.div>
          )}

          {activeMainTab === "collections" && (
            <motion.div
              key="collections-view"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <CollectionsTab 
                collections={collections}
                populateRequestState={populateRequestState}
                setRenameTarget={setRenameTarget}
                setConfirmDeleteTarget={setConfirmDeleteTarget}
                setActiveMainTab={(tab: any) => setActiveMainTab(tab)}
                onCreateRequestClick={() => {
                  setActiveRequestId(null);
                  setActiveRequestName("New Outbound Request");
                  setSelectedMethod("GET");
                  setUrlInput("https://httpbin.org/get");
                  setBodyContent("{\n  \n}");
                  setHeaders([{ key: "", value: "", enabled: true }]);
                  setQueryParams([{ key: "", value: "", enabled: true }]);
                  setAuthType("none");
                  setAuthToken("");
                  setIsRequestActive(true);
                  setActiveMainTab("workspace");
                }}
              />
            </motion.div>
          )}

          {activeMainTab === "history" && (
            <motion.div
              key="history-view"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <HistoryTab 
                historyList={historyList}
                clearHistory={clearHistory}
                populateRequestState={populateRequestState}
                setApiResponse={setApiResponse}
                setActiveMainTab={(tab: any) => setActiveMainTab(tab)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* dialog overlays */}

      {/* 1. Save Request Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-background/90 backdrop-blur-lg border border-border rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold uppercase tracking-wider text-foreground">Save Current Request</span>
              <button onClick={() => setShowSaveDialog(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Request Display Name</span>
              <input
                placeholder="e.g. Fetch Current User"
                value={saveRequestName}
                onChange={(e) => setSaveRequestName(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">Target Collection</span>
                <button onClick={() => setShowNewColInput(!showNewColInput)} className="text-[10px] text-primary hover:underline">
                  {showNewColInput ? "Select Existing" : "+ New Collection"}
                </button>
              </div>

              {showNewColInput ? (
                <input
                  placeholder="New Collection Name"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none"
                />
              ) : (
                <Select value={String(selectedColId)} onValueChange={(val) => setSelectedColId(Number(val))}>
                  <SelectTrigger className="bg-secondary border-border text-xs h-9">
                    {collections.find(c => c.id === selectedColId)?.name || "Select Collection..."}
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
                    {collections.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setShowSaveDialog(false)} variant="ghost" className="text-xs h-9">Cancel</Button>
              <Button onClick={handleSaveRequest} className="bg-primary hover:bg-primary/90 text-foreground text-xs h-9 font-bold px-4">
                Confirm Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Environments Modal Overlay */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-background/90 backdrop-blur-lg border border-border rounded-xl w-full max-w-4xl h-[550px] p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center shrink-0 pb-4 border-b border-border">
              <span className="text-sm font-bold uppercase tracking-wider text-foreground">Environment Variable Configuration</span>
              <button onClick={() => setShowEnvModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 flex min-h-0 pt-4 overflow-hidden">
              {/* Env Left Sidebar */}
              <div className="w-1/3 border-r border-border pr-4 flex flex-col gap-3">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">Environments</span>
                <div className="flex gap-2 shrink-0">
                  <input
                    placeholder="Env Name"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    className="flex-1 bg-secondary border border-border rounded px-2.5 py-1 text-xs font-mono w-full"
                  />
                  <Button onClick={handleCreateEnvironment} size="sm" className="bg-primary text-xs h-7 hover:bg-primary/95">
                    Add
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {environments.map(env => (
                    <div
                      key={env.id}
                      onClick={() => setEditingEnv(env)}
                      className={`flex justify-between items-center text-xs p-2 rounded cursor-pointer transition-all ${
                        editingEnv?.id === env.id ? "bg-primary/15 border border-[#FF5F1F]/30 text-foreground font-bold" : "hover:bg-white/5 text-muted-foreground"
                      }`}
                    >
                      <span className="truncate">{env.name}</span>
                      {activeEnvId === env.id && <Check className="h-3 w-3 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables Main panel */}
              <div className="w-2/3 pl-4 flex flex-col min-h-0">
                {editingEnv ? (
                  <div className="flex-1 flex flex-col min-h-0 gap-3">
                    <div className="flex justify-between items-center shrink-0">
                      <span className="text-xs font-bold text-foreground">Variables for: {editingEnv.name}</span>
                      <Button onClick={handleAddEnvVariable} size="sm" variant="ghost" className="h-7 border border-border text-xs">
                        + Add Variable
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border text-[10px] font-mono text-muted-foreground">
                            <th className="pb-2 w-8">Active</th>
                            <th className="pb-2 w-1/3">Key</th>
                            <th className="pb-2">Value</th>
                            <th className="pb-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingEnv.variables?.map(v => (
                            <tr key={v.id} className="border-b border-border/30 last:border-b-0 hover:bg-secondary/10">
                              <td className="py-2">
                                <input
                                  type="checkbox"
                                  checked={v.enabled}
                                  onChange={(e) => handleUpdateEnvVariable(v.id, v.key, v.value, e.target.checked)}
                                  className="h-3 w-3 accent-primary"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  value={v.key}
                                  onChange={(e) => handleUpdateEnvVariable(v.id, e.target.value, v.value, v.enabled)}
                                  className="w-full bg-transparent border-0 text-xs font-mono focus:outline-none text-foreground"
                                />
                              </td>
                              <td className="py-2">
                                <input
                                  value={v.value}
                                  onChange={(e) => handleUpdateEnvVariable(v.id, v.key, e.target.value, v.enabled)}
                                  className="w-full bg-transparent border-0 text-xs font-mono focus:outline-none text-foreground"
                                />
                              </td>
                              <td className="py-2 text-right">
                                <button onClick={() => handleDeleteEnvVariable(v.id)} className="text-zinc-600 hover:text-red-400">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
                    Select an environment to configure variables
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Alert Dialog */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-background/90 backdrop-blur-lg border border-border rounded-xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">Confirm Deletion</span>
            <p className="text-xs text-muted-foreground font-mono">
              Are you sure you want to delete this {confirmDeleteTarget.type}? Doing so will remove the record permanently.
            </p>
            <div className="flex justify-end gap-2 shrink-0">
              <Button onClick={() => setConfirmDeleteTarget(null)} variant="ghost" className="text-xs h-8">Cancel</Button>
              <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-foreground text-xs h-8 px-3 font-bold">
                Delete Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Rename Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-background/90 backdrop-blur-lg border border-border rounded-xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Rename {renameTarget.type}</span>
            <input
              value={renameTarget.name}
              onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none"
            />
            <div className="flex justify-end gap-2 shrink-0">
              <Button onClick={() => setRenameTarget(null)} variant="ghost" className="text-xs h-8">Cancel</Button>
              <Button onClick={handleRenameConfirm} className="bg-primary hover:bg-primary/90 text-foreground text-xs h-8 px-3 font-bold">
                Confirm Rename
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Settings Modal (Coming Soon Placeholders) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-background/90 backdrop-blur-lg border border-border rounded-xl w-full max-w-2xl h-[400px] p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-border shrink-0">
              <span className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Settings className="h-4 w-4" /> System Preferences
              </span>
              <button onClick={() => setShowSettingsModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-grow flex pt-4 min-h-0">
              {/* Settings navigation */}
              <div className="w-1/4 border-r border-border pr-4 flex flex-col gap-1.5 shrink-0">
                {["themes", "shortcuts", "workspaces"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSettingsTab(tab)}
                    className={`text-xs p-2 text-left rounded cursor-pointer transition-all ${
                      activeSettingsTab === tab ? "bg-primary/10 border-l-2 border-primary text-foreground font-bold" : "text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Settings content (coming soon panels) */}
              <div className="w-3/4 pl-6 flex flex-col justify-center items-center text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-zinc-900 border border-border rounded-full text-muted-foreground animate-pulse">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Feature Coming Soon</span>
                  <p className="text-[10px] text-muted-foreground font-mono max-w-xs">
                    This settings panel tab configuration is currently scheduled for the next minor release.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
