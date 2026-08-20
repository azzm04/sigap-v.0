import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KELAS_SELECT =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface NilaiFilterGL {
  cari?: string;
  loket?: string;
  tahapan?: string;
  status_pembayaran?: string;
  dari?: string;
  sampai?: string;
}

export function FilterGL({
  nilai,
  opsi,
}: {
  nilai: NilaiFilterGL;
  opsi: { loket: string[]; tahapan: string[]; statusPembayaran: string[] };
}) {
  const adaFilterAktif = Object.values(nilai).some((v) => v);

  return (
    <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cari">Cari nama korban / ID jaminan</Label>
        <Input id="cari" name="cari" defaultValue={nilai.cari ?? ""} className="w-56" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loket">Loket</Label>
        <select id="loket" name="loket" defaultValue={nilai.loket ?? ""} className={KELAS_SELECT}>
          <option value="">Semua</option>
          {opsi.loket.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tahapan">Tahapan</Label>
        <select id="tahapan" name="tahapan" defaultValue={nilai.tahapan ?? ""} className={KELAS_SELECT}>
          <option value="">Semua</option>
          {opsi.tahapan.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status_pembayaran">Status Pembayaran</Label>
        <select
          id="status_pembayaran"
          name="status_pembayaran"
          defaultValue={nilai.status_pembayaran ?? ""}
          className={KELAS_SELECT}
        >
          <option value="">Semua</option>
          {opsi.statusPembayaran.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dari">Tgl GL dari</Label>
        <Input id="dari" name="dari" type="date" defaultValue={nilai.dari ?? ""} className="w-40" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sampai">Tgl GL sampai</Label>
        <Input id="sampai" name="sampai" type="date" defaultValue={nilai.sampai ?? ""} className="w-40" />
      </div>

      <button
        type="submit"
        className="h-8 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Terapkan
      </button>

      {adaFilterAktif && (
        <Link href="/" className="text-sm text-muted-foreground underline">
          Reset filter
        </Link>
      )}
    </form>
  );
}
