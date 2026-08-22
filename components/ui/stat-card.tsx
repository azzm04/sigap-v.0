import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const valueVariants = cva("font-mono text-4xl font-extrabold tracking-tight", {
  variants: {
    tone: {
      default: "text-foreground",
      danger: "text-status-late",
      warn: "text-status-near",
      ok: "text-status-safe",
      accent: "text-primary",
    },
  },
  defaultVariants: { tone: "default" },
})

const glowVariants = cva(
  "absolute -top-4 -right-4 size-24 rounded-full blur-xl transition-all group-hover:bg-opacity-100",
  {
    variants: {
      tone: {
        danger: "bg-status-late/3 group-hover:bg-status-late/7",
        warn: "bg-status-near/3 group-hover:bg-status-near/7",
        ok: "bg-status-safe/3 group-hover:bg-status-safe/7",
        accent: "bg-primary/3 group-hover:bg-primary/7",
      },
    },
  },
)

const borderVariants = cva("", {
  variants: {
    tone: {
      default: "border-border",
      danger: "border-status-late/30",
      warn: "border-status-near/20",
      ok: "border-status-safe/20",
      accent: "border-primary/20",
    },
  },
  defaultVariants: { tone: "default" },
})

// Kartu netral (mis. "Data Terakhir Diperbarui") sengaja tanpa glow —
// dekorasi ini menandai kartu yang punya makna status, bukan hiasan umum.
const shadowKhususTone: Record<string, string> = {
  danger: "shadow-[0_0_15px_rgba(217,45,32,0.06)]",
}

function StatCard({
  label,
  value,
  hint,
  tone,
  mono = true,
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof valueVariants> & {
    label: React.ReactNode
    value: React.ReactNode
    hint?: React.ReactNode
    mono?: boolean
  }) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "group relative flex min-h-32 flex-col justify-between gap-1 overflow-hidden rounded-xl border bg-card p-5 shadow-sm",
        borderVariants({ tone }),
        tone && shadowKhususTone[tone],
        className,
      )}
      {...props}
    >
      {tone && tone !== "default" && <div className={cn(glowVariants({ tone }))} />}
      <span className="relative z-10 text-sm font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "relative z-10",
          valueVariants({ tone }),
          !mono && "font-sans text-2xl sm:text-4xl",
        )}
      >
        {value}
      </span>
      {hint && <span className="relative z-10 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export { StatCard }
