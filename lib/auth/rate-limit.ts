// Rate limiter in-memory untuk login. Satu server, cukup pakai Map.
// Kunci: username (bukan IP — pengguna cuma satu, CLAUDE.md aturan keras #6).
// Batas: 5 percobaan gagal per jendela 15 menit.
// Reset setelah login berhasil atau setelah jendela lewat.

const MAKS_PERCOBAAN = 5;
const JENDELA_MS = 15 * 60 * 1000; // 15 menit

interface CatatanPercobaan {
  jumlah: number;
  percobaanPertama: number;
}

const percobaan = new Map<string, CatatanPercobaan>();

function kunciUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function cekRateLimit(username: string): {
  diblokir: boolean;
  sisaDetik: number;
} {
  const kunci = kunciUsername(username);
  const sekarang = Date.now();
  const catatan = percobaan.get(kunci);

  // Belum pernah mencoba, atau jendela sudah lewat → bersihkan dan izinkan
  if (!catatan || sekarang - catatan.percobaanPertama > JENDELA_MS) {
    percobaan.delete(kunci);
    return { diblokir: false, sisaDetik: 0 };
  }

  if (catatan.jumlah >= MAKS_PERCOBAAN) {
    const sisaMs = JENDELA_MS - (sekarang - catatan.percobaanPertama);
    return { diblokir: true, sisaDetik: Math.ceil(sisaMs / 1000) };
  }

  return { diblokir: false, sisaDetik: 0 };
}

export function catatGagal(username: string): void {
  const kunci = kunciUsername(username);
  const sekarang = Date.now();
  const catatan = percobaan.get(kunci);

  if (!catatan || sekarang - catatan.percobaanPertama > JENDELA_MS) {
    percobaan.set(kunci, { jumlah: 1, percobaanPertama: sekarang });
  } else {
    catatan.jumlah++;
  }
}

export function resetPercobaan(username: string): void {
  percobaan.delete(kunciUsername(username));
}
