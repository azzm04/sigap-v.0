import Link from "next/link";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { StatCard } from "@/components/ui/stat-card";
import { formatWaktu } from "@/lib/format";
import type { KartuRingkasan } from "@/lib/gl/ringkasan";

export function KartuRingkasanGL({ data }: { data: KartuRingkasan }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
      <StatCard
        label={
          <span className="inline-flex items-center gap-1.5">
            Total GL
            <BantuanInfo>
              {data.totalAktif.toLocaleString("id-ID")} GL berstatus Active
              {data.rincianNonAktif.map((r) => (
                <span key={r.glStatus}>
                  , {r.jumlah.toLocaleString("id-ID")} GL berstatus {r.glStatus}
                </span>
              ))}
              . Dari yang Active, {data.totalMasihTahapAwal.toLocaleString("id-ID")} masih di tahap
              awal (ditangani rumah sakit, belum sampai Verifikasi User) dan{" "}
              {data.totalTahapDipantau.toLocaleString("id-ID")} sudah di tahap Verifikasi
              User/Done.
            </BantuanInfo>
          </span>
        }
        value={data.totalGL.toLocaleString("id-ID")}
        className="text-sm md:text-base lg:order-1 lg:col-span-3"
      />
      <StatCard
        label="Rata-rata Umur Tagihan (hari)"
        value={data.rataRataUmurTagihan.toFixed(2)}
        tone="accent"
        className=" text-sm md:text-base lg:order-5 lg:col-span-2"
      />
      <StatCard
        label="Belum Dibayar"
        value={data.totalUnpaid.toLocaleString("id-ID")}
        tone="warn"
        className="text-sm md:text-base lg:order-3 lg:col-span-2"
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
        className="text-sm md:text-base col-span-2 lg:order-2 lg:col-span-3"
      />
    </div>
  );
}
