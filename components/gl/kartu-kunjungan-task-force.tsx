import { BantuanInfo } from "@/components/ui/bantuan-info";
import { StatCard } from "@/components/ui/stat-card";
import type { KinerjaTaskForce } from "@/lib/gl/ringkasan";

function persenKunjungan(bagian: number, total: number): string {
  if (total === 0) return "0% dari yang harus dikunjungi";
  return `${Math.round((bagian / total) * 100)}% dari yang harus dikunjungi`;
}

export function KartuKunjunganTaskForce({ data }: { data: KinerjaTaskForce }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm md:text-base font-semibold text-foreground">
        Kunjungan PIC Task Force
      </h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={
            <span className="inline-flex text-sm md:text-base items-center gap-1.5">
              Harus Dikunjungi
              <BantuanInfo>
                GL aktif yang tahapannya BELUM sampai &quot;Verifikasi
                User&quot; atau &quot;Done&quot;, jadi masih menjadi tanggung
                jawab PIC Task Force. Begitu GL sampai tahap itu, kunjungan
                dianggap selesai dan giliran PIC Pengajuan -- GL-nya keluar dari
                hitungan ini. Umur GL tidak berpengaruh: berapa pun harinya
                tetap dihitung.
              </BantuanInfo>
            </span>
          }
          value={data.totalHarusDikunjungi.toLocaleString("id-ID")}
          hint="beban kunjungan saat ini"
        />
        <StatCard
          label={
            <span className="inline-flex text-sm md:text-base items-center gap-1.5">
              Sudah Dikunjungi
              <BantuanInfo>
                Tanggal Masuk, Tanggal Pulang Pasien, dan Lokasi LAKA sudah
                terisi tiga-tiganya.
              </BantuanInfo>
            </span>
          }
          value={data.sudahDikunjungi.toLocaleString("id-ID")}
          tone="ok"
          hint={persenKunjungan(
            data.sudahDikunjungi,
            data.totalHarusDikunjungi,
          )}
        />
        <StatCard
          label={
            <span className="inline-flex text-sm md:text-base items-center gap-1.5">
              Belum Dikunjungi
              <BantuanInfo>
                Sisa dari Harus Dikunjungi, yaitu GL yang salah satu dari ketiga
                isian di atas masih kosong. Ini angka pekerjaan yang tersisa
                untuk PIC Task Force.
              </BantuanInfo>
            </span>
          }
          value={data.belumDikunjungi.toLocaleString("id-ID")}
          tone="warn"
          hint={persenKunjungan(
            data.belumDikunjungi,
            data.totalHarusDikunjungi,
          )}
        />
      </div>
    </div>
  );
}
