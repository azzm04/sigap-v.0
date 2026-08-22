function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-xl flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {meta && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-info-bg px-2.5 py-1 text-xs whitespace-nowrap text-primary">
            {meta}
          </span>
        )}
        {actions}
      </div>
    </div>
  )
}

export { PageHeader }
