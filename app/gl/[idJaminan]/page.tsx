import { ChevronsLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { AksiCatatan } from "@/components/gl/aksi-catatan";
import { Select } from "@/components/ui/select";
import { ambilDetailGL, ambilRiwayatTahapan } from "@/lib/gl/detail";
import { hitungStagnasi } from "@/lib/gl/stagnasi";
import {
  ambilPilihanTahapProses,
  ambilRiwayatTahapProses,
} from "@/lib/gl/tahap-proses";
import { ambilTinjauan } from "@/lib/gl/tinjauan";
import { dekripsiToken } from "@/lib/gl/token-url";
import {
  formatRupiah,
  formatTanggal,
  formatWaktu,
  hitungUmurHari,
} from "@/lib/format";
import { catatTahapProses, tandaiDitinjau } from "./actions";

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
  // Segmen route [idJaminan] sekarang berisi token terenkripsi, bukan
  // Nomor ID Jaminan asli -- lihat lib/gl/token-url.ts. Token yang rusak
  // atau dipalsukan (mis. hasil tebak-tebakan) gagal didekripsi dan
  // langsung 404, tanpa pernah menyentuh database.
  const { idJaminan: tokenMentah } = await params;
  const idJaminan = dekripsiToken(decodeURIComponent(tokenMentah));
  if (!idJaminan) notFound();

  const { dari } = await searchParams;
  const dariPeringatan = dari === "peringatan";

  const [detail, riwayat, catatanTinjauan, pilihanTahapProses, riwayatTahapProses] =
    await Promise.all([
      ambilDetailGL(idJaminan),
      ambilRiwayatTahapan(idJaminan),
      ambilTinjauan(idJaminan),
      ambilPilihanTahapProses(),
      ambilRiwayatTahapProses(idJaminan),
    ]);

  if (!detail) notFound();

  const umurHari = hitungUmurHari(detail.tglGl);
  const stagnasi = hitungStagnasi(riwayat, detail.tglGl);
  const diabaikanAktif = catatanTinjauan.find((c) => c.diabaikan) ?? null;
  const tahapTerkini = riwayatTahapProses[0] ?? null;

  return (
    <AppShell
      asalHref={dariPeringatan ? "/peringatan" : undefined}
      breadcrumbAkhir={detail.namaKorban}
    >
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
        <Link
          href={dariPeringatan ? "/peringatan" : "/"}
          className="flex w-fit items-center gap-1 text-xs leading-relaxed text-muted-foreground hover:text-foreground sm:text-sm"
        >
          <ChevronsLeft className="size-4 shrink-0" />
          Kembali ke {dariPeringatan ? "Papan Peringatan" : "daftar GL"}
        </Link>

        {diabaikanAktif && (
          <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-primary/30 bg-status-info-bg p-3 text-xs leading-relaxed sm:p-4 sm:text-sm">
            <p className="font-medium break-words text-foreground">
              Status Pembayaran ditandai Paid secara manual lewat Tahap
              Proses di Sistem Pusat, bukan dari berkas impor.
            </p>
            <p className="break-words text-muted-foreground">
              Alasan: {diabaikanAktif.alasanAbaikan ?? diabaikanAktif.catatan} —
              oleh {diabaikanAktif.namaPengguna},{" "}
              {formatWaktu(diabaikanAktif.ditinjauPada)}
            </p>
          </div>
        )}

        <Card className="min-w-0">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="min-w-0 break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
              {detail.namaKorban}
            </h2>
            <div className="flex min-w-0 flex-col gap-2 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <span className="whitespace-nowrap">
                Umur GL:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {umurHari} hari
                </span>
              </span>
              <span className="break-words">
                Stagnasi:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {stagnasi.hariDiTahapan} hari
                </span>{" "}
                di tahapan ini
                {stagnasi.berdasarkanUmur && (
                  <Badge
                    tone="neutral"
                    className="ml-1.5 mt-1 inline-block sm:mt-0"
                    title="Riwayat tahapan belum menangkap kapan GL ini masuk tahapan saat ini, jadi dipakai umur GL sebagai perkiraan."
                  >
                    berdasarkan umur
                  </Badge>
                )}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field label="Nomor ID Jaminan" value={detail.idJaminan} mono />
            <Field
              label="Nomor Surat Jaminan"
              value={detail.nomorSuratJaminan}
              mono
            />
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
                <Badge
                  tone={detail.statusPembayaran === "Paid" ? "solidOk" : "warn"}
                  pill={detail.statusPembayaran === "Paid"}
                >
                  {detail.statusPembayaran}
                </Badge>
              }
            />
            <Field label="Tgl GL" value={formatTanggal(detail.tglGl)} mono />
            <Field
              label="Tgl Diajukan"
              value={formatTanggalOpsional(detail.tglDiajukan)}
              mono
            />
            <Field
              label="Tgl Verifikasi"
              value={formatTanggalOpsional(detail.tglVerifikasi)}
              mono
            />
            <Field
              label="Tgl LAKA (DASI)"
              value={formatTanggalOpsional(detail.tglKejadian)}
              mono
            />
            <Field
              label="Lokasi (DASI)"
              value={detail.lokasi ?? "-"}
            />
            <Field
              label="Tgl Pembayaran"
              value={formatTanggalOpsional(detail.tglPembayaran)}
              mono
            />
            <Field
              label="Nilai Diajukan"
              value={formatRupiah(detail.nilaiDiajukan)}
              mono
            />
            <Field
              label="Nilai Disetujui"
              value={formatRupiah(detail.nilaiDisetujui)}
              mono
            />
            <Field
              label="Jumlah Pembayaran"
              value={formatRupiah(detail.jumlahPembayaran)}
              mono
            />
          </dl>

          <p className="text-xs text-muted-foreground mt-4">
            Data diimpor terakhir: {formatWaktu(detail.diimporPada)}
          </p>
        </Card>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm md:text-base  font-semibold text-foreground sm:text-base">
            Riwayat Tahapan
          </h3>

          {riwayat.length <= 1 && (
            <p className="text-sm md:text-base leading-relaxed text-muted-foreground sm:text-sm">
              Riwayat baru mulai tercatat sejak GL ini pertama kali diimpor ke
              SIGAP. Belum ada perubahan tahapan yang tercatat di luar keadaan
              saat ini.
            </p>
          )}

          <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-[720px] w-full text-xs sm:text-sm">
              <thead className="bg-surface-table-header">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                    Dicatat pada
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                    Tahapan
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                    Status Verifikasi
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                    Status Pembayaran
                  </th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-xs md:text-sm">
                      {formatWaktu(r.direkamPada)}
                    </td>
                    <td className="px-3 py-2 whitespace-normal wrap-break-words text-xs md:text-sm">
                      {r.tahapan}
                    </td>
                    <td className="px-3 py-2 whitespace-normal wrap-break-words text-xs md:text-sm">
                      {r.statusVerifikasi ?? "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      {r.statusPembayaran}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm md:text-base font-semibold text-foreground sm:text-base">
            Tahap Proses di Sistem Pusat
          </h3>
          <p className="text-sm md:text-base leading-relaxed text-muted-foreground">
            Diisi manual oleh petugas berdasarkan pengecekan langsung di
            sistem pusat, karena SIGAP tidak terhubung ke sistem pusat.
            Tahap boleh dipilih bebas sesuai kondisi terkini. Begitu tahap
            &quot;Berkas Selesai&quot; dicatat, Status Pembayaran otomatis
            menjadi Paid.
          </p>

          <Card className="min-w-0">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm md:text-base font-medium text-muted-foreground">
                Tahap terkini
              </span>
              {tahapTerkini ? (
                <span className="text-sm md:text-base font-semibold text-foreground">
                  {tahapTerkini.tahap}{" "}
                  <span className="font-normal text-muted-foreground">
                    — dicatat {formatWaktu(tahapTerkini.dicatatPada)} oleh{" "}
                    {tahapTerkini.namaPengguna}
                  </span>
                </span>
              ) : (
                <span className="text-sm md:text-base text-muted-foreground">
                  Belum pernah dicatat.
                </span>
              )}
            </div>

            <form
              action={catatTahapProses}
              className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="idJaminan" value={detail.idJaminan} />
              <div className="flex flex-1 flex-col gap-1.5">
                <label
                  htmlFor="tahap"
                  className="text-xs md:text-sm font-medium text-foreground"
                >
                  Tahap
                </label>
                <Select
                  id="tahap"
                  name="tahap"
                  required
                  placeholder="Pilih tahap..."
                  options={pilihanTahapProses}
                  className="w-full"
                  defaultValue=""
                />
              </div>
              <button
                type="submit"
                className="h-8 w-fit shrink-0 rounded-lg bg-primary px-4 text-sm md:text-base font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Catat Tahap Ini
              </button>
            </form>
          </Card>

          {riwayatTahapProses.length > 0 && (
            <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
              <table className="min-w-[560px] w-full text-xs sm:text-sm">
                <thead className="bg-surface-table-header">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                      Dicatat pada
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                      Tahap
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                      Petugas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatTahapProses.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-xs md:text-sm">
                        {formatWaktu(r.dicatatPada)}
                      </td>
                      <td className="px-3 py-2 whitespace-normal wrap-break-words text-xs md:text-sm">
                        {r.tahap}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                        {r.namaPengguna}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground md:text-base">
            Tinjauan Petugas
          </h3>

          <Card className="min-w-0">
            <form
              action={tandaiDitinjau}
              className="flex min-w-0 flex-col gap-3"
            >
              <input type="hidden" name="idJaminan" value={detail.idJaminan} />
              <label
                htmlFor="catatan"
                className="text-sm md:text-base font-medium text-foreground"
              >
                Catatan
              </label>
              <Textarea
                id="catatan"
                name="catatan"
                required
                rows={3}
                className="min-w-0 text-sm md:text-base leading-relaxed"
                placeholder="Catatan hasil peninjauan GL ini..."
              />
              <Checkbox name="perluTindakLanjut" label="Perlu tindak lanjut" />

              <button
                type="submit"
                className="mt-1 h-8 w-fit rounded-lg bg-primary px-4 text-sm md:text-base font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Tandai Sudah Ditinjau
              </button>
            </form>
          </Card>

          {catatanTinjauan.length === 0 ? (
            <p className="text-sm md:text-base text-muted-foreground">
              Belum ada catatan tinjauan untuk GL ini.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {catatanTinjauan.length === 0 ? (
                <p className="text-sm md:text-base text-muted-foreground">
                  Belum ada catatan tinjauan untuk GL ini.
                </p>
              ) : (
                <div className="w-full overflow-x-auto rounded-lg border border-border bg-card mt-2">
                  <table className="min-w-[720px] w-full text-xs sm:text-sm">
                    <thead className="bg-surface-table-header">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-1/6">
                          Petugas
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-1/6">
                          Waktu
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-1/6">
                          Label / Status
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-3/6">
                          Catatan
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {catatanTinjauan.map((c) => (
                        <tr
                          key={c.id}
                          className="border-t border-border align-top hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap text-xs md:text-sm">
                            {c.namaPengguna}
                          </td>
                          <td className="px-3 py-3 font-mono text-muted-foreground whitespace-nowrap text-xs md:text-sm">
                            {formatWaktu(c.ditinjauPada)}
                          </td>
                          <td className="px-3 py-3 text-xs md:text-sm">
                            <div className="flex flex-wrap gap-1.5">
                              {!c.diabaikan && !c.perluTindakLanjut && (
                                <span className="text-muted-foreground">-</span>
                              )}
                              {c.diabaikan && (
                                <Badge tone="danger">Diabaikan</Badge>
                              )}
                              {c.perluTindakLanjut && (
                                <Badge tone="info">Perlu tindak lanjut</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 min-w-[320px] max-w-[560px] whitespace-normal break-words leading-relaxed text-foreground text-xs md:text-sm">
                            {c.catatan}
                          </td>
                          <td className="px-3 py-3 text-xs md:text-sm">
                            <AksiCatatan
                              id={c.id}
                              idJaminan={detail.idJaminan}
                              catatanAwal={c.catatan}
                              perluTindakLanjutAwal={c.perluTindakLanjut}
                              diabaikan={c.diabaikan}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
