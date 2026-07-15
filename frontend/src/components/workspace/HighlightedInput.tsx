import React from "react";

export function HighlightedInput({ value, onChange, placeholder, className }: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
  className?: string;
}) {
  const parts = value.split(/(\{\{[^}]+\}\})/g);

  return (
    <div className="relative w-full h-9">
      {/* Real interactive input element */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-full bg-secondary border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 ${className || ""}`}
        style={{ caretColor: "var(--color-primary)" }}
      />
      {/* Visual highlight overlay, absolute layer positioned directly on top of the input */}
      <div className="absolute inset-0 px-3 py-2 text-xs font-mono pointer-events-none whitespace-pre overflow-hidden text-transparent">
        {parts.map((part, i) => {
          if (part.startsWith("{{") && part.endsWith("}}")) {
            return (
              <span key={i} className="bg-primary/20 text-primary px-0.5 rounded border border-primary/30 font-bold animate-pulse">
                {part}
              </span>
            );
          }
          return <span key={i} className="opacity-0">{part}</span>;
        })}
      </div>
    </div>
  );
}
