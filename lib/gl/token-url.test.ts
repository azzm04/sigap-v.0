import { beforeAll, describe, expect, it } from "vitest";
import { dekripsiToken, enkripsiIdJaminan } from "./token-url";

beforeAll(() => {
  process.env.AUTH_SECRET = "rahasia-uji-yang-cukup-panjang";
});

describe("token-url", () => {
  it("bisa dienkripsi lalu didekripsi balik menjadi idJaminan semula", () => {
    const idJaminan = "04062026001925.0826.mSh7";
    const token = enkripsiIdJaminan(idJaminan);
    expect(token).not.toBe(idJaminan);
    expect(dekripsiToken(token)).toBe(idJaminan);
  });

  it("deterministik -- idJaminan yang sama selalu menghasilkan token yang sama", () => {
    const idJaminan = "0081660400601.XQHMQW2012602";
    const token1 = enkripsiIdJaminan(idJaminan);
    const token2 = enkripsiIdJaminan(idJaminan);
    expect(token1).toBe(token2);
  });

  it("idJaminan berbeda menghasilkan token berbeda", () => {
    const token1 = enkripsiIdJaminan("id-satu");
    const token2 = enkripsiIdJaminan("id-dua");
    expect(token1).not.toBe(token2);
  });

  it("token acak/tidak valid didekripsi jadi null, bukan melempar error", () => {
    expect(dekripsiToken("bukan-token-yang-valid")).toBeNull();
    expect(dekripsiToken("")).toBeNull();
    expect(dekripsiToken("QQ==")).toBeNull();
  });

  it("token yang diutak-atik satu karakter tetap gagal didekripsi dengan aman", () => {
    const token = enkripsiIdJaminan("04062026001925.0826.mSh7");
    const rusak = token.slice(0, -1) + (token.at(-1) === "A" ? "B" : "A");
    expect(dekripsiToken(rusak)).toBeNull();
  });

  it("token URL-safe (tidak mengandung karakter yang perlu di-encode di URL)", () => {
    const token = enkripsiIdJaminan("04062026001925.0826.mSh7 dengan spasi & simbol?");
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
