import { cn } from "@/lib/utils";

function Card({
  title,
  description,
  actions,
  float = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  float?: boolean;
}) {
  return (
    <section
      data-slot="card"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm",
        float && "rounded-float border-transparent p-8 shadow-float",
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3">
          {title && (
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          )}
          {actions}
        </header>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </section>
  );
}

export { Card };
