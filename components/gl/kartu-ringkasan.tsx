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
              {data.totalAktif.toLocaleString("id-ID")} GL berstatus Active
              {data.rincianNonAktif.map((r) => (
                <span key={r.glStatus}>
                  , {r.jumlah.toLocaleString("id-ID")} GL berstatus {r.glStatus}
                </span>
              ))}
              . Dari yang Active,{" "}
              {data.totalMasihTahapAwal.toLocaleString("id-ID")} masih di tahap
              awal (ditangani rumah sakit, belum sampai Verifikasi User) dan{" "}
              {data.totalTahapDipantau.toLocaleString("id-ID")} sudah di tahap
              Verifikasi User/Done (
              {data.rincianTahapDipantau.map((r, i) => (
                <span key={r.tahapan}>
                  {i > 0 && ", "}
                  {r.jumlah.toLocaleString("id-ID")} di &quot;{r.tahapan}&quot;
                </span>
              ))}
              ).
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
              Rata-rata umur (hari ini dikurangi Tgl GL) GL bertipe GL,
              berstatus Active, dan belum dibayar -- semua tahapan, tidak
              disaring lebih jauh.
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
              Total Nilai Disetujui GL bertipe GL, berstatus Active, tahapan
              &quot;Verifikasi User&quot;, dan belum dibayar. Cakupannya beda
              dari Rata-rata Umur Tagihan di samping, yang mencakup semua
              tahapan (bukan cuma &quot;Verifikasi User&quot;).
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
              GL bertipe GL, berstatus Active, dan status pembayarannya
              &quot;Unpaid&quot; -- semua tahapan dihitung, termasuk yang
              masih di tahap awal (ditangani rumah sakit). Rinciannya:
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
            GL berstatus Active dan Unpaid, tahapannya sudah &quot;Verifikasi
            User&quot; atau &quot;Done&quot;, dan umurnya (dihitung dari Tanggal
            Pulang Pasien, atau Tgl GL kalau belum diisi) sudah melewati ambang
            hari peringatan yang diset di halaman Pengaturan. Klik kartu ini
            untuk melihat daftarnya di Papan Peringatan.
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
