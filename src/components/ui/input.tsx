import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base layout
        "h-10 w-full min-w-0 rounded-lg px-3 py-2 text-sm transition-all outline-none",
        // Default appearance (theme-aware)
        "border border-border bg-card text-foreground",
        // Placeholder — explicit muted so it's always readable
        "placeholder:text-muted-foreground",
        // Focus ring
        "focus-visible:border-purple-500/60 focus-visible:ring-2 focus-visible:ring-purple-500/20",
        // File input
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid state
        "aria-invalid:border-red-500/60 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
