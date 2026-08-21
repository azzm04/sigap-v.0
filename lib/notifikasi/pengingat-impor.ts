// Tahap 2 (CLAUDE.md bagian 6): "pengingat impor". Logika keputusan dipisah
// jadi fungsi murni supaya bisa diuji tanpa SMTP sungguhan.

export function apakahPerluMengingatkan(
  diimporTerakhir: Date | null,
  ambangHari: number,
  sekarang: Date = new Date(),
): boolean {
  if (!diimporTerakhir) return true;

  const hariSejakImpor = Math.floor(
    (Date.UTC(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate()) -
      Date.UTC(
        diimporTerakhir.getFullYear(),
        diimporTerakhir.getMonth(),
        diimporTerakhir.getDate(),
      )) /
      (1000 * 60 * 60 * 24),
  );

  return hariSejakImpor >= ambangHari;
}
