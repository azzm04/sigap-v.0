import {
  BarChart3,
  Database,
  LayoutDashboard,
  Send,
  Settings,
  Share2,
  TriangleAlert,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Monitoring", icon: LayoutDashboard, aktifJuga: ["/gl"] },
  { href: "/peringatan", label: "Laporan Peringatan", icon: TriangleAlert, aktifJuga: [] as string[] },
  // Ditaruh SEBELUM Proses Pusat karena urutan menunya mengikuti alur
  // kerja: berkas dilimpahkan dulu ke loket yang berwenang, baru diajukan
  // ke pusat (lib/gl/pelimpahan.ts).
  { href: "/pelimpahan", label: "Pelimpahan", icon: Share2, aktifJuga: [] as string[] },
  { href: "/proses-pusat", label: "Proses Pusat", icon: Send, aktifJuga: [] as string[] },
  { href: "/sebaran", label: "Sebaran Rumah Sakit", icon: BarChart3, aktifJuga: [] as string[] },
  { href: "/kelola-data", label: "Kelola Data", icon: Database, aktifJuga: [] as string[] },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, aktifJuga: [] as string[] },
];

export function apakahNavAktif(
  pathname: string,
  item: (typeof NAV_ITEMS)[number],
  asalHref?: string,
): boolean {
  if (asalHref) return item.href === asalHref;
  return (
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href)) ||
    item.aktifJuga.some((p) => pathname.startsWith(p))
  );
}

// ini buat label breadcrumb dinamis di topbar
export function labelHalamanAktif(pathname: string, asalHref?: string): string {
  return NAV_ITEMS.find((item) => apakahNavAktif(pathname, item, asalHref))?.label ?? "Monitoring";
}
