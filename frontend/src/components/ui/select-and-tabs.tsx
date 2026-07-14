import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  let trigger: React.ReactNode = null
  let content: React.ReactNode = null

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === SelectTrigger) {
        trigger = React.cloneElement(child as React.ReactElement<any>, {
          onClick: () => setOpen(!open),
          value,
        })
      } else if (child.type === SelectContent) {
        content = React.cloneElement(child as React.ReactElement<any>, {
          open,
          onSelect: (val: string) => {
            onValueChange?.(val)
            setOpen(false)
          },
        })
      }
    }
  })

  return (
    <div ref={containerRef} className="relative inline-block w-full text-left">
      {trigger}
      {open && content}
    </div>
  )
}

export function SelectTrigger({ className, children, value, ...props }: any) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-border bg-pane px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="truncate">{children || value}</span>
      <span className="ml-2 text-xs text-muted-foreground">▼</span>
    </button>
  )
}

export function SelectValue({ placeholder, className, ...props }: any) {
  return <span className={cn("truncate", className)} {...props} />
}

export function SelectContent({ className, children, open, onSelect, ...props }: any) {
  return (
    <div
      className={cn(
        "absolute right-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-[#161622] p-1 text-foreground shadow-md focus:outline-none",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onClick: () => onSelect?.(child.props.value),
          })
        }
        return child
      })}
    </div>
  )
}

export function SelectItem({ className, children, value, onClick, ...props }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-3 text-sm outline-none hover:bg-primary/20 hover:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function Tabs({ className, children, value, onValueChange, defaultValue, ...props }: any) {
  const [activeTab, setActiveTab] = React.useState(defaultValue || value)
  
  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value)
    }
  }, [value])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    onValueChange?.(val)
  }

  return (
    <div className={cn("flex flex-col h-full", className)} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            onTabChange: handleTabChange,
          })
        }
        return child
      })}
    </div>
  )
}

export function TabsList({ className, children, activeTab, onTabChange, ...props }: any) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-start rounded-md bg-transparent border-b border-border p-0 text-muted-foreground w-full",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            active: activeTab === child.props.value,
            onClick: () => onTabChange?.(child.props.value),
          })
        }
        return child
      })}
    </div>
  )
}

export function TabsTrigger({ className, children, value, active, onClick, ...props }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-b-2 border-transparent text-muted-foreground",
        active && "border-primary text-foreground font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ className, children, value, activeTab, ...props }: any) {
  if (activeTab !== value) return null
  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 overflow-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
