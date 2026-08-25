import Image from "next/image";
import { FormLogin } from "@/components/login/login-form";

export default async function HalamanLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen w-full">
      <div className="relative hidden w-5/12 flex-col justify-between overflow-hidden bg-login-panel p-12 text-login-panel-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-accent-bright/20 blur-[100px]"
        />

        <div className="relative z-10 m-auto flex max-w-md flex-col gap-6">
          <div className="flex items-center gap-5">
            <div className="flex size-26 shrink-0 items-center justify-center overflow-hidden">
              <Image
                src="/logojr.png"
                alt="Logo SIGAP"
                width={128}
                height={128}
                className="object-contain"
              />
            </div>

            {/* Wadah Teks */}
            <div className="flex flex-col justify-center">
              <h1 className="font-mono text-4xl font-extrabold tracking-tight">
                SIGAP
              </h1>
              <p className="mt-1 text-sm font-medium text-login-panel-muted">
                Sistem Pemantauan GL
              </p>
            </div>
          </div>

          <p className="mt-2 text-lg leading-relaxed text-login-panel-muted">
            Memantau surat jaminan (Guarantee Letter) korban kecelakaan lalu
            lintas — Jasa Raharja Cabang Semarang.
          </p>
        </div>

        <p className="relative z-10 text-xs text-login-panel-muted">
          © 2026 SIGAP All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:w-7/12">
        <div className="w-full max-w-sm">
          {/* Judul Form */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Selamat Datang Kembali
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Masuk untuk memantau surat jaminan
            </p>
          </div>

          {/* Form Komponen */}
          <FormLogin
            pesanGalat={error ? "Username atau kata sandi salah." : undefined}
          />

          {/* Footer Mobile */}
          <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
            © 2026 SIGAP All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
