"use client";

import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form
      method="POST"
      action="/api/auth/callback/credentials"
      onSubmit={() => setMengirim(true)}
      className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
      <input type="hidden" name="callbackUrl" value="/" />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            autoFocus
            placeholder="Masukkan username"
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Kata Sandi</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={tampilkanSandi ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            className="pr-10 pl-10"
          />
          <button
            type="button"
            onClick={() => setTampilkanSandi((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={tampilkanSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {tampilkanSandi ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
        className="mt-2 w-full gap-2 rounded-full"
      >
        {mengirim ? (
          "Memeriksa..."
        ) : (
          <>
            Masuk
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
