import { cn } from "@/lib/utils"

function Checkbox({
  label,
  className,
  id,
  ...props
}: React.ComponentProps<"input"> & { label?: React.ReactNode }) {
  const input = (
    <input
      type="checkbox"
      data-slot="checkbox"
      id={id}
      className={cn("size-4 accent-primary", className)}
      {...props}
    />
  )

  if (!label) return input

  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 text-sm text-foreground select-none"
    >
      {input}
      {label}
    </label>
  )
}

export { Checkbox }
