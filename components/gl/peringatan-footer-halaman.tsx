import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { Pagination } from "@/components/ui/pagination";

// Footer pagination (ukuran halaman + lompat + tombol halaman) -- bentuknya
// sama persis di ketiga tab Papan Peringatan (Daftar GL, Task Force,
// Catatan), cuma beda basePath/filterAktif/buatUrl per tab.
export function PeringatanFooterHalaman({
  ukuran,
  total,
  halaman,
  totalHalaman,
  filterAktif,
  labelSatuan,
  buatUrl,
}: {
  ukuran: number;
  total: number;
  halaman: number;
  totalHalaman: number;
  filterAktif: Record<string, string | undefined>;
  labelSatuan?: string;
  buatUrl: (halaman: number) => string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <PilihanUkuranHalaman
        ukuran={ukuran}
        total={total}
        basePath="/peringatan"
        filterAktif={filterAktif}
        labelSatuan={labelSatuan}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <LompatHalaman
          halamanAktif={halaman}
          totalHalaman={totalHalaman}
          ukuran={ukuran}
          basePath="/peringatan"
          filterAktif={filterAktif}
        />
        <div className="flex justify-center sm:contents">
          <Pagination halamanAktif={halaman} totalHalaman={totalHalaman} buatUrl={buatUrl} />
        </div>
      </div>
    </div>
  );
}
