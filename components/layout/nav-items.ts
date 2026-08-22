import { BarChart3, Database, LayoutDashboard, Settings, TriangleAlert } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Monitoring", icon: LayoutDashboard, aktifJuga: ["/gl"] },
  { href: "/peringatan", label: "Peringatan", icon: TriangleAlert, aktifJuga: [] as string[] },
  { href: "/sebaran", label: "Sebaran", icon: BarChart3, aktifJuga: [] as string[] },
  { href: "/kelola-data", label: "Kelola Data", icon: Database, aktifJuga: [] as string[] },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, aktifJuga: [] as string[] },
];

// asalHref dipakai untuk halaman yang bisa dibuka dari beberapa konteks
// berbeda (mis. Detail GL dari Papan Peringatan vs dari Daftar GL) — kalau
// diisi, item nav yang cocok dengan asalHref itulah yang disorot, bukan
// hasil pencocokan pathname biasa.
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

// Dipakai untuk label breadcrumb dinamis di topbar — mengikuti logika
// penyorotan yang sama dengan sidebar supaya keduanya tidak pernah berbeda.
export function labelHalamanAktif(pathname: string, asalHref?: string): string {
  return NAV_ITEMS.find((item) => apakahNavAktif(pathname, item, asalHref))?.label ?? "Monitoring";
}
