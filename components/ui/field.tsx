import { cn } from "@/lib/utils"

function Field({
  label,
  value,
  mono = false,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  mono?: boolean
  className?: string
}) {
  const kosong = value === null || value === undefined || value === ""

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs font-semibold text-muted-foreground sm:text-sm">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 min-w-0 break-words whitespace-normal text-sm leading-relaxed text-foreground sm:text-base",
          mono && "font-mono",
          kosong && "text-muted-foreground"
        )}
      >
        {kosong ? "-" : value}
      </dd>
    </div>
  )
}

export { Field }