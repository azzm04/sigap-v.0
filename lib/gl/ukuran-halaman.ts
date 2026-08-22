// Dipisah dari queries.ts (yang mengimpor koneksi database) supaya komponen
// client di components/gl/ukuran-halaman.tsx bisa memakai daftar pilihan ini tanpa
// ikut membawa dependensi database ke bundle client.
export const PILIHAN_UKURAN_HALAMAN = [5, 10, 25, 50, 100, 500] as const;
