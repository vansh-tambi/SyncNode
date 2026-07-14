"use client";

import React, { useState, useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Play, Trash2, Folder, History as HistoryIcon, 
  Settings, Database, ChevronLeft, ChevronRight, Terminal, Check, Save, Edit3, X, Eye, Layers, MoreVertical, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from "@/components/ui/select-and-tabs";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Editor from "@monaco-editor/react";
import { useToast } from "@/components/ui/use-toast";

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

const REQUEST_TABS = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" }
];

const RESPONSE_TABS = [
  { id: "pretty", label: "Pretty" },
  { id: "raw", label: "Raw" },
  { id: "headers", label: "Headers" }
];

function HighlightedInput({ value, onChange, placeholder, className }: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
  className?: string;
}) {
  const parts = value.split(/(\{\{[^}]+\}\})/g);

  return (
    <div className="relative w-full h-9 bg-[#161622] border border-[#27273A] rounded-md focus-within:border-primary/50 overflow-hidden flex items-center">
      <div className={`absolute inset-0 px-3 py-2 text-xs font-mono pointer-events-none whitespace-pre overflow-hidden flex items-center text-transparent ${className}`}>
        {parts.map((part, i) => {
          if (part.startsWith("{{") && part.endsWith("}}")) {
            return (
              <span key={i} className="bg-primary/20 text-[#FF5F1F] px-0.5 rounded border border-primary/30 font-bold animate-pulse">
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-full bg-transparent px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none relative z-10 ${className}`}
        style={{ color: "rgba(244, 244, 245, 0.95)", caretColor: "#FF5F1F" }}
      />
    </div>
  );
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

  // Layout responsiveness
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        fetch("http://127.0.0.1:8000/api/collections"),
        fetch("http://127.0.0.1:8000/api/environments"),
        fetch("http://127.0.0.1:8000/api/history")
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
      const res = await fetch("http://127.0.0.1:8000/api/history");
      if (res.ok) setHistoryList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/history", { method: "DELETE" });
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
      const res = await fetch("http://127.0.0.1:8000/api/environments", {
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
      const res = await fetch(`http://127.0.0.1:8000/api/environments/${editingEnv.id}/variables`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/environments/variables/${varId}`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/environments/variables/${varId}`, {
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
        const res = await fetch(`http://127.0.0.1:8000/api/requests/${activeRequestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          toast({ title: "Request Updated", description: "Successfully updated state in SQLite.", variant: "success" });
          const colUpdate = await fetch("http://127.0.0.1:8000/api/collections");
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
        const colRes = await fetch("http://127.0.0.1:8000/api/collections", {
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
      const res = await fetch("http://127.0.0.1:8000/api/requests", {
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

        const colUpdate = await fetch("http://127.0.0.1:8000/api/collections");
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
        ? `http://127.0.0.1:8000/api/collections/${renameTarget.id}`
        : `http://127.0.0.1:8000/api/requests/${renameTarget.id}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameTarget.name.trim() })
      });

      if (res.ok) {
        toast({ title: "Item Renamed", description: `Updated name to: ${renameTarget.name}`, variant: "success" });
        setRenameTarget(null);
        const colUpdate = await fetch("http://127.0.0.1:8000/api/collections");
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
        ? `http://127.0.0.1:8000/api/collections/${confirmDeleteTarget.id}`
        : `http://127.0.0.1:8000/api/requests/${confirmDeleteTarget.id}`;

      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted Successfully", description: "Cleared record from SQLite database.", variant: "success" });
        
        if (confirmDeleteTarget.type === "request" && activeRequestId === confirmDeleteTarget.id) {
          setActiveRequestId(null);
          setActiveRequestName("");
          setIsRequestActive(false);
        }

        setConfirmDeleteTarget(null);
        const colUpdate = await fetch("http://127.0.0.1:8000/api/collections");
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
      const response = await fetch("http://127.0.0.1:8000/api/runner/execute", {
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
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const getStatusCodeClass = (status: number) => {
    if (status >= 200 && status < 300) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status >= 400) return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  };

  const selectedEnvName = environments.find(e => e.id === activeEnvId)?.name || "Select Environment";

  return (
    <div className="flex flex-col h-screen bg-[#12121A] text-[#F4F4F5] font-sans selection:bg-primary/30 select-none overflow-hidden relative">
      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b border-[#27273A] bg-[#12121A] px-4 shrink-0 shadow-lg relative z-20">
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/5 border border-[#27273A] lg:hidden">
            <Layers className="h-4 w-4 text-[#FF5F1F]" />
          </Button>
          <div className="p-1.5 bg-[#FF5F1F]/10 rounded-lg text-primary border border-primary/20 shadow-[0_0_10px_rgba(255,95,31,0.15)] hidden sm:block">
            <Terminal className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-white">SyncNode</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono hidden sm:inline">v1.0.0 // Core</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-64 sm:w-96">
          <div className="text-xs text-muted-foreground font-mono whitespace-nowrap hidden sm:inline">ENV:</div>
          <Select value={selectedEnvName} onValueChange={(val) => {
            const found = environments.find(e => e.name === val);
            if (found) setActiveEnvId(found.id);
          }}>
            <SelectTrigger className="w-full bg-[#161622] border-[#27273A] text-xs h-8 text-foreground">
              {selectedEnvName}
            </SelectTrigger>
            <SelectContent className="bg-[#161622] border-[#27273A]">
              {environments.map((env) => (
                <SelectItem key={env.id} value={env.name}>
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => {
            if (environments.length > 0) setEditingEnv(environments[0]);
            setShowEnvModal(true);
          }} size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/5 border border-[#27273A] shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Workspace Area */}
      <main className="flex-1 flex min-h-0 relative">
        <PanelGroup direction="horizontal">
          {/* Left Sidebar */}
          {isSidebarOpen && (
            <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col border-r border-[#27273A] bg-[#12121A] overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0 relative">
                <Tabs defaultValue="collections" className="flex-grow flex flex-col min-h-0">
                  <div className="flex items-center justify-between px-3 border-b border-[#27273A] shrink-0 bg-[#161622]/40">
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
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2 border border-dashed border-[#27273A] rounded-lg">
                            <Folder className="h-8 w-8 text-zinc-800" />
                            <span className="text-[10px] font-mono uppercase tracking-wider">No Saved Collections</span>
                          </div>
                        ) : (
                          collections.map((col) => (
                            <div key={col.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer py-1 group px-1 rounded hover:bg-white/5 animate-in fade-in relative">
                                <span className="truncate flex items-center gap-1.5">
                                  <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                  {col.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <DropdownMenu trigger={
                                    <button className="text-zinc-500 hover:text-white p-0.5"><MoreVertical className="h-3.5 w-3.5" /></button>
                                  }>
                                    <DropdownMenuItem onClick={() => setRenameTarget({ type: "collection", id: col.id, name: col.name })}>Rename</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setConfirmDeleteTarget({ type: "collection", id: col.id })} className="text-red-400 hover:bg-red-950/20">Delete</DropdownMenuItem>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <div className="pl-4 space-y-0.5 border-l border-[#27273A]/80 ml-2.5">
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
                                      <span className="truncate text-zinc-300 hover:text-white">{req.name}</span>
                                    </div>
                                    <DropdownMenu trigger={
                                      <button className="text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 p-0.5"><MoreVertical className="h-3 w-3" /></button>
                                    }>
                                      <DropdownMenuItem onClick={() => setRenameTarget({ type: "request", id: req.id, name: req.name })}>Rename</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setConfirmDeleteTarget({ type: "request", id: req.id })} className="text-red-400 hover:bg-red-950/20">Delete</DropdownMenuItem>
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
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#27273A]/50">
                          <span className="text-[10px] text-zinc-500 font-mono">LOG ENTRIES</span>
                          {historyList.length > 0 && (
                            <button onClick={clearHistory} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1">
                              <Trash2 className="h-3 w-3" /> Clear
                            </button>
                          )}
                        </div>
                        {historyList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2 border border-dashed border-[#27273A] rounded-lg">
                            <HistoryIcon className="h-8 w-8 text-zinc-800 animate-pulse" />
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
                              className="flex flex-col gap-1 p-2 hover:bg-[#161622] rounded border border-transparent hover:border-[#27273A] cursor-pointer transition-all animate-in fade-in"
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getMethodBadgeClass(hist.method)}`}>
                                  {hist.method}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">{hist.response_time_ms}ms</span>
                              </div>
                              <span className="text-xs truncate text-zinc-300 font-mono">{hist.url}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>

                {/* Footer Settings Gear */}
                <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-[#27273A] bg-[#12121A] flex items-center px-3 justify-between z-10 shrink-0">
                  <Button 
                    onClick={() => {
                      setActiveSettingsTab("themes");
                      setShowSettingsModal(true);
                    }}
                    variant="ghost" 
                    size="sm" 
                    className="h-7 hover:bg-white/5 border border-transparent hover:border-[#27273A] gap-1 text-xs text-zinc-400"
                  >
                    <Settings className="h-3.5 w-3.5" /> Preferences
                  </Button>
                  <span className="text-[9px] font-mono text-zinc-600">Shortcuts: Ctrl+Enter</span>
                </div>
              </div>
            </Panel>
          )}

          {isSidebarOpen && (
            <PanelResizeHandle className="w-1 bg-[#27273A] hover:bg-[#FF5F1F]/50 transition-colors cursor-col-resize relative z-10" />
          )}

          {/* Main Canvas Area */}
          <Panel className="flex flex-col min-w-0 bg-[#12121A]">
            <AnimatePresence mode="wait">
              {isRequestActive ? (
                <motion.div 
                  key="active-request-builder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <PanelGroup direction="vertical">
                    {/* Top Half: Request Builder */}
                    <Panel defaultSize={50} minSize={30} className="flex flex-col min-h-0 bg-[#12121A] p-4">
                      <div className="flex flex-col h-full space-y-4">
                        {/* Action Bar */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 bg-[#161622] border border-[#27273A] rounded-lg p-2 focus-within:border-primary/50 transition-colors shrink-0">
                          <div className="flex items-center gap-2 flex-1">
                            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                              <SelectTrigger className="w-24 bg-transparent border-0 text-xs h-7 text-foreground font-bold shadow-none">
                                {selectedMethod}
                              </SelectTrigger>
                              <SelectContent className="bg-[#161622] border-[#27273A]">
                                {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                                  <SelectItem key={m} value={m}>
                                    <span className={`text-xs font-bold ${selectedMethod === m ? "text-primary" : ""}`}>
                                      {m}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="h-6 w-px bg-[#27273A]" />
                            <div className="flex-1">
                              <HighlightedInput
                                value={urlInput}
                                onChange={setUrlInput}
                                placeholder="Enter request URL..."
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 shrink-0 border-t border-[#27273A]/50 md:border-0 pt-2 md:pt-0">
                            {activeRequestId && (
                              <span className="text-[10px] font-mono text-zinc-500 border border-[#27273A] rounded px-2 py-1 max-w-[120px] truncate">
                                {activeRequestName}
                              </span>
                            )}
                            
                            <div className="flex items-center gap-px border border-[#27273A] rounded-md overflow-hidden bg-transparent">
                              <Button 
                                onClick={handleSaveAction}
                                variant="ghost"
                                className="text-xs h-8 hover:bg-white/5 gap-1 text-zinc-300 px-3 rounded-none border-0"
                              >
                                <Save className="h-3.5 w-3.5" /> Save
                              </Button>
                              <DropdownMenu trigger={
                                <button className="text-zinc-400 hover:text-white p-2 border-l border-[#27273A] h-8 flex items-center justify-center bg-transparent"><ChevronRight className="h-3 w-3 rotate-90" /></button>
                              }>
                                <DropdownMenuItem onClick={() => {
                                  setActiveRequestId(null);
                                  setSaveRequestName(`${activeRequestName} Copy`);
                                  setShowSaveDialog(true);
                                }} disabled={!activeRequestId}>
                                  Save As...
                                </DropdownMenuItem>
                              </DropdownMenu>
                            </div>

                            <Button 
                              onClick={handleSendRequest}
                              disabled={isLoading}
                              className="bg-[#FF5F1F] hover:bg-[#FF5F1F]/90 text-white font-bold h-8 px-4 rounded-md shadow-[0_0_10px_rgba(255,95,31,0.25)] flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" /> {isLoading ? "Sending..." : "SEND"}
                            </Button>
                          </div>
                        </div>

                        {/* Sub-tabs */}
                        <div className="flex-1 flex flex-col min-h-0">
                          <div className="flex border-b border-[#27273A] bg-[#161622]/20 rounded-t-lg shrink-0 overflow-hidden relative">
                            {REQUEST_TABS.map((tab) => {
                              const isActive = activeReqTab === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => setActiveReqTab(tab.id)}
                                  className="relative px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-white transition-colors duration-150"
                                >
                                  <span className={isActive ? "text-white font-bold" : ""}>
                                    {tab.label}
                                  </span>
                                  {isActive && (
                                    <motion.div
                                      layoutId="liquid-underline"
                                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5F1F]"
                                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex-1 p-4 bg-[#161622]/10 border border-t-0 border-[#27273A] rounded-b-lg overflow-y-auto min-h-0">
                            {/* Params & Headers Table Grid */}
                            {(activeReqTab === "params" || activeReqTab === "headers") && (
                              <div className="space-y-3">
                                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                                  {activeReqTab === "params" ? "Query Parameters" : "Request Headers"}
                                </span>
                                <div className="border border-[#27273A] rounded-lg overflow-hidden bg-[#161622]/30 overflow-x-auto">
                                  <table className="w-full border-collapse text-left min-w-[500px]">
                                    <thead>
                                      <tr className="border-b border-[#27273A] bg-[#161622]/50 text-[10px] font-mono text-zinc-400">
                                        <th className="p-2 w-12 text-center">Active</th>
                                        <th className="p-2 w-1/3 border-r border-[#27273A]">Key</th>
                                        <th className="p-2">Value</th>
                                        <th className="p-2 w-12 text-center"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(activeReqTab === "params" ? queryParams : headers).map((item, idx) => (
                                        <tr key={idx} className="border-b border-[#27273A]/40 last:border-b-0 hover:bg-[#161622]/20">
                                          <td className="p-1.5 text-center">
                                            <input 
                                              type="checkbox"
                                              checked={item.enabled}
                                              onChange={(e) => handleKeyValueChange(idx, "enabled", e.target.checked, activeReqTab)}
                                              className="h-3 w-3 accent-[#FF5F1F] rounded"
                                            />
                                          </td>
                                          <td className="p-1.5 border-r border-[#27273A]">
                                            <input 
                                              placeholder="key"
                                              value={item.key}
                                              onChange={(e) => handleKeyValueChange(idx, "key", e.target.value, activeReqTab)}
                                              className="w-full bg-transparent border-0 text-xs font-mono focus:ring-0 focus:outline-none text-zinc-200"
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
                                                className="text-zinc-600 hover:text-red-400 transition-colors"
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
                                <span className="text-[10px] font-mono text-zinc-500 uppercase mb-2">JSON Body (Raw)</span>
                                <div className="flex-1 min-h-[180px] border border-[#27273A] rounded-lg overflow-hidden">
                                  <Editor
                                    height="100%"
                                    defaultLanguage="json"
                                    theme="vs-dark"
                                    value={bodyContent}
                                    onChange={(val) => setBodyContent(val || "")}
                                    options={{
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
                                <span className="text-[10px] font-mono text-zinc-500 uppercase">Authorization Configuration</span>
                                <div className="grid gap-3">
                                  <Select value={authType} onValueChange={setAuthType}>
                                    <SelectTrigger className="bg-[#161622] border-[#27273A] text-xs h-9">
                                      {authType === "bearer" ? "Bearer Token" : "No Auth"}
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#161622] border-[#27273A]">
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
                      </div>
                    </Panel>

                    {/* Vertical Drag Resizer */}
                    <PanelResizeHandle className="h-1 bg-[#27273A] hover:bg-[#FF5F1F]/50 transition-colors cursor-row-resize relative z-10" />

                    {/* Bottom Half: Response Viewer */}
                    <Panel defaultSize={50} minSize={25} className="flex flex-col min-h-0 bg-[#12121A] p-4">
                      <div className="flex flex-col h-full space-y-3">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between shrink-0 bg-[#161622]/40 border border-[#27273A] rounded-lg px-4 py-2">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-zinc-400">Response:</span>
                            {apiResponse ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getStatusCodeClass(apiResponse.status_code)}`}>
                                {apiResponse.status_code}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500 font-mono italic">No Request Sent</span>
                            )}
                          </div>
                          {apiResponse && (
                            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 animate-in fade-in">
                              <span>Time: <span className="text-primary font-bold">{apiResponse.time_ms} ms</span></span>
                              <span className="h-3 w-px bg-[#27273A]" />
                              <span>Size: <span className="text-primary font-bold">{(apiResponse.size_bytes / 1024).toFixed(2)} KB</span></span>
                            </div>
                          )}
                        </div>

                        {/* Response content */}
                        <div className="flex-1 flex flex-col min-h-0 font-mono">
                          <Tabs defaultValue="pretty" className="flex-1 flex flex-col min-h-0">
                            <div className="flex border-b border-[#27273A] bg-[#161622]/20 rounded-t-lg shrink-0 overflow-hidden relative">
                              {RESPONSE_TABS.map((tab) => {
                                const isActive = responseTab === tab.id;
                                return (
                                  <button
                                    key={tab.id}
                                    onClick={() => setResponseTab(tab.id)}
                                    className="relative px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-white transition-colors duration-150"
                                  >
                                    <span className={isActive ? "text-white font-bold" : ""}>
                                      {tab.label}
                                    </span>
                                    {isActive && (
                                      <motion.div
                                        layoutId="response-liquid-underline"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5F1F]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex-1 bg-[#161622]/20 border border-t-0 border-[#27273A] rounded-b-lg overflow-y-auto min-h-0 font-mono text-xs relative">
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
                                          padding: { top: 8 }
                                        }}
                                      />
                                    )}

                                    {responseTab === "raw" && (
                                      <pre className="text-zinc-200 p-4 leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
                                        {apiResponse.body}
                                      </pre>
                                    )}

                                    {responseTab === "headers" && (
                                      <div className="p-4 space-y-1">
                                        {Object.entries(apiResponse.headers || {}).map(([k, v]) => (
                                          <div key={k} className="flex border-b border-[#27273A]/30 py-1.5 last:border-b-0">
                                            <span className="w-1/3 text-zinc-500 font-semibold">{k}</span>
                                            <span className="w-2/3 text-zinc-300">{String(v)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                                    <Terminal className="h-8 w-8 animate-pulse text-zinc-700" />
                                    <span className="text-xs uppercase tracking-widest font-mono">Ready to Transmit Data...</span>
                                  </div>
                                )}
                              </AnimatePresence>
                            </div>
                          </Tabs>
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
                </motion.div>
              ) : (
                // Cyberpunk Empty Canvas State
                <motion.div 
                  key="empty-workspace-canvas"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center bg-[#12121A] text-[#F4F4F5] p-6 text-center relative select-none"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,95,31,0.04),transparent_60%)] pointer-events-none" />
                  
                  <div className="flex flex-col items-center max-w-sm gap-4 z-10">
                    <div className="p-4 bg-primary/10 rounded-full border border-primary/20 animate-pulse shadow-[0_0_15px_rgba(255,95,31,0.15)] text-primary">
                      <Terminal className="h-10 w-10" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-wider text-white uppercase font-sans">Welcome to SyncNode</h2>
                      <p className="text-xs text-zinc-500 font-mono mt-1.5 leading-relaxed">
                        Next-generation sandboxed API client gateway. Overcome CORS blocks instantly with proxy routing.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500 border border-[#27273A]/80 rounded-lg p-3 bg-[#161622]/40 w-full">
                      <div className="text-left">Send Request:</div>
                      <div className="text-right text-primary font-bold">Ctrl + Enter</div>
                      <div className="text-left">Save Action:</div>
                      <div className="text-right text-primary font-bold">Ctrl + S</div>
                    </div>

                    <Button 
                      onClick={() => {
                        // Create basic brand new request state
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
                      className="bg-[#FF5F1F] hover:bg-[#FF5F1F]/90 text-white font-bold h-9 w-full rounded-md shadow-[0_0_12px_rgba(255,95,31,0.2)] mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Create New Request
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </PanelGroup>
      </main>

      {/* dialog overlays */}

      {/* 1. Save Request Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#12121A] border border-[#27273A] rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold uppercase tracking-wider text-white">Save Current Request</span>
              <button onClick={() => setShowSaveDialog(false)} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Request Display Name</span>
              <input
                placeholder="e.g. Fetch Current User"
                value={saveRequestName}
                onChange={(e) => setSaveRequestName(e.target.value)}
                className="bg-[#161622] border border-[#27273A] rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Target Collection</span>
                <button onClick={() => setShowNewColInput(!showNewColInput)} className="text-[10px] text-[#FF5F1F] hover:underline">
                  {showNewColInput ? "Select Existing" : "+ New Collection"}
                </button>
              </div>

              {showNewColInput ? (
                <input
                  placeholder="New Collection Name"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="bg-[#161622] border border-[#27273A] rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
                />
              ) : (
                <Select value={String(selectedColId)} onValueChange={(val) => setSelectedColId(Number(val))}>
                  <SelectTrigger className="bg-[#161622] border-[#27273A] text-xs h-9">
                    {collections.find(c => c.id === selectedColId)?.name || "Select Collection..."}
                  </SelectTrigger>
                  <SelectContent className="bg-[#161622] border-[#27273A]">
                    {collections.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => setShowSaveDialog(false)} variant="ghost" className="text-xs h-9">Cancel</Button>
              <Button onClick={handleSaveRequest} className="bg-[#FF5F1F] hover:bg-[#FF5F1F]/90 text-white text-xs h-9 font-bold px-4">
                Confirm Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Environments Modal Overlay */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#12121A] border border-[#27273A] rounded-xl w-full max-w-4xl h-[550px] p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center shrink-0 pb-4 border-b border-[#27273A]">
              <span className="text-sm font-bold uppercase tracking-wider text-white">Environment Variable Configuration</span>
              <button onClick={() => setShowEnvModal(false)} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 flex min-h-0 pt-4 overflow-hidden">
              {/* Env Left Sidebar */}
              <div className="w-1/3 border-r border-[#27273A] pr-4 flex flex-col gap-3">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Environments</span>
                <div className="flex gap-2 shrink-0">
                  <input
                    placeholder="Env Name"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    className="flex-1 bg-[#161622] border border-[#27273A] rounded px-2.5 py-1 text-xs font-mono w-full"
                  />
                  <Button onClick={handleCreateEnvironment} size="sm" className="bg-[#FF5F1F] text-xs h-7 hover:bg-[#FF5F1F]/95">
                    Add
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {environments.map(env => (
                    <div
                      key={env.id}
                      onClick={() => setEditingEnv(env)}
                      className={`flex justify-between items-center text-xs p-2 rounded cursor-pointer transition-all ${
                        editingEnv?.id === env.id ? "bg-[#FF5F1F]/15 border border-[#FF5F1F]/30 text-white font-bold" : "hover:bg-white/5 text-zinc-400"
                      }`}
                    >
                      <span className="truncate">{env.name}</span>
                      {activeEnvId === env.id && <Check className="h-3 w-3 text-[#FF5F1F]" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables Main panel */}
              <div className="w-2/3 pl-4 flex flex-col min-h-0">
                {editingEnv ? (
                  <div className="flex-1 flex flex-col min-h-0 gap-3">
                    <div className="flex justify-between items-center shrink-0">
                      <span className="text-xs font-bold text-zinc-200">Variables for: {editingEnv.name}</span>
                      <Button onClick={handleAddEnvVariable} size="sm" variant="ghost" className="h-7 border border-[#27273A] text-xs">
                        + Add Variable
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-[#27273A] text-[10px] font-mono text-zinc-500">
                            <th className="pb-2 w-8">Active</th>
                            <th className="pb-2 w-1/3">Key</th>
                            <th className="pb-2">Value</th>
                            <th className="pb-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingEnv.variables?.map(v => (
                            <tr key={v.id} className="border-b border-[#27273A]/30 last:border-b-0 hover:bg-[#161622]/10">
                              <td className="py-2">
                                <input
                                  type="checkbox"
                                  checked={v.enabled}
                                  onChange={(e) => handleUpdateEnvVariable(v.id, v.key, v.value, e.target.checked)}
                                  className="h-3 w-3 accent-[#FF5F1F]"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  value={v.key}
                                  onChange={(e) => handleUpdateEnvVariable(v.id, e.target.value, v.value, v.enabled)}
                                  className="w-full bg-transparent border-0 text-xs font-mono focus:outline-none text-zinc-200"
                                />
                              </td>
                              <td className="py-2">
                                <input
                                  value={v.value}
                                  onChange={(e) => handleUpdateEnvVariable(v.id, v.key, e.target.value, v.enabled)}
                                  className="w-full bg-transparent border-0 text-xs font-mono focus:outline-none text-zinc-200"
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
                  <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#12121A] border border-[#27273A] rounded-xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">Confirm Deletion</span>
            <p className="text-xs text-zinc-400 font-mono">
              Are you sure you want to delete this {confirmDeleteTarget.type}? Doing so will remove the record permanently.
            </p>
            <div className="flex justify-end gap-2 shrink-0">
              <Button onClick={() => setConfirmDeleteTarget(null)} variant="ghost" className="text-xs h-8">Cancel</Button>
              <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3 font-bold">
                Delete Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Rename Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#12121A] border border-[#27273A] rounded-xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Rename {renameTarget.type}</span>
            <input
              value={renameTarget.name}
              onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
              className="bg-[#161622] border border-[#27273A] rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
            />
            <div className="flex justify-end gap-2 shrink-0">
              <Button onClick={() => setRenameTarget(null)} variant="ghost" className="text-xs h-8">Cancel</Button>
              <Button onClick={handleRenameConfirm} className="bg-[#FF5F1F] hover:bg-[#FF5F1F]/90 text-white text-xs h-8 px-3 font-bold">
                Confirm Rename
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Settings Modal (Coming Soon Placeholders) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#12121A] border border-[#27273A] rounded-xl w-full max-w-2xl h-[400px] p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-[#27273A] shrink-0">
              <span className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Settings className="h-4 w-4" /> System Preferences
              </span>
              <button onClick={() => setShowSettingsModal(false)} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-grow flex pt-4 min-h-0">
              {/* Settings navigation */}
              <div className="w-1/4 border-r border-[#27273A] pr-4 flex flex-col gap-1.5 shrink-0">
                {["themes", "shortcuts", "workspaces"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSettingsTab(tab)}
                    className={`text-xs p-2 text-left rounded cursor-pointer transition-all ${
                      activeSettingsTab === tab ? "bg-primary/10 border-l-2 border-primary text-white font-bold" : "text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Settings content (coming soon panels) */}
              <div className="w-3/4 pl-6 flex flex-col justify-center items-center text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-zinc-900 border border-[#27273A] rounded-full text-zinc-500 animate-pulse">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Feature Coming Soon</span>
                  <p className="text-[10px] text-zinc-500 font-mono max-w-xs">
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
