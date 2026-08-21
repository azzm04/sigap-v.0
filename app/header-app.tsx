import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function HeaderApp() {
  const session = await auth();

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-foreground">SIGAP</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Daftar GL
          </Link>
          <Link href="/peringatan" className="text-muted-foreground hover:text-foreground">
            Papan Peringatan
          </Link>
          <Link href="/sebaran" className="text-muted-foreground hover:text-foreground">
            Sebaran
          </Link>
          <Link href="/log-impor" className="text-muted-foreground hover:text-foreground">
            Log Impor
          </Link>
          <Link href="/pengaturan" className="text-muted-foreground hover:text-foreground">
            Pengaturan
          </Link>
        </nav>
      </div>
      {session?.user && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Masuk sebagai {session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="underline">
              Keluar
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
