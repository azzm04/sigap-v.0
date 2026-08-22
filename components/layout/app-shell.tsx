import { signOut } from "@/auth";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";
import { tanggalHariIniWIB } from "@/lib/format";
import { ambilNotifikasiDilihatPada, tandaiNotifikasiDilihatHariIni } from "@/lib/pengaturan";
import { ambilTema } from "@/lib/tema";
import { HamburgerButton } from "./hamburger-button";
import { NotifikasiButton } from "./notifikasi-button";
import { PageTitle } from "./page-title";
import { SidebarApp } from "./sidebar-app";
import { SidebarProvider } from "./sidebar-context";
import { ThemeToggle } from "./theme-toggle";

export async function AppShell({
  children,
  asalHref,
  breadcrumbAkhir,
}: {
  children: React.ReactNode;
  /** Halaman asal kalau route ini bisa dibuka dari beberapa konteks (mis. Detail GL dari Papan Peringatan) */
  asalHref?: string;
  /** Segmen breadcrumb tambahan di akhir, mis. nama korban pada halaman detail */
  breadcrumbAkhir?: string;
}) {
  const [tema, peringatan, dilihatPada] = await Promise.all([
    ambilTema(),
    ambilPapanPeringatan({ ukuran: 5 }),
    ambilNotifikasiDilihatPada(),
  ]);
  const sudahDilihatHariIni = dilihatPada === tanggalHariIniWIB();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  async function tandaiDilihatAction() {
    "use server";
    await tandaiNotifikasiDilihatHariIni();
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Glow dekoratif khusus mode gelap ("Lumina") — ungu di kiri atas,
            hijau di kanan bawah. Fixed + blur, tidak menghalangi interaksi. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -top-40 -left-40 z-0 hidden h-144 w-xl rounded-full bg-[radial-gradient(circle,rgba(114,18,255,0.45)_0%,transparent_70%)] blur-[90px] dark:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -right-40 -bottom-40 z-0 hidden h-128 w-lg rounded-full bg-[radial-gradient(circle,rgba(0,169,98,0.35)_0%,transparent_70%)] blur-[90px] dark:block"
        />
        <SidebarApp signOutAction={signOutAction} asalHref={asalHref} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <HamburgerButton />
              <PageTitle asalHref={asalHref} akhir={breadcrumbAkhir} />
            </div>
            <div className="flex items-center gap-1">
              <NotifikasiButton
                items={peringatan.baris}
                total={peringatan.total}
                sudahDilihatHariIni={sudahDilihatHariIni}
                tandaiDilihatAction={tandaiDilihatAction}
              />
              <ThemeToggle tema={tema} />
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
