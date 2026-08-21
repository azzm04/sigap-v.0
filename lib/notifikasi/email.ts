import nodemailer from "nodemailer";
import { formatWaktu } from "../format";

// SMTP generik: cocok dengan Gmail, layanan hosting, atau SMTP relay apa
// pun. Kredensial diisi lewat env saat deploy, bukan dipilih di kode
// (belum ada langganan layanan email tertentu saat ini).
function buatTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !password) {
    throw new Error(
      "Konfigurasi SMTP belum lengkap. Isi SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD di environment.",
    );
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass: password },
  });
}

export async function kirimEmailPengingatImpor(
  tujuan: string,
  diimporTerakhir: Date | null,
): Promise<void> {
  const transporter = buatTransporter();
  const dariAlamat = process.env.SMTP_FROM || process.env.SMTP_USER;

  const infoTerakhir = diimporTerakhir
    ? `Data terakhir diperbarui: ${formatWaktu(diimporTerakhir)}.`
    : "Belum pernah ada berkas ekspor yang diimpor sama sekali.";

  await transporter.sendMail({
    from: dariAlamat,
    to: tujuan,
    subject: "SIGAP: Pengingat unggah berkas ekspor GL",
    text: [
      "Halo,",
      "",
      `Sudah beberapa hari tidak ada berkas ekspor GL yang diunggah ke SIGAP. ${infoTerakhir}`,
      "",
      "Mohon unggah berkas ekspor terbaru dari JRCare supaya data GL tetap mutakhir dan papan peringatan akurat.",
      "",
      "— SIGAP (email otomatis, mohon tidak dibalas)",
    ].join("\n"),
  });
}
