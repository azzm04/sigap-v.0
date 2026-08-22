import { cn } from "@/lib/utils"

function Select({
  className,
  options,
  placeholder,
  children,
  ...props
}: React.ComponentProps<"select"> & {
  options?: { value: string; label: string }[] | string[]
  placeholder?: string
}) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-8 appearance-none rounded-lg border border-input bg-transparent bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%236b7280%27%20stroke-width=%272.5%27%20stroke-linecap=%27round%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-[right_8px_center] bg-no-repeat px-2.5 py-1 pr-7 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map((o) => {
        const value = typeof o === "string" ? o : o.value
        const label = typeof o === "string" ? o : o.label
        return (
          <option key={value} value={value}>
            {label}
          </option>
        )
      })}
      {children}
    </select>
  )
}

export { Select }
