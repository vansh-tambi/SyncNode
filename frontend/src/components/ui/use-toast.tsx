import * as React from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

interface ToastContextType {
  toasts: Toast[]
  toast: (options: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback(({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, description, variant }])
    
    setTimeout(() => {
      dismiss(id)
    }, 4500)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full flex-col gap-1 rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
              t.variant === "destructive"
                ? "bg-red-950/90 border-red-800 text-red-200"
                : t.variant === "success"
                ? "bg-emerald-950/90 border-emerald-800 text-emerald-200"
                : "bg-[#161622]/95 border-[#27273A] text-zinc-100"
            }`}
          >
            {t.title && <div className="text-xs font-bold font-sans uppercase tracking-wider">{t.title}</div>}
            {t.description && <div className="text-xs text-zinc-400 font-mono">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
