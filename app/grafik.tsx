"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SebaranStatusPembayaran, SebaranTahapan, TrenBulanan } from "@/lib/gl/ringkasan";

const WARNA_STATUS: Record<string, string> = {
  Paid: "#16a34a",
  Unpaid: "#f59e0b",
};
const WARNA_NETRAL = "#71717a";
const WARNA_BATANG = "#2563eb";

export function GrafikSebaranTahapan({ data }: { data: SebaranTahapan[] }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Sebaran per Tahapan</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis type="category" dataKey="tahapan" width={170} fontSize={11} />
          <Tooltip />
          <Bar dataKey="jumlah" fill={WARNA_BATANG} radius={3} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrafikStatusPembayaran({ data }: { data: SebaranStatusPembayaran[] }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Status Pembayaran</h3>
      <ResponsiveContainer width="100%" height={280} minWidth={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="jumlah"
            nameKey="statusPembayaran"
            cx="50%"
            cy="50%"
            outerRadius="75%"
          >
            {data.map((entri) => (
              <Cell
                key={entri.statusPembayaran}
                fill={WARNA_STATUS[entri.statusPembayaran] ?? WARNA_NETRAL}
              />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrafikTrenBulanan({ data }: { data: TrenBulanan[] }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Tren GL per Bulan (Tgl GL)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bulan" fontSize={11} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Bar dataKey="jumlah" fill={WARNA_BATANG} radius={3} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
