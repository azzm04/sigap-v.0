import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { formatWaktu } from "@/lib/format";
import type { KartuRingkasan } from "@/lib/gl/ringkasan";

export function KartuRingkasanGL({ data }: { data: KartuRingkasan }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
      <StatCard
        label="Total GL"
        value={data.totalGL.toLocaleString("id-ID")}
        className="lg:order-1 lg:col-span-3"
      />
      <StatCard
        label="Rata-rata Umur Tagihan (hari)"
        value={data.rataRataUmurTagihan.toFixed(2)}
        tone="accent"
        className="lg:order-5 lg:col-span-2"
      />
      <StatCard
        label="Belum Dibayar"
        value={data.totalUnpaid.toLocaleString("id-ID")}
        tone="warn"
        className="lg:order-3 lg:col-span-2"
      />
      <Link
        href="/peringatan"
        className="rounded-xl transition-shadow hover:shadow-[0_0_15px_rgba(217,45,32,0.15)] lg:order-4 lg:col-span-2"
      >
        <StatCard
          label="Perlu Ditinjau"
          value={data.totalPeringatan.toLocaleString("id-ID")}
          tone="danger"
          className="h-full"
        />
      </Link>
      <StatCard
        label="Data Terakhir Diperbarui"
        value={data.diimporTerakhir ? formatWaktu(data.diimporTerakhir) : "-"}
        mono={false}
        className="col-span-2 lg:order-2 lg:col-span-3"
      />
    </div>
  );
}
