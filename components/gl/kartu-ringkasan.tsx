import Link from "next/link";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { StatCard } from "@/components/ui/stat-card";
import { formatRupiah, formatWaktu } from "@/lib/format";
import type { KartuRingkasan } from "@/lib/gl/ringkasan";

export function KartuRingkasanGL({ data }: { data: KartuRingkasan }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-8">
      <StatCard
        label={
          <span className="inline-flex items-center gap-1.5">
            Total GL
            <BantuanInfo>
              {data.totalAktif.toLocaleString("id-ID")} GL berstatus Active (
              {data.totalMasihTahapAwal.toLocaleString("id-ID")} masih di tahap
              awal, ditangani rumah sakit, belum sampai Verifikasi User
              {data.rincianTahapDipantau.map((r) => (
                <span key={r.tahapan}>
                  {" "}
                  + {r.jumlah.toLocaleString("id-ID")} di {r.tahapan}
                </span>
              ))}
              ) dan{" "}
              {data.rincianNonAktif.map((r, i) => (
                <span key={r.glStatus}>
                  {i > 0 && ", "}
                  {r.jumlah.toLocaleString("id-ID")} GL berstatus {r.glStatus}
                </span>
              ))}
              .
            </BantuanInfo>
          </span>
        }
        value={data.totalGL.toLocaleString("id-ID")}
        className="text-sm md:text-base lg:order-1 lg:col-span-4"
      />
      <StatCard
        label={
          <span className="inline-flex items-center gap-1.5">
            Rata-rata Umur GL (hari)
            <BantuanInfo>
              GL Active dengan status &quot;Unpaid&quot; terhitung dari tanggal
              terbit GL
            </BantuanInfo>
          </span>
        }
        value={data.rataRataUmurTagihan.toFixed(2)}
        tone="accent"
        className=" text-sm md:text-base lg:order-5 lg:col-span-2"
      />
      <StatCard
        label={
          <span className="inline-flex items-center gap-1.5">
            Tagihan Klaim Belum Dibayar
            <BantuanInfo>
              Nominal GL Active status &quot;Unpaid&quot; yang telah disetujui
              JRCare.
            </BantuanInfo>
          </span>
        }
        value={formatRupiah(data.totalTagihanBelumDibayar)}
        tone="accent"
        className="col-span-2 text-sm md:order-5 md:col-span-1 md:text-base lg:order-6 lg:col-span-2"
      />
      <StatCard
        label={
          <span className="inline-flex items-center gap-1.5">
            Belum Dibayar
            <BantuanInfo>
              GL Active dengan status &quot;Unpaid&quot;. Rinciannya:
              {data.rincianUnpaidPerTahapan.map((r) => (
                <span key={r.tahapan}>
                  , {r.jumlah.toLocaleString("id-ID")} di &quot;{r.tahapan}
                  &quot;
                </span>
              ))}
              .
            </BantuanInfo>
          </span>
        }
        value={data.totalUnpaid.toLocaleString("id-ID")}
        tone="warn"
        className="text-sm md:text-base lg:order-3 lg:col-span-2"
      />
      <div className="relative lg:order-4 lg:col-span-2">
        <Link
          href="/peringatan"
          className="block h-full rounded-xl transition-shadow hover:shadow-[0_0_15px_rgba(217,45,32,0.15)]"
        >
          <StatCard
            label="Perlu Ditinjau"
            value={data.totalPeringatan.toLocaleString("id-ID")}
            tone="danger"
            className="h-full"
          />
        </Link>
        {/* Di luar <Link>, sengaja -- BantuanInfo memunculkan tombol
            popover, dan menaruh tombol di dalam elemen <a> itu tidak valid
            (HTML tidak mengizinkan konten interaktif bersarang) dan akan
            ikut memicu navigasi setiap kali diklik. */}
        <div className="absolute top-5 right-5 z-20">
          <BantuanInfo>
            GL Active dengan status &quot;Unpaid&quot; yang sudah terbit lebih
            dari batas ambang hari &quot;{data.ambangHari} hari&quot;. Klik
            tombol ini untuk melihat daftar GL yang perlu ditinjau.
          </BantuanInfo>
        </div>
      </div>
      <StatCard
        label="Data Terakhir Diperbarui"
        value={data.diimporTerakhir ? formatWaktu(data.diimporTerakhir) : "-"}
        mono={false}
        className="text-sm md:text-base col-span-2 md:order-6 md:col-span-1 lg:order-2 lg:col-span-4"
      />
    </div>
  );
}
