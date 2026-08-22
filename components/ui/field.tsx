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
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm text-foreground", mono && "font-mono", kosong && "text-muted-foreground")}>
        {kosong ? "-" : value}
      </dd>
    </div>
  )
}

export { Field }
