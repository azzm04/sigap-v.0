"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { Card } from "@/components/ui/card";
import type { SebaranStatusPembayaran, SebaranTahapan, TrenBulanan } from "@/lib/gl/ringkasan";

const WARNA_STATUS: Record<string, string> = {
  Paid: "var(--chart-paid)",
  Unpaid: "var(--chart-unpaid)",
};
const WARNA_NETRAL = "var(--muted-foreground)";
const WARNA_BATANG = "var(--chart-bar)";
const LABEL_STATUS: Record<string, string> = {
  Paid: "Sudah Bayar",
  Unpaid: "Belum Bayar",
};

function TooltipTema({
  active,
  payload,
  label,
  formatterNilai,
}: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
  label?: string;
  formatterNilai?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const nilai = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-0.5 font-medium text-foreground">{label}</p>}
      <p className="font-mono text-muted-foreground">
        {formatterNilai ? formatterNilai(nilai) : nilai.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function skalaSumbu(maks: number): number[] {
  const kelipatan = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
  const langkah = kelipatan.find((k) => k * 4 >= maks) ?? Math.ceil(maks / 4 / 1000) * 1000;
  return [0, langkah, langkah * 2, langkah * 3, langkah * 4];
}

const BATAS_TAHAPAN_DASHBOARD = 5;

export function GrafikSebaranTahapan({ data }: { data: SebaranTahapan[] }) {
  const ditampilkan = data.slice(0, BATAS_TAHAPAN_DASHBOARD);
  const maks = ditampilkan.reduce((m, d) => Math.max(m, d.jumlah), 0) || 1;

  return (
    <Card
      title={<span className="text-base md:text-lg">Sebaran per Tahapan</span>}
      actions={
        data.length > BATAS_TAHAPAN_DASHBOARD ? (
          <Link
            href="/tahapan"
            className="flex shrink-0 items-center gap-1 text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Lihat Semua
            <ArrowRight className="size-3.5" />
          </Link>
        ) : undefined
      }
      className="rounded-xl p-6"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {ditampilkan.map((d) => (
          <div key={d.tahapan} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="truncate font-mono text-sm text-muted-foreground"
                title={d.tahapan}
              >
                {d.tahapan}
              </span>
              <span className="shrink-0 font-mono text-xs font-bold text-foreground">
                {d.jumlah.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-bar transition-all"
                style={{ width: `${Math.max(4, (d.jumlah / maks) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Daftar lengkap (semua tahapan) untuk halaman /tahapan -- gaya bar penuh
export function DaftarSebaranTahapan({ data }: { data: SebaranTahapan[] }) {
  const maks = data.reduce((m, d) => Math.max(m, d.jumlah), 0) || 1;
  const sumbu = skalaSumbu(maks);

  return (
    <Card className="rounded-xl p-6">
      <div className="flex flex-col justify-center gap-6 py-2">
        {data.map((d, i) => (
          <div
            key={d.tahapan}
            className="group -mx-2 flex flex-col gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm md:text-base text-muted-foreground transition-colors group-hover:text-foreground">
                {d.tahapan}
              </span>
              <span className="font-mono text-xs md:text-sm font-bold text-foreground">
                {d.jumlah.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left rounded-full bg-chart-bar transition-all duration-300 ease-out group-hover:scale-y-125 group-hover:brightness-110 group-hover:shadow-[0_0_10px_var(--chart-bar)]"
                style={{
                  width: `${Math.max(2, (d.jumlah / sumbu[sumbu.length - 1]) * 100)}%`,
                  opacity: i === 0 ? 1 : 0.6,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t border-border pt-2">
        {sumbu.map((s) => (
          <span key={s} className="font-mono text-[10px] md:text-xs text-muted-foreground/70">
            {s.toLocaleString("id-ID")}
          </span>
        ))}
      </div>
    </Card>
  );
}

// Sektor donut yang sedang di-hover membesar keluar
function sektorAktif(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={(outerRadius as number) + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

export function GrafikStatusPembayaran({ data }: { data: SebaranStatusPembayaran[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.jumlah, 0);
  const totalRingkas = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);
  const hover = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <Card title={<span className="text-base md:text-lg">Status Pembayaran</span>} className="rounded-xl p-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative flex size-50 items-center justify-center md:size-55">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="jumlah"
                nameKey="statusPembayaran"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="92%"
                strokeWidth={0}
                activeIndex={hoverIdx ?? undefined}
                activeShape={sektorAktif}
                onMouseEnter={(_, index) => setHoverIdx(index)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {data.map((entri) => (
                  <Cell
                    key={entri.statusPembayaran}
                    fill={WARNA_STATUS[entri.statusPembayaran] ?? WARNA_NETRAL}
                    className="cursor-pointer transition-opacity"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-all">
            <span className="text-xs md:text-sm text-muted-foreground">{hover ? LABEL_STATUS[hover.statusPembayaran] : "Total"}</span>
            <span className="font-mono text-base md:text-lg font-bold text-foreground">
              {hover ? hover.jumlah.toLocaleString("id-ID") : totalRingkas}
            </span>
          </div>
        </div>
        <div className="flex gap-6">
          {data.map((entri, i) => (
            <div
              key={entri.statusPembayaran}
              className="flex cursor-pointer items-center gap-2 transition-opacity"
              style={{ opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.4 }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <span
                className="size-3 rounded-full"
                style={{ background: WARNA_STATUS[entri.statusPembayaran] ?? WARNA_NETRAL }}
              />
              <span className="font-mono text-xs md:text-sm text-muted-foreground">
                {LABEL_STATUS[entri.statusPembayaran] ?? entri.statusPembayaran}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function GrafikTrenBulanan({ data }: { data: TrenBulanan[] }) {
  return (
    <Card title={<span className="text-base md:text-lg">Tren GL per Bulan (Tgl GL)</span>} className="rounded-xl p-6">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="bulan"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            stroke="var(--muted-foreground)"
            padding={{ left: 0, right: 0 }}
          />
          <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<TooltipTema formatterNilai={(v) => `${v.toLocaleString("id-ID")} GL`} />}
            contentStyle={{ border: "1px solid var(--border)", backgroundColor: "var(--popover)" }}
          />
          <Bar
            dataKey="jumlah"
            fill={WARNA_BATANG}
            radius={[6, 6, 0, 0]}
            activeBar={{ fill: "var(--primary)" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
