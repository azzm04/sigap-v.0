import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderApp } from "@/app/header-app";
import { ambilDetailGL, ambilRiwayatTahapan } from "@/lib/gl/detail";
import { ambilTinjauan } from "@/lib/gl/tinjauan";
import { formatRupiah, formatTanggal, formatWaktu, hitungUmurHari } from "@/lib/format";
import { tandaiDitinjau } from "./actions";

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value === null || value === "" ? "-" : value}</dd>
    </div>
  );
}

function formatTanggalOpsional(iso: string | null): string {
  return iso ? formatTanggal(iso) : "-";
}

export default async function DetailGLPage({
  params,
}: {
  params: Promise<{ idJaminan: string }>;
}) {
  const { idJaminan: idMentah } = await params;
  const idJaminan = decodeURIComponent(idMentah);

  const [detail, riwayat, catatanTinjauan] = await Promise.all([
    ambilDetailGL(idJaminan),
    ambilRiwayatTahapan(idJaminan),
    ambilTinjauan(idJaminan),
  ]);

  if (!detail) notFound();

  const umurHari = hitungUmurHari(detail.tglGl);

  return (
    <div className="min-h-screen bg-background">
      <HeaderApp />

      <main className="flex flex-col gap-6 p-6">
        <Link href="/" className="text-sm text-muted-foreground underline">
          ← Kembali ke daftar GL
        </Link>

        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">{detail.namaKorban}</h2>
            <span className="text-sm text-muted-foreground">Umur GL: {umurHari} hari</span>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Nomor ID Jaminan" value={detail.idJaminan} />
            <Field label="Nomor Surat Jaminan" value={detail.nomorSuratJaminan} />
            <Field label="Loket" value={detail.loket} />
            <Field label="Nama Rumah Sakit" value={detail.namaRumahSakit} />
            <Field label="Tipe Klaim" value={detail.tipeKlaim} />
            <Field label="Tipe Cidera" value={detail.tipeCidera} />
            <Field label="Status GL" value={detail.glStatus} />
            <Field label="Tahapan" value={detail.tahapan} />
            <Field label="Status Verifikasi" value={detail.statusVerifikasi} />
            <Field label="Status Pembayaran" value={detail.statusPembayaran} />
            <Field label="Tgl GL" value={formatTanggal(detail.tglGl)} />
            <Field label="Tgl Diajukan" value={formatTanggalOpsional(detail.tglDiajukan)} />
            <Field label="Tgl Verifikasi" value={formatTanggalOpsional(detail.tglVerifikasi)} />
            <Field label="Tgl Pembayaran" value={formatTanggalOpsional(detail.tglPembayaran)} />
            <Field label="Nilai Diajukan" value={formatRupiah(detail.nilaiDiajukan)} />
            <Field label="Nilai Disetujui" value={formatRupiah(detail.nilaiDisetujui)} />
            <Field label="Jumlah Pembayaran" value={formatRupiah(detail.jumlahPembayaran)} />
          </dl>

          <p className="text-xs text-muted-foreground">
            Data diimpor terakhir: {formatWaktu(detail.diimporPada)}
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">Riwayat Tahapan</h3>

          {riwayat.length <= 1 && (
            <p className="text-sm text-muted-foreground">
              Riwayat baru mulai tercatat sejak GL ini pertama kali diimpor ke SIGAP. Belum ada
              perubahan tahapan yang tercatat di luar keadaan saat ini.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dicatat pada</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tahapan</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Status Verifikasi
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Status Pembayaran
                  </th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{formatWaktu(r.direkamPada)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.tahapan}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.statusVerifikasi ?? "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.statusPembayaran}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">Tinjauan Petugas</h3>

          <form
            action={tandaiDitinjau}
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <input type="hidden" name="idJaminan" value={detail.idJaminan} />
            <label htmlFor="catatan" className="text-sm font-medium text-foreground">
              Catatan
            </label>
            <textarea
              id="catatan"
              name="catatan"
              required
              rows={3}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
              placeholder="Catatan hasil peninjauan GL ini..."
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="perluTindakLanjut" className="h-4 w-4" />
              Perlu tindak lanjut
            </label>
            <button
              type="submit"
              className="mt-1 h-8 w-fit rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Tandai Sudah Ditinjau
            </button>
          </form>

          {catatanTinjauan.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada catatan tinjauan untuk GL ini.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {catatanTinjauan.map((c) => (
                <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {c.namaPengguna} — {formatWaktu(c.ditinjauPada)}
                    </span>
                    <span className="flex gap-2">
                      {c.diabaikan && (
                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-destructive">
                          Diabaikan
                        </span>
                      )}
                      {c.perluTindakLanjut && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                          Perlu tindak lanjut
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground">{c.catatan}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
