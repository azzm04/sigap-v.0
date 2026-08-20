import { FormLogin } from "./login-form";

export default async function HalamanLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-muted/50 via-background to-background px-4">
      <FormLogin pesanGalat={error ? "Username atau kata sandi salah." : undefined} />
    </div>
  );
}
