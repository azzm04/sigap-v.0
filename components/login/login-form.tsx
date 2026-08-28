"use client";

import { useActionState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { masuk, type StatusLogin } from "@/app/login/actions";

export function FormLogin() {
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const [state, formAction, pending] = useActionState<
    StatusLogin | undefined,
    FormData
  >(masuk, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
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
            aria-label={
              tampilkanSandi
                ? "Sembunyikan kata sandi"
                : "Tampilkan kata sandi"
            }
          >
            {tampilkanSandi ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <label
        htmlFor="ingatSaya"
        className="flex w-fit cursor-pointer items-center gap-2.5"
      >
        <input
          type="checkbox"
          id="ingatSaya"
          name="ingatSaya"
          className="size-4 rounded border-input accent-primary"
        />
        <span className="text-sm text-muted-foreground select-none">
          Ingat Saya
        </span>
      </label>

      {state?.galat && (
        <p role="alert" className="text-sm text-destructive">
          {state.galat}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="mt-2 w-full gap-2 rounded-full"
      >
        {pending ? (
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
