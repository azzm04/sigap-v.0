import { BantuanInfo } from "@/components/ui/bantuan-info";
import { StatCard } from "@/components/ui/stat-card";
import type { KinerjaPengajuanPusat } from "@/lib/gl/ringkasan";

export function persen(bagian: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((bagian / total) * 100)}% dari GL aktif`;
}

export function KartuKinerjaPengajuanPusat({
  data,
}: {
  data: KinerjaPengajuanPusat;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm md:text-base font-semibold text-foreground">
        Kinerja Pengajuan ke Pusat
      </h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={
            <span className="inline-flex text-sm md:text-base items-center gap-1.5">
              Dokumen Belum Lengkap
              <BantuanInfo>
                Tahapan &quot;Verifikasi User&quot; atau &quot;Done&quot;,
                Status Pembayaran &quot;Unpaid&quot;, belum pernah diajukan ke
                pusat sama sekali, dan Laporan Survei TKP + KSKK belum lengkap
                dua-duanya.
              </BantuanInfo>
            </span>
          }
          value={data.dokumenBelumLengkap.toLocaleString("id-ID")}
          tone="warn"
          hint={persen(data.dokumenBelumLengkap, data.totalAktif)}
        />
        <StatCard
          label={
            <span className="inline-flex text-sm md:text-base items-center gap-1.5">
              Siap Diajukan ke Pusat
              <BantuanInfo>
                Tahapan di &quot;Verifikasi User&quot; atau &quot;Done&quot;, Status
                Pembayaran &quot;Unpaid&quot;, Laporan Survei TKP + KSKK sudah lengkap
                dua-duanya. Siap diajukan ke Pusat, tinggal menunggu PIC Pengajuan
                mencatat &quot;Berkas Diajukan Ke Pusat&quot; di halaman detail GL.
              </BantuanInfo>
            </span>
          }
          value={data.siapDiajukanKePusat.toLocaleString("id-ID")}
          hint={persen(data.siapDiajukanKePusat, data.totalAktif)}
        />
        <StatCard
          label={
            <span className="inline-flex text-sm md:text-base items-center gap-1.5">
              Sudah Diajukan ke Pusat
              <BantuanInfo>
                Tahap terkini di halaman Proses Pusat persis &quot;Berkas
                Diajukan Ke Pusat&quot; dan belum lunas -- menunggu konfirmasi
                pembayaran dari Sentralisasi Pembayaran.
              </BantuanInfo>
            </span>
          }
          value={data.sudahDiajukanKePusat.toLocaleString("id-ID")}
          tone="accent"
          hint={persen(data.sudahDiajukanKePusat, data.totalAktif)}
        />
        <StatCard
          label={
            <span className="inline-flex text-sm md:text-base items-center gap-1.5">
              Done
              <BantuanInfo>
                Tahapan &quot;Done&quot; dan Status Pembayaran &quot;Paid&quot;
                lunas baik lewat &quot;Berkas Selesai&quot; di Proses Pusat
                maupun Paid langsung dari impor JRCare tanpa pernah lewat Proses
                Pusat sama sekali.
              </BantuanInfo>
            </span>
          }
          value={data.done.toLocaleString("id-ID")}
          tone="ok"
          hint={persen(data.done, data.totalAktif)}
        />
      </div>
    </div>
  );
}
