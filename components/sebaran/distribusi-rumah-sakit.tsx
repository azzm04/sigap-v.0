import type { SebaranRumahSakit } from "@/lib/gl/sebaran";

export function DistribusiRumahSakit({ data }: { data: SebaranRumahSakit[] }) {
  const maks = data.reduce((m, d) => Math.max(m, d.jumlah), 0) || 1;

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada data rumah sakit dari GL aktif.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((d) => (
        <div key={`${d.namaRumahSakit}-${d.loket}`} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm text-foreground">{d.namaRumahSakit}</span>
            <span className="shrink-0 font-mono text-sm text-primary">
              {d.jumlah.toLocaleString("id-ID")} GL
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-chart-bar"
              style={{ width: `${Math.max(2, (d.jumlah / maks) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
