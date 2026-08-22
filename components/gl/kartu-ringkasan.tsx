import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { formatWaktu } from "@/lib/format";
import type { KartuRingkasan } from "@/lib/gl/ringkasan";

// Susunan mobile/tablet sengaja TIDAK diubah (masih grid-cols-2 dua-dua
// lalu "Data Terakhir Diperbarui" full-width di baris terakhir seperti
// sebelumnya) — permintaan redesign ini eksplisit hanya untuk tampilan
// desktop. Di lg: ke atas, urutan visual disusun ulang lewat lg:order
// tanpa mengubah urutan DOM, supaya markup & perilaku mobile tetap sama
// persis: baris 1 jadi Total GL + Data Terakhir Diperbarui (masing-masing
// separuh lebar), baris 2 jadi Belum Dibayar + Perlu Ditinjau + Rata-rata
// Umur Tagihan (masing-masing sepertiga lebar).
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
