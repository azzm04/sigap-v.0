import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-status-neutral-bg text-muted-foreground",
        info: "bg-status-info-bg text-primary",
        ok: "bg-status-safe-bg text-status-safe",
        warn: "bg-status-near-bg text-status-near",
        danger: "bg-status-late-bg text-status-late",
        solidOk: "bg-status-safe text-white",
      },
      pill: {
        true: "rounded-full px-2.5",
        false: "",
      },
    },
    defaultVariants: {
      tone: "neutral",
      pill: false,
    },
  }
)

function Badge({
  className,
  tone,
  pill,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone, pill, className }))} {...props} />
  )
}

export { Badge, badgeVariants }
