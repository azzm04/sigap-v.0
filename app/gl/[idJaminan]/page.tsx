import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { ambilDetailGL, ambilRiwayatTahapan } from "@/lib/gl/detail";
import { hitungStagnasi } from "@/lib/gl/stagnasi";
import { ambilTinjauan } from "@/lib/gl/tinjauan";
import { formatRupiah, formatTanggal, formatWaktu, hitungUmurHari } from "@/lib/format";
import { tandaiDitinjau } from "./actions";

function formatTanggalOpsional(iso: string | null): string {
  return iso ? formatTanggal(iso) : "-";
}

export default async function DetailGLPage({
  params,
  searchParams,
}: {
  params: Promise<{ idJaminan: string }>;
  searchParams: Promise<{ dari?: string }>;
}) {
  const { idJaminan: idMentah } = await params;
  const idJaminan = decodeURIComponent(idMentah);
  const { dari } = await searchParams;
  const dariPeringatan = dari === "peringatan";

  const [detail, riwayat, catatanTinjauan] = await Promise.all([
    ambilDetailGL(idJaminan),
    ambilRiwayatTahapan(idJaminan),
    ambilTinjauan(idJaminan),
  ]);

  if (!detail) notFound();

  const umurHari = hitungUmurHari(detail.tglGl);
  const stagnasi = hitungStagnasi(riwayat, detail.tglGl);
  const diabaikanAktif = catatanTinjauan.find((c) => c.diabaikan) ?? null;

  return (
    <AppShell
      asalHref={dariPeringatan ? "/peringatan" : undefined}
      breadcrumbAkhir={detail.namaKorban}
    >
      <div className="flex flex-col gap-6 p-8">
        <Link
          href={dariPeringatan ? "/peringatan" : "/"}
          className="text-sm text-muted-foreground"
        >
          ← Kembali ke {dariPeringatan ? "Papan Peringatan" : "daftar GL"}
        </Link>

        {diabaikanAktif && (
          <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-status-info-bg p-4 text-sm">
            <p className="font-medium text-foreground">
              Status Pembayaran ditandai Paid secara manual lewat Tinjauan Petugas, bukan dari
              berkas impor.
            </p>
            <p className="text-muted-foreground">
              Alasan: {diabaikanAktif.alasanAbaikan ?? diabaikanAktif.catatan} — oleh{" "}
              {diabaikanAktif.namaPengguna}, {formatWaktu(diabaikanAktif.ditinjauPada)}
            </p>
          </div>
        )}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">{detail.namaKorban}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Umur GL:{" "}
                <span className="font-mono font-semibold text-foreground">{umurHari} hari</span>
              </span>
              <span>
                Stagnasi:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {stagnasi.hariDiTahapan} hari
                </span>{" "}
                di tahapan ini
                {stagnasi.berdasarkanUmur && (
                  <Badge
                    tone="neutral"
                    className="ml-1.5"
                    title="Riwayat tahapan belum menangkap kapan GL ini masuk tahapan saat ini, jadi dipakai umur GL sebagai perkiraan."
                  >
                    berdasarkan umur
                  </Badge>
                )}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Nomor ID Jaminan" value={detail.idJaminan} mono />
            <Field label="Nomor Surat Jaminan" value={detail.nomorSuratJaminan} mono />
            <Field label="Loket" value={detail.loket} />
            <Field label="Nama Rumah Sakit" value={detail.namaRumahSakit} />
            <Field label="Tipe Klaim" value={detail.tipeKlaim} />
            <Field label="Tipe Cidera" value={detail.tipeCidera} />
            <Field label="Status GL" value={detail.glStatus} />
            <Field label="Tahapan" value={detail.tahapan} />
            <Field label="Status Verifikasi" value={detail.statusVerifikasi} />
            <Field
              label="Status Pembayaran"
              value={
                <Badge tone={detail.statusPembayaran === "Paid" ? "solidOk" : "warn"} pill={detail.statusPembayaran === "Paid"}>
                  {detail.statusPembayaran}
                </Badge>
              }
            />
            <Field label="Tgl GL" value={formatTanggal(detail.tglGl)} mono />
            <Field label="Tgl Diajukan" value={formatTanggalOpsional(detail.tglDiajukan)} mono />
            <Field label="Tgl Verifikasi" value={formatTanggalOpsional(detail.tglVerifikasi)} mono />
            <Field label="Tgl Pembayaran" value={formatTanggalOpsional(detail.tglPembayaran)} mono />
            <Field label="Nilai Diajukan" value={formatRupiah(detail.nilaiDiajukan)} mono />
            <Field label="Nilai Disetujui" value={formatRupiah(detail.nilaiDisetujui)} mono />
            <Field label="Jumlah Pembayaran" value={formatRupiah(detail.jumlahPembayaran)} mono />
          </dl>

          <p className="text-xs text-muted-foreground">
            Data diimpor terakhir: {formatWaktu(detail.diimporPada)}
          </p>
        </Card>

        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">Riwayat Tahapan</h3>

          {riwayat.length <= 1 && (
            <p className="text-sm text-muted-foreground">
              Riwayat baru mulai tercatat sejak GL ini pertama kali diimpor ke SIGAP. Belum ada
              perubahan tahapan yang tercatat di luar keadaan saat ini.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-surface-table-header">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Dicatat pada</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Tahapan</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">
                    Status Verifikasi
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">
                    Status Pembayaran
                  </th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{formatWaktu(r.direkamPada)}</td>
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

          <Card>
            <form action={tandaiDitinjau} className="flex flex-col gap-3">
              <input type="hidden" name="idJaminan" value={detail.idJaminan} />
              <label htmlFor="catatan" className="text-sm font-medium text-foreground">
                Catatan
              </label>
              <Textarea
                id="catatan"
                name="catatan"
                required
                rows={3}
                placeholder="Catatan hasil peninjauan GL ini..."
              />
              <Checkbox name="perluTindakLanjut" label="Perlu tindak lanjut" />

              {detail.statusPembayaran !== "Paid" && (
                <div className="flex flex-col gap-1 rounded-lg border border-status-near/30 bg-status-near-bg p-3">
                  <Checkbox
                    name="tandaiSudahDibayar"
                    label="Tandai juga sebagai Sudah Dibayar (Paid)"
                  />
                  <p className="pl-6 text-xs text-muted-foreground">
                    Centang hanya jika data di pusat juga sudah benar-benar terupdate jadi Paid.
                    Status pembayaran GL ini langsung berubah di sistem. Kalau berkas impor
                    berikutnya masih menunjukkan Unpaid, status ini akan tertimpa balik.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="mt-1 h-8 w-fit rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Tandai Sudah Ditinjau
              </button>
            </form>
          </Card>

          {catatanTinjauan.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada catatan tinjauan untuk GL ini.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {catatanTinjauan.map((c) => (
                <li key={c.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {c.namaPengguna} — {formatWaktu(c.ditinjauPada)}
                    </span>
                    <span className="flex gap-2">
                      {c.diabaikan && <Badge tone="danger">Diabaikan</Badge>}
                      {c.perluTindakLanjut && <Badge tone="info">Perlu tindak lanjut</Badge>}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground">{c.catatan}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
