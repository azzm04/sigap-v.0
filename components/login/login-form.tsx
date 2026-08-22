"use client";

import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Form ini SENGAJA memakai <form method="POST" action="..."> biasa ke
// endpoint REST bawaan Auth.js, bukan Server Action React. Server Action
// yang diikat ke signIn() di halaman ini berhenti merespons klik/Enter
// setelah percobaan pertama gagal (bug Next.js App Router yang belum
// diperbaiki, vercel/next.js#78128) — sudah dites dan dikonfirmasi lewat
// isolasi manual, bukan asumsi. Kirim POST langsung ke
// /api/auth/callback/credentials adalah pola klasik Auth.js yang selalu
// memicu navigasi browser sungguhan, jadi tidak kena bug ini.
export function FormLogin({ pesanGalat }: { pesanGalat?: string }) {
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((res) => res.json())
      .then((data: { csrfToken: string }) => setCsrfToken(data.csrfToken))
      .catch(() => setCsrfToken(null));
  }, []);

  return (
    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card float className="gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-mono text-lg font-extrabold text-primary-foreground">
            S
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-primary">SIGAP</h1>
            <p className="text-sm text-muted-foreground">
              Masuk untuk memantau surat jaminan
            </p>
          </div>
        </div>

        <form
          method="POST"
          action="/api/auth/callback/credentials"
          onSubmit={() => setMengirim(true)}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
          <input type="hidden" name="callbackUrl" value="/" />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoFocus
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Kata Sandi</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={tampilkanSandi ? "text" : "password"}
                required
                autoComplete="current-password"
                className="pr-9 pl-9"
              />
              <button
                type="button"
                onClick={() => setTampilkanSandi((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={tampilkanSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {tampilkanSandi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {pesanGalat && (
            <p role="alert" className="text-sm text-destructive">
              {pesanGalat}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={mengirim || !csrfToken}
            className="mt-2 w-full gap-2"
          >
            {mengirim ? (
              "Memeriksa..."
            ) : (
              <>
                Masuk
                <LogIn className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
