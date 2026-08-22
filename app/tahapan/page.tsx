import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DaftarSebaranTahapan } from "@/components/gl/grafik";
import { PageHeader } from "@/components/ui/page-header";
import { ambilSebaranTahapan } from "@/lib/gl/ringkasan";

export default async function DetailSebaranTahapanPage() {
  const data = await ambilSebaranTahapan();

  return (
    <AppShell asalHref="/" breadcrumbAkhir="Detail Sebaran per Tahapan">
      <div className="flex flex-col gap-6 p-8">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Monitoring
        </Link>

        <PageHeader
          title="Detail Sebaran per Tahapan"
          description="Seluruh tahapan GL aktif, diurutkan dari jumlah terbanyak."
        />

        <DaftarSebaranTahapan data={data} />
      </div>
    </AppShell>
  );
}
