import { formatWaktu } from "@/lib/format";
import type { KartuRingkasan } from "@/lib/gl/ringkasan";

function Kartu({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold text-foreground">{nilai}</span>
    </div>
  );
}

export function KartuRingkasanGL({ data }: { data: KartuRingkasan }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Kartu label="Total GL" nilai={data.totalGL.toLocaleString("id-ID")} />
      <Kartu label="Belum Dibayar" nilai={data.totalUnpaid.toLocaleString("id-ID")} />
      <Kartu label="Perlu Ditinjau" nilai={data.totalPeringatan.toLocaleString("id-ID")} />
      <Kartu
        label="Data Terakhir Diperbarui"
        nilai={data.diimporTerakhir ? formatWaktu(data.diimporTerakhir) : "-"}
      />
    </div>
  );
}
