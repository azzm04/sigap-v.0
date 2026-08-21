import { HeaderApp } from "@/app/header-app";
import { ambilSebaranLoket, ambilSebaranRumahSakit } from "@/lib/gl/sebaran";
import { GrafikSebaranLoket, GrafikSebaranRumahSakit } from "./grafik-sebaran";

function TabelSebaran({
  label,
  data,
}: {
  label: string;
  data: { nama: string; jumlah: number }[];
}) {
  const total = data.reduce((jumlah, d) => jumlah + d.jumlah, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{label}</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Jumlah GL</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.nama} className="border-t border-border">
              <td className="px-3 py-2">{d.nama}</td>
              <td className="px-3 py-2 text-right">{d.jumlah.toLocaleString("id-ID")}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-medium">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right">{total.toLocaleString("id-ID")}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default async function SebaranPage() {
  const [sebaranLoket, sebaranRumahSakit] = await Promise.all([
    ambilSebaranLoket(),
    ambilSebaranRumahSakit(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <HeaderApp />

      <main className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sebaran GL</h2>
          <p className="text-sm text-muted-foreground">
            Sebaran GL aktif (tipe klaim GL, status Active) per loket dan per rumah sakit,
            terurut dari yang paling banyak.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Per Loket</h3>
            <GrafikSebaranLoket data={sebaranLoket} />
            <TabelSebaran
              label="Loket"
              data={sebaranLoket.map((d) => ({ nama: d.loket, jumlah: d.jumlah }))}
            />
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Per Rumah Sakit</h3>
            <GrafikSebaranRumahSakit data={sebaranRumahSakit} />
            <TabelSebaran
              label="Rumah Sakit"
              data={sebaranRumahSakit.map((d) => ({ nama: d.namaRumahSakit, jumlah: d.jumlah }))}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
