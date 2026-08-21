"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SebaranLoket, SebaranRumahSakit } from "@/lib/gl/sebaran";

const WARNA_BATANG = "#2563eb";
const TINGGI_PER_BARIS = 32;
const TINGGI_MINIMUM = 200;

function GrafikBatangHorizontal<T extends { jumlah: number }>({
  data,
  dataKeyNama,
}: {
  data: T[];
  dataKeyNama: keyof T & string;
}) {
  const tinggi = Math.max(TINGGI_MINIMUM, data.length * TINGGI_PER_BARIS);

  return (
    <ResponsiveContainer width="100%" height={tinggi}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} fontSize={12} />
        <YAxis type="category" dataKey={dataKeyNama} width={170} fontSize={11} />
        <Tooltip />
        <Bar dataKey="jumlah" fill={WARNA_BATANG} radius={3} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GrafikSebaranLoket({ data }: { data: SebaranLoket[] }) {
  return <GrafikBatangHorizontal data={data} dataKeyNama="loket" />;
}

export function GrafikSebaranRumahSakit({ data }: { data: SebaranRumahSakit[] }) {
  return <GrafikBatangHorizontal data={data} dataKeyNama="namaRumahSakit" />;
}
